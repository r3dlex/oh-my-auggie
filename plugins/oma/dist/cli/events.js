// plugins/oma/src/cli/events.ts — Event log tailing for OMA CLI
// Ported from cli/commands/super-events.mjs
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveOmaDir } from './utils.js';
import { eventsRoot, resolveSessionId } from './tmux.js';
export async function eventsTail(opts = {}) {
    const omaDir = opts.omaDir || resolveOmaDir();
    const sessionId = resolveSessionId(omaDir, opts.session || null);
    const limit = opts.lines || 30;
    if (!sessionId) {
        process.stderr.write('events tail: no known session\n');
        return 1;
    }
    const eventFile = join(eventsRoot(omaDir), `${sessionId}.jsonl`);
    if (!existsSync(eventFile)) {
        process.stderr.write(`events tail: no events for session ${sessionId}\n`);
        return 1;
    }
    const events = [];
    try {
        const content = readFileSync(eventFile, 'utf8');
        for (const line of content.split('\n').filter(Boolean).slice(-limit)) {
            try {
                events.push(JSON.parse(line));
            }
            catch { /* skip corrupt */ }
        }
    }
    catch {
        process.stderr.write('events tail: read error\n');
        return 1;
    }
    if (opts.json) {
        process.stdout.write(JSON.stringify({ ok: true, session_id: sessionId, events }, null, 2) + '\n');
    }
    else {
        for (const e of events) {
            process.stdout.write(`[${e.ts || '?'}] ${e.kind || '?'} ${e.message || e.command || ''}\n`);
        }
    }
    return 0;
}
