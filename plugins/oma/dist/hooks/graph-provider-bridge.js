import { existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { spawnSync } from 'child_process';
import { getMergedConfig, readAllStdin, resolveProjectDir } from '../utils.js';
const CONTEXT_TOOLS = new Set(['Read', 'Glob', 'Grep', 'view', 'codebase-retrieval']);
export async function main() {
    try {
        const config = getMergedConfig();
        if (config.graph?.provider !== 'graphwiki') {
            process.exit(0);
            return;
        }
    }
    catch {
        process.exit(0);
        return;
    }
    const projectDir = resolveProjectDir();
    const reportPath = join(projectDir, 'graphwiki-out', 'GRAPH_REPORT.md');
    if (!existsSync(reportPath)) {
        process.exit(0);
        return;
    }
    let rawInput = '';
    if (!process.stdin.isTTY) {
        rawInput = await readAllStdin();
    }
    if (!rawInput) {
        process.exit(0);
        return;
    }
    let toolName = '';
    let filePath = '';
    try {
        const input = JSON.parse(rawInput);
        toolName = input.tool_name ?? '';
        filePath = input.tool_input?.file_path
            ?? input.tool_input?.path
            ?? input.tool_input?.pattern
            ?? '';
    }
    catch {
        process.exit(0);
        return;
    }
    if (!CONTEXT_TOOLS.has(toolName) || !filePath) {
        process.exit(0);
        return;
    }
    try {
        const nodeName = basename(filePath, extname(filePath));
        const result = spawnSync('graphwiki', ['path', nodeName, '--json'], {
            cwd: projectDir,
            encoding: 'utf8',
            timeout: 3000,
        });
        const output = (result.stdout ?? '').trim();
        if (output) {
            const context = `[GraphWiki] Context for ${nodeName}:\n${output.slice(0, 500)}`;
            console.log(JSON.stringify({
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    additionalContext: context,
                },
            }));
        }
    }
    catch {
        // silent fallback
    }
    process.exit(0);
}
main().catch(() => process.exit(0));
