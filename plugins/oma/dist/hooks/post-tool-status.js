import { join } from 'path';
import { resolveOmaDir, loadJsonFile } from '../utils.js';
// ─── Remember tag extraction ─────────────────────────────────────────────────
/**
 * Scans tool_output for <remember key="...">value</remember> tags.
 * Extracts key-value pairs for display in status output.
 */
export function extractRememberTags(toolOutput) {
    const tags = [];
    const regex = /<remember\s+key="([^"]+)"\s*>([\s\S]*?)<\/remember>/gi;
    let match;
    while ((match = regex.exec(toolOutput)) !== null) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (key && value) {
            tags.push({ key, value });
        }
    }
    return tags;
}
// ─── Status reading helpers ──────────────────────────────────────────────────
function readState(omaDir) {
    return loadJsonFile(join(omaDir, 'state.json'));
}
function readNotepad(omaDir) {
    return loadJsonFile(join(omaDir, 'notepad.json'));
}
function readTaskLog(omaDir) {
    return loadJsonFile(join(omaDir, 'task.log.json'));
}
// ─── Status formatting ───────────────────────────────────────────────────────
function formatTaskSummary(tasks) {
    if (!tasks.length)
        return '';
    const pending = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending');
    const completed = tasks.filter(t => t.status === 'completed');
    const parts = [];
    if (pending.length)
        parts.push(`${pending.length} pending`);
    if (completed.length)
        parts.push(`${completed.length} done`);
    if (!parts.length)
        return '';
    return `[OMA] Tasks: ${parts.join(', ')}`;
}
function formatRememberSummary(tags) {
    if (!tags.length)
        return '';
    if (tags.length === 1) {
        return `[OMA Remember] ${tags[0].key}: ${tags[0].value.slice(0, 60)}${tags[0].value.length > 60 ? '...' : ''}`;
    }
    return `[OMA Remember] ${tags.length} items stored`;
}
// ─── Main ─────────────────────────────────────────────────────────────────────
export async function main() {
    const omaDir = resolveOmaDir();
    const contextParts = [];
    // Read stdin for tool output
    let rawInput = '';
    if (!process.stdin.isTTY) {
        const { readAllStdin } = await import('../utils.js');
        rawInput = await readAllStdin();
    }
    // Extract <remember> tags from tool output
    if (rawInput) {
        try {
            const parsed = JSON.parse(rawInput);
            const toolOutput = parsed.tool_output;
            if (toolOutput) {
                const tags = extractRememberTags(toolOutput);
                if (tags.length) {
                    const summary = formatRememberSummary(tags);
                    if (summary)
                        contextParts.push(summary);
                }
            }
        }
        catch { /* ignore parse errors */ }
    }
    // Read OMA state
    const state = readState(omaDir);
    if (state && state.active && state.mode && state.mode !== 'none') {
        const iteration = state.iteration ?? 1;
        const max = state.maxIterations ?? 100;
        contextParts.push(`[OMA] ${state.mode} ${iteration}/${max}`);
        if (state.task && typeof state.task === 'string') {
            const taskPreview = state.task.slice(0, 60);
            contextParts.push(`  ${taskPreview}${state.task.length > 60 ? '...' : ''}`);
        }
    }
    // Read notepad priority
    const notepad = readNotepad(omaDir);
    if (notepad?.priority && typeof notepad.priority === 'string' && notepad.priority.trim()) {
        const notePreview = notepad.priority.trim().slice(0, 80);
        contextParts.push(`[OMA Note] ${notePreview}${notepad.priority.length > 80 ? '...' : ''}`);
    }
    // Read task log summary
    const taskLog = readTaskLog(omaDir);
    if (taskLog?.tasks?.length) {
        const taskSummary = formatTaskSummary(taskLog.tasks);
        if (taskSummary)
            contextParts.push(taskSummary);
    }
    // Build compact output
    if (contextParts.length > 0) {
        const context = contextParts.join('\n');
        // Truncate to 500 chars for additionalContext limit
        const truncated = context.length > 500 ? context.slice(0, 497) + '...' : context;
        console.log(truncated);
    }
    process.exit(0);
}
main().catch((err) => {
    console.error(`[post-tool-status] unexpected error: ${err}`);
    process.exit(0); // non-blocking, never break auggie
});
