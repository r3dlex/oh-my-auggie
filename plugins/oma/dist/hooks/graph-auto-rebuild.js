import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { getMergedConfig, readAllStdin, resolveProjectDir, resolveOmaDir } from '../utils.js';
const FILE_MODIFY_TOOLS = new Set([
    'Edit', 'Write', 'str-replace-editor', 'save-file',
    'remove_files', 'remove-files',
]);
const REBUILD_COOLDOWN_MS = 30_000;
function shouldRebuild(omaDir) {
    const tsPath = join(omaDir, 'graph-rebuild-ts.json');
    try {
        const data = JSON.parse(readFileSync(tsPath, 'utf8'));
        const last = new Date(data.lastRebuild).getTime();
        return Date.now() - last > REBUILD_COOLDOWN_MS;
    }
    catch {
        return true;
    }
}
function markRebuilt(omaDir) {
    const tsPath = join(omaDir, 'graph-rebuild-ts.json');
    writeFileSync(tsPath, JSON.stringify({ lastRebuild: new Date().toISOString() }));
}
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
    const omaDir = resolveOmaDir();
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
    try {
        const input = JSON.parse(rawInput);
        toolName = input.tool_name ?? '';
    }
    catch {
        process.exit(0);
        return;
    }
    if (!FILE_MODIFY_TOOLS.has(toolName)) {
        process.exit(0);
        return;
    }
    if (!shouldRebuild(omaDir)) {
        process.exit(0);
        return;
    }
    markRebuilt(omaDir);
    try {
        const child = spawn('graphwiki', ['build', '.', '--update'], {
            cwd: projectDir,
            detached: true,
            stdio: 'ignore',
        });
        child.unref();
    }
    catch {
        // graphwiki not available. Silent.
    }
    process.exit(0);
}
main().catch(() => process.exit(0));
