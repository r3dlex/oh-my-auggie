// cli/commands/super-oma-ui.mjs — read-only UI data loading + rendering helpers

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { listWorkerDirs, readJsonSafe, resolveOmaDir, tailLines } from '../utils.mjs';

const WIDTH = 96;
const DEFAULT_EVENT_LIMIT = 6;

function clip(text, max = WIDTH - 4) {
  const singleLine = String(text ?? 'n/a').replace(/\s+/g, ' ').trim() || 'n/a';
  if (singleLine.length <= max) return singleLine;
  return singleLine.slice(0, Math.max(0, max - 3)) + '...';
}

function hbar(char = '─', width = WIDTH - 4) {
  return char.repeat(Math.max(0, width));
}

function boxTop(title = 'SUPER OMA', width = WIDTH) {
  const inner = width - 2;
  const label = ` ${title} `;
  const left = Math.floor((inner - label.length) / 2);
  const right = inner - left - label.length;
  return '┌' + hbar('─', left) + label + hbar('─', right) + '┐';
}

function boxMid(width = WIDTH) {
  return '├' + hbar('─', width - 2) + '┤';
}

function boxBot(width = WIDTH) {
  return '└' + hbar('─', width - 2) + '┘';
}

function boxLine(content = '', width = WIDTH) {
  const inner = width - 4;
  return `│ ${clip(content, inner).padEnd(inner)} │`;
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function listDirectories(path) {
  if (!existsSync(path)) return [];
  try {
    return readdirSync(path)
      .map(name => ({ name, path: join(path, name) }))
      .filter(entry => {
        try {
          return statSync(entry.path).isDirectory();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

function listFiles(path, suffix = '') {
  if (!existsSync(path)) return [];
  try {
    return readdirSync(path)
      .filter(name => !suffix || name.endsWith(suffix))
      .map(name => ({ name, path: join(path, name) }));
  } catch {
    return [];
  }
}

function safeTimestamp(value) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

function readJsonLines(path) {
  if (!existsSync(path)) return { items: [], corruptCount: 0 };
  try {
    const content = readFileSync(path, 'utf8');
    const items = [];
    let corruptCount = 0;

    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      try {
        items.push(JSON.parse(line));
      } catch {
        corruptCount++;
      }
    }

    return { items, corruptCount };
  } catch {
    return { items: [], corruptCount: 0 };
  }
}

function latestByTimestamp(entries, valueForEntry) {
  return [...entries].sort((a, b) => {
    const aValue = valueForEntry(a);
    const bValue = valueForEntry(b);
    return bValue.localeCompare(aValue);
  })[0] || null;
}

function readWorkers(omaDir) {
  const teamDir = join(omaDir, 'team');
  return listWorkerDirs(teamDir).map(dir => {
    const id = Number.parseInt(dir.split('/worker-').pop() || '', 10);
    return {
      id,
      meta: readJsonSafe(join(dir, 'meta.json'), {}),
      status: readJsonSafe(join(dir, 'status.json'), {}),
      logLines: tailLines(join(dir, 'log.txt'), 4),
    };
  });
}

function summarizeWorkerStates(workers) {
  return {
    total: workers.length,
    running: workers.filter(worker => ['running', 'in_progress'].includes(worker.status?.status || worker.status?.state)).length,
    done: workers.filter(worker => ['done', 'completed', 'idle'].includes(worker.status?.status || worker.status?.state)).length,
    errors: workers.filter(worker => ['error', 'failed', 'blocked'].includes(worker.status?.status || worker.status?.state)).length,
  };
}

function readSessionBundle(omaDir, sessionId) {
  if (!sessionId) return null;

  const sessionDir = join(omaDir, 'sessions', sessionId);
  if (!existsSync(sessionDir)) return null;

  const session = readJsonSafe(join(sessionDir, 'session.json'), {});
  const topology = readJsonSafe(join(sessionDir, 'topology.json'), {});
  const panesRaw = readJsonSafe(join(sessionDir, 'panes.json'), []);
  const panes = Array.isArray(panesRaw)
    ? panesRaw
    : Array.isArray(panesRaw?.panes)
      ? panesRaw.panes
      : Object.entries(panesRaw || {}).map(([role, value]) => ({ role, ...value }));

  return {
    id: sessionId,
    dir: sessionDir,
    session,
    topology,
    panes,
  };
}

function readKnownSessions(omaDir) {
  const sessionsDir = join(omaDir, 'sessions');
  return listDirectories(sessionsDir)
    .map(entry => readSessionBundle(omaDir, entry.name))
    .filter(Boolean);
}

function latestSessionIdFromEvents(omaDir) {
  const eventsDir = join(omaDir, 'events');
  const files = listFiles(eventsDir, '.jsonl');
  const latest = latestByTimestamp(files, entry => {
    try {
      return statSync(entry.path).mtime.toISOString();
    } catch {
      return '';
    }
  });

  return latest ? latest.name.replace(/\.jsonl$/, '') : null;
}

function resolveSessionId(omaDir, requestedSessionId, state, sessions) {
  if (requestedSessionId) return requestedSessionId;
  if (state?.session_id) return state.session_id;

  const latestKnownSession = latestByTimestamp(
    sessions,
    session => safeTimestamp(session.session?.started_at || session.topology?.updated_at || session.session?.updated_at)
  );
  if (latestKnownSession?.id) return latestKnownSession.id;

  return latestSessionIdFromEvents(omaDir);
}

function readRecentEvents(omaDir, sessionId, limit = DEFAULT_EVENT_LIMIT) {
  const eventsDir = join(omaDir, 'events');
  const preferred = sessionId ? join(eventsDir, `${sessionId}.jsonl`) : null;

  let eventFile = preferred;
  if (!eventFile || !existsSync(eventFile)) {
    const latest = latestByTimestamp(listFiles(eventsDir, '.jsonl'), entry => {
      try {
        return statSync(entry.path).mtime.toISOString();
      } catch {
        return '';
      }
    });
    eventFile = latest?.path ?? null;
  }

  if (!eventFile) {
    return { file: null, items: [], corruptCount: 0 };
  }

  const parsed = readJsonLines(eventFile);
  const items = parsed.items.slice(-limit).map((event, index) => ({
    seq: event.seq ?? index + 1,
    ts: safeTimestamp(event.ts),
    kind: event.kind ?? 'event',
    source: event.source ?? 'unknown',
    mode: event.mode ?? null,
    command: event.command ?? null,
    tool_name: event.tool_name ?? null,
    agent: event.agent ?? null,
    pane_id: event.pane_id ?? null,
    status: event.status ?? null,
    message: event.message ?? null,
  }));

  return { file: eventFile, items, corruptCount: parsed.corruptCount };
}

function formatActivityLine(event) {
  const detail = event.message || event.command || event.tool_name || event.status || event.agent || event.pane_id || '';
  return `${event.ts} · ${event.kind}${detail ? ` · ${detail}` : ''}`;
}

function formatPaneLine(pane) {
  const role = pane.role || pane.kind || pane.name || 'pane';
  const paneId = pane.pane_id || pane.id || pane.tmux_pane_id || 'n/a';
  const status = pane.status || pane.health || 'unknown';
  const command = pane.command || pane.cmd || pane.title || '';
  return `${role} (${paneId}) · ${status}${command ? ` · ${command}` : ''}`;
}

function describeDegraded(snapshot) {
  if (!snapshot.selectedSession) return 'state-only';
  const health = snapshot.selectedSession.session?.health
    || snapshot.selectedSession.topology?.health
    || snapshot.selectedSession.session?.status
    || snapshot.selectedSession.topology?.status;
  return health || 'managed';
}

export function readSuperOmaSnapshot(opts = {}) {
  const omaDir = opts.omaDir || resolveOmaDir();
  const state = readJsonSafe(join(omaDir, 'state.json'), {});
  const workers = readWorkers(omaDir);
  const sessions = readKnownSessions(omaDir);
  const sessionId = resolveSessionId(omaDir, opts.sessionId, state, sessions);
  const selectedSession = readSessionBundle(omaDir, sessionId) || sessions.find(session => session.id === sessionId) || null;
  const events = readRecentEvents(omaDir, sessionId, opts.eventLimit);

  return {
    omaDir,
    state,
    workers,
    workerSummary: summarizeWorkerStates(workers),
    sessions,
    selectedSession,
    events,
    degraded: !selectedSession,
  };
}

export function renderSuperOmaHud(snapshot) {
  const mode = snapshot.state?.mode || 'n/a';
  const iteration = snapshot.state?.iteration ?? 'n/a';
  const maxIterations = snapshot.state?.max_iterations ?? '?';
  const task = snapshot.state?.task_description || snapshot.state?.task || 'n/a';
  const sessionLabel = snapshot.selectedSession?.id || 'state-only';
  const sessionHealth = describeDegraded(snapshot);
  const panes = snapshot.selectedSession?.panes || [];
  const paneSummary = panes.length > 0
    ? panes.map(pane => `${pane.role || pane.kind || 'pane'}=${pane.status || pane.health || 'ok'}`).join(', ')
    : 'No pane metadata yet';
  const activityLines = snapshot.events.items.length > 0
    ? snapshot.events.items.map(formatActivityLine)
    : snapshot.workers.flatMap(worker =>
        worker.logLines.length > 0
          ? worker.logLines.map(line => `[worker-${worker.id}] ${line}`)
          : [`[worker-${worker.id}] (no output yet)`]
      );

  const lines = [
    boxTop('SUPER OMA HUD'),
    boxLine(`Mode: ${mode}   Iteration: ${iteration}/${maxIterations}`),
    boxLine(`Task: ${task}`),
    boxLine(`Session: ${sessionLabel}   Health: ${sessionHealth}`),
    boxLine(`Panes: ${paneSummary}`),
    boxMid(),
    boxLine(`Workers: ${snapshot.workerSummary.total} total   ${snapshot.workerSummary.running} running   ${snapshot.workerSummary.done} done   ${snapshot.workerSummary.errors} error`),
    boxLine(`Events: ${snapshot.events.file ? snapshot.events.file.replace(`${snapshot.omaDir}/`, '') : 'none'}${snapshot.events.corruptCount ? `   corrupt lines skipped: ${snapshot.events.corruptCount}` : ''}`),
    boxMid(),
    boxLine('─ Activity ─'),
    ...(activityLines.length > 0 ? activityLines.map(line => boxLine(line)) : [boxLine('No recent activity yet')]),
    boxBot(),
  ];

  return lines.join('\n');
}

export function renderSuperOmaStatusline(snapshot) {
  const mode = snapshot.state?.mode || 'n/a';
  const iteration = snapshot.state?.iteration ?? 'n/a';
  const maxIterations = snapshot.state?.max_iterations ?? '?';
  const task = clip(snapshot.state?.task_description || snapshot.state?.task || 'n/a', 24);
  const session = snapshot.selectedSession?.id || 'state-only';
  const activity = snapshot.events.items.length > 0 ? formatActivityLine(snapshot.events.items[snapshot.events.items.length - 1]) : 'no events';
  return [
    'super-oma',
    `health=${describeDegraded(snapshot)}`,
    `mode=${mode}`,
    `iter=${iteration}/${maxIterations}`,
    `task=${task}`,
    `session=${session}`,
    `workers=${snapshot.workerSummary.running}r/${snapshot.workerSummary.done}d/${snapshot.workerSummary.errors}e`,
    `activity=${clip(activity, 36)}`,
  ].join(' | ');
}

export function renderSuperOmaSessionsList(snapshot) {
  if (snapshot.sessions.length === 0) {
    return 'super-oma sessions: no recorded sessions';
  }

  const lines = ['super-oma sessions'];
  for (const session of snapshot.sessions) {
    const startedAt = safeTimestamp(session.session?.started_at || session.topology?.updated_at);
    const health = session.session?.health || session.topology?.health || session.session?.status || 'unknown';
    const tmux = session.session?.tmux_session_name || session.topology?.tmux_session_name || 'n/a';
    lines.push(`- ${session.id} | ${health} | tmux=${tmux} | started=${startedAt}`);
  }
  return lines.join('\n');
}

export function renderSuperOmaSessionInspector(snapshot) {
  const session = snapshot.selectedSession;
  if (!session) {
    return [
      boxTop('SESSION INSPECTOR'),
      boxLine('No session metadata found; running in degraded state-only mode.'),
      boxLine('Expected .oma/sessions/<session-id>/{session,topology,panes}.json'),
      boxBot(),
    ].join('\n');
  }

  const tmuxSessionName = session.session?.tmux_session_name || session.topology?.tmux_session_name || 'n/a';
  const startedAt = safeTimestamp(session.session?.started_at || session.session?.updated_at);
  const cwd = session.session?.cwd || session.topology?.cwd || 'n/a';
  const panes = session.panes.length > 0 ? session.panes.map(formatPaneLine) : ['No pane records'];
  const events = snapshot.events.items.length > 0 ? snapshot.events.items.map(formatActivityLine) : ['No recent events'];

  return [
    boxTop(`SESSION ${session.id}`),
    boxLine(`Health: ${describeDegraded(snapshot)}   tmux: ${tmuxSessionName}`),
    boxLine(`Started: ${startedAt}`),
    boxLine(`CWD: ${cwd}`),
    boxMid(),
    boxLine('─ Panes ─'),
    ...panes.map(line => boxLine(line)),
    boxMid(),
    boxLine('─ Activity ─'),
    ...events.map(line => boxLine(line)),
    boxBot(),
  ].join('\n');
}

export function renderWatchFrame(rendered) {
  clearScreen();
  process.stdout.write(rendered + '\n');
}
