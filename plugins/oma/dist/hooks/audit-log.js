import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { resolveOmaDir, isEnterpriseProfile, getMergedConfig } from '../utils.js';
// ─── Helpers ─────────────────────────────────────────────────────────────────
function ensureAuditLog(omaDir) {
    const logPath = join(omaDir, 'audit-log.json');
    try {
        readFileSync(logPath, 'utf8');
    }
    catch {
        writeFileSync(logPath, JSON.stringify({ sessions: [], version: '0.1' }, null, 2), 'utf8');
    }
}
function readAuditLog(omaDir) {
    const logPath = join(omaDir, 'audit-log.json');
    ensureAuditLog(omaDir);
    try {
        const content = readFileSync(logPath, 'utf8');
        if (!content.trim()) {
            return { sessions: [], version: '0.1' };
        }
        return JSON.parse(content);
    }
    catch {
        return { sessions: [], version: '0.1' };
    }
}
function writeAuditLog(omaDir, log) {
    const logPath = join(omaDir, 'audit-log.json');
    writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf8');
}
function getSessionId() {
    if (process.env.SESSION_ID)
        return process.env.SESSION_ID;
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${ts}-${process.pid}`;
}
function getCurrentTimestamp() {
    return new Date().toISOString();
}
function upsertSession(log, sessionId) {
    let session = log.sessions.find(s => s.id === sessionId);
    if (!session) {
        session = {
            id: sessionId,
            start_time: getCurrentTimestamp(),
            events: [],
        };
        log.sessions.push(session);
    }
    return session;
}
// ─── Tool info extraction ──────────────────────────────────────────────────────
export function extractFromInput(rawInput) {
    try {
        const input = JSON.parse(rawInput);
        return {
            toolName: input.tool_name,
            filePaths: extractFilePaths(input.tool_input ?? {}),
            outcome: 'success',
        };
    }
    catch {
        return {};
    }
}
function extractFilePaths(toolInput) {
    const paths = [];
    for (const key of ['file_path', 'path', 'filePath', 'destination_path', 'target_path']) {
        const val = toolInput[key];
        if (typeof val === 'string' && val !== '') {
            paths.push(val);
        }
    }
    return paths;
}
// ─── Main ─────────────────────────────────────────────────────────────────────
export async function main() {
    const hookType = process.env.HOOK_TYPE ?? 'PostToolUse';
    const config = getMergedConfig();
    const omaDir = resolveOmaDir();
    // Only active in enterprise profile
    if (!isEnterpriseProfile(config)) {
        process.exit(0);
    }
    const sessionId = getSessionId();
    // Read stdin if available
    let rawInput = '';
    if (!process.stdin.isTTY) {
        const { readAllStdin } = await import('../utils.js');
        rawInput = await readAllStdin();
    }
    if (hookType === 'PostToolUse') {
        let toolName = process.env.OMA_TOOL_NAME ?? 'unknown';
        let durationMs = parseInt(process.env.OMA_DURATION_MS ?? '0', 10);
        let outcome = 'success';
        let filePaths = [];
        // Parse from stdin if env vars are not set
        if ((toolName === 'unknown' || toolName === 'Read' || toolName === 'Bash') && rawInput) {
            const extracted = extractFromInput(rawInput);
            toolName = extracted.toolName ?? toolName;
            filePaths = extracted.filePaths ?? [];
            outcome = extracted.outcome ?? outcome;
        }
        else if (rawInput) {
            const extracted = extractFromInput(rawInput);
            if (extracted.toolName) {
                toolName = extracted.toolName;
                filePaths = extracted.filePaths ?? [];
            }
        }
        // Check if outcome was blocked (exit code 2 from approval-gate etc)
        const exitCode = parseInt(process.env.OMA_EXIT_CODE ?? '0', 10);
        if (exitCode === 2) {
            outcome = 'blocked';
        }
        const log = readAuditLog(omaDir);
        const session = upsertSession(log, sessionId);
        session.events.push({
            timestamp: getCurrentTimestamp(),
            tool_name: toolName,
            file_paths: filePaths,
            outcome,
            duration_ms: durationMs,
        });
        writeAuditLog(omaDir, log);
        console.error(`[audit-log] session=${sessionId} tool=${toolName} outcome=${outcome} files=${filePaths.length}`);
    }
    else if (hookType === 'SessionEnd' || hookType === 'session-end') {
        ensureAuditLog(omaDir);
        const log = readAuditLog(omaDir);
        const session = log.sessions.find(s => s.id === sessionId);
        if (session) {
            console.error(`[audit-log] Session summary for ${sessionId}:`);
            console.error(`[audit-log]   Events: ${session.events.length}`);
            console.error(`[audit-log]   Start: ${session.start_time}`);
        }
    }
    process.exit(0);
}
main().catch((err) => {
    console.error(`[audit-log] fatal error: ${err}`);
    process.exit(0); // non-blocking hook, but still log
});
