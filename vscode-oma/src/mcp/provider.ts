import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function registerMcpProvider(context: vscode.ExtensionContext): void {
  const mcpServerPath = path.join(context.extensionPath, 'mcp-server', 'dist', 'index.js');
  const hasMcpServer = fs.existsSync(mcpServerPath);

  if (!hasMcpServer) return;

  // Try the dynamic registration API (VS Code 1.99+)
  const lm = vscode.lm as typeof vscode.lm & {
    registerMcpServerDefinitionProvider?: (
      id: string,
      provider: {
        provideMcpServerDefinitions(): Promise<unknown[]>;
      }
    ) => vscode.Disposable;
  };

  if (typeof lm.registerMcpServerDefinitionProvider === 'function') {
    const disposable = lm.registerMcpServerDefinitionProvider('oma-mcp', {
      async provideMcpServerDefinitions() {
        return [
          {
            id: 'oma',
            label: 'oh-my-auggie MCP',
            command: 'node',
            args: [mcpServerPath],
          },
        ];
      },
    });
    context.subscriptions.push(disposable);
    return;
  }

  // Fallback: write static .vscode/mcp.json
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const vscodeDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
  const mcpJsonPath = path.join(vscodeDir, 'mcp.json');

  try {
    if (!fs.existsSync(vscodeDir)) fs.mkdirSync(vscodeDir, { recursive: true });
    if (!fs.existsSync(mcpJsonPath)) {
      fs.writeFileSync(
        mcpJsonPath,
        JSON.stringify(
          {
            servers: {
              oma: {
                type: 'stdio',
                command: 'node',
                args: [mcpServerPath],
              },
            },
          },
          null,
          2
        ),
        'utf8'
      );
    }
  } catch {
    // Non-fatal: MCP fallback is best-effort
  }
}
