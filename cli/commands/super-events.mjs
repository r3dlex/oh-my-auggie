// cli/commands/super-events.mjs — event tailing for super-oma

import { eventFile, parseJsonlEvents, resolveSessionId, resolveSuperOmaDir } from '../super-utils.mjs';

export async function superEventsTail(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const sessionId = resolveSessionId(omaDir, opts.session);
  if (!sessionId) {
    process.stderr.write('super-oma events tail: no known session\n');
    return 1;
  }
  const { events, invalidLines } = parseJsonlEvents(eventFile(omaDir, sessionId));
  const lines = events.slice(-(opts.lines || 20));

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: true, session_id: sessionId, invalid_lines: invalidLines, events: lines }, null, 2) + '\n');
    return 0;
  }

  if (lines.length === 0) {
    process.stdout.write('super-oma events: no events yet\n');
  } else {
    for (const event of lines) {
      process.stdout.write(`${event.ts || 'n/a'}  ${event.kind || 'event'}  ${event.command || event.tool || event.message || ''}\n`);
    }
  }
  if (invalidLines > 0) {
    process.stdout.write(`ignored corrupt lines: ${invalidLines}\n`);
  }
  return 0;
}
