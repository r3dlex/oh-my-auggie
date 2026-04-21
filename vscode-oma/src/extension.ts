import * as vscode from 'vscode';
import * as path from 'path';
import { OmaStateAdapter } from './state/adapter.js';
import { WorkflowTreeProvider, AgentTreeProvider, TaskTreeProvider } from './ui/tree-view.js';
import { OmaStatusBar } from './ui/status-bar.js';
import { registerMcpProvider } from './mcp/provider.js';

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  const adapter = new OmaStateAdapter(workspaceRoot);

  // Tree providers
  const workflowProvider = new WorkflowTreeProvider(adapter);
  const agentProvider = new AgentTreeProvider(adapter);
  const taskProvider = new TaskTreeProvider(adapter);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('oma.workflows', workflowProvider),
    vscode.window.registerTreeDataProvider('oma.agents', agentProvider),
    vscode.window.registerTreeDataProvider('oma.tasks', taskProvider)
  );

  // Status bar
  const statusBar = new OmaStatusBar(adapter);
  context.subscriptions.push({ dispose: () => statusBar.dispose() });

  // File watcher for .oma/**/*.json
  const omaDir = path.join(workspaceRoot, '.oma');
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(omaDir, '**/*.json')
  );

  const onStateChange = (): void => {
    workflowProvider.refresh();
    agentProvider.refresh();
    taskProvider.refresh();
    statusBar.refresh();
  };

  watcher.onDidChange(onStateChange);
  watcher.onDidCreate(onStateChange);
  watcher.onDidDelete(onStateChange);
  context.subscriptions.push(watcher);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('oma.showStatus', () => {
      const workflows = adapter.getWorkflows();
      if (workflows.length === 0) {
        vscode.window.showInformationMessage('OMA: No active workflows. Start an OMA mode to see state.');
        return;
      }
      const w = workflows[0];
      const lines = [
        `Mode: ${w.mode}`,
        `Active: ${w.active}`,
        w.iteration !== undefined ? `Iteration: ${w.iteration}` : null,
        w.task ? `Task: ${w.task}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      vscode.window.showInformationMessage(`OMA Status — ${lines}`);
    }),

    vscode.commands.registerCommand('oma.clearState', async () => {
      const answer = await vscode.window.showWarningMessage(
        'Clear OMA state? This will remove .oma/state.json.',
        { modal: true },
        'Clear'
      );
      if (answer !== 'Clear') return;
      const stateFile = path.join(workspaceRoot, '.oma', 'state.json');
      try {
        const fs = await import('fs');
        if (fs.existsSync(stateFile)) {
          fs.unlinkSync(stateFile);
          onStateChange();
          vscode.window.showInformationMessage('OMA state cleared.');
        } else {
          vscode.window.showInformationMessage('OMA state file not found.');
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to clear OMA state: ${String(err)}`);
      }
    })
  );

  // MCP provider (best-effort, only if mcp-server present)
  registerMcpProvider(context);
}

export function deactivate(): void {
  // Nothing to clean up beyond subscriptions
}
