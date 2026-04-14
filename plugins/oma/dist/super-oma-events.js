import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTRACTS_SCHEMA_VERSION, parseEventRecord, } from '../../../packages/oma-contracts/index.mjs';
import { resolveOmaDir } from './utils.js';
const eventSeqBySession = new Map();
function getSessionId() {
    if (process.env.SESSION_ID)
        return process.env.SESSION_ID;
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${ts}-${process.pid}`;
}
function nextSequence(sessionId) {
    const current = eventSeqBySession.get(sessionId) ?? 0;
    const next = current + 1;
    eventSeqBySession.set(sessionId, next);
    return next;
}
export function buildHookEvent(input) {
    const sessionId = getSessionId();
    return parseEventRecord({
        schema_version: CONTRACTS_SCHEMA_VERSION,
        ts: new Date().toISOString(),
        session_id: sessionId,
        source: 'hook',
        kind: input.kind,
        seq: nextSequence(sessionId),
        mode: input.mode,
        command: input.command,
        tool_name: input.tool_name,
        agent: input.agent ?? process.env.OMA_AGENT,
        pane_id: input.pane_id ?? process.env.TMUX_PANE,
        status: input.status,
        message: input.message,
    });
}
export function emitHookEvent(input) {
    if (process.env.VITEST)
        return;
    try {
        const event = buildHookEvent(input);
        const omaDir = resolveOmaDir();
        const eventsDir = join(omaDir, 'events');
        mkdirSync(eventsDir, { recursive: true });
        appendFileSync(join(eventsDir, `${event.session_id}.jsonl`), `${JSON.stringify(event)}\n`, 'utf8');
    }
    catch {
        // best-effort additive telemetry; never block hooks
    }
}
