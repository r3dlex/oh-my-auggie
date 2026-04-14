// cli/commands/super-hud.mjs — HUD rendering for super-oma

import {
  computeSessionHealth,
  hasTmux,
  listWorkers,
  readSessionArtifacts,
  readSessionEvents,
  resolveSessionId,
  resolveSuperOmaDir,
  summarizeEvents,
  listTmuxPanes,
  readState,
} from '../super-utils.mjs';

const WIDTH = 96;

function hbar(char = '─', width = WIDTH - 4) {
  return char.repeat(width);
}

function boxTop(label) {
  const inner = WIDTH - 2;
  const title = ` ${label} `;
  const left = Math.floor((inner - title.length) / 2);
  const right = inner - left - title.length;
  return `┌${hbar('─', left)}${title}${hbar('─', right)}┐`;
}

function boxMid() {
  return `├${hbar('─', WIDTH - 2)}┤`;
}

function boxBot() {
  return `└${hbar('─', WIDTH - 2)}┘`;
}

function boxLine(content = '') {
  const inner = WIDTH - 4;
  const text = String(content).length > inner ? `${String(content).slice(0, inner - 3)}...` : String(content);
  return `│ ${text.padEnd(inner)} │`;
}

function renderActivity(summary, workers) {
  const lines = [];
  if (summary.recentCommands.length > 0) {
    for (const event of summary.recentCommands.slice(-3)) {
      lines.push(`cmd  ${event.command || event.command_name || 'unknown'} @ ${event.ts || 'n/a'}`);
    }
  }
  if (summary.latestTool) {
    lines.push(`tool ${summary.latestTool.tool || summary.latestTool.name || 'unknown'} (${summary.latestTool.kind})`);
  }
  if (summary.workerUpdates.length > 0) {
    for (const event of summary.workerUpdates.slice(-2)) {
      lines.push(`worker ${event.worker || event.worker_id || '?'} -> ${event.status || event.state || event.kind}`);
    }
  }
  if (lines.length === 0) {
    for (const worker of workers.slice(0, 2)) {
      lines.push(`worker-${worker.id}: ${worker.status?.status || 'unknown'} | ${worker.logLines[worker.logLines.length - 1] || '(no log yet)'}`);
    }
  }
  if (lines.length === 0) {
    lines.push('No recent activity yet');
  }
  return lines;
}

export async function superHudSnapshot(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const state = readState(omaDir);
  const workers = listWorkers(omaDir);
  const sessionId = resolveSessionId(omaDir, opts.session);
  const artifacts = sessionId ? readSessionArtifacts(omaDir, sessionId) : { session: null, panes: null, topology: null };
  const livePanes = artifacts.session?.tmux_session_name ? listTmuxPanes(artifacts.session.tmux_session_name) : [];
  const health = computeSessionHealth({
    tmuxAvailable: hasTmux(),
    session: artifacts.session,
    panes: livePanes,
    paneRecords: artifacts.panes,
  });
  const { events, invalidLines } = readSessionEvents(omaDir, sessionId, 24);
  const summary = summarizeEvents(events);
  const activity = renderActivity(summary, workers);

  const running = workers.filter(w => w.status?.status === 'running').length;
  const done = workers.filter(w => w.status?.status === 'done' || w.status?.status === 'completed').length;
  const errors = workers.filter(w => w.status?.status === 'error' || w.status?.status === 'failed').length;

  const lines = [
    boxTop('SUPER OMA HUD'),
    boxLine(`Session: ${sessionId || 'none'}   Health: ${health}   tmux: ${hasTmux() ? 'yes' : 'no'}`),
    boxLine(`Mode: ${state.mode || 'none'}   Active: ${Boolean(state.active)}   Iteration: ${state.iteration ?? '—'}/${state.max_iterations ?? '—'}`),
    boxLine(`Task: ${state.task_description || state.task || '—'}`),
    boxMid(),
    boxLine(`Workers: ${workers.length} total   ${running} running   ${done} done   ${errors} error`),
    boxLine(`Panes: ${livePanes.length} live   Recent commands: ${summary.recentCommands.length}   Event warnings: ${summary.warnings.length + summary.errors.length}`),
    boxMid(),
    boxLine('Activity'),
    ...activity.slice(0, 6).map(line => boxLine(`• ${line}`)),
    ...(invalidLines > 0 ? [boxLine(`Ignored corrupt event lines: ${invalidLines}`)] : []),
    boxBot(),
  ];

  process.stdout.write(lines.join('\n') + '\n');
  return 0;
}

export async function superHudWatch(opts = {}) {
  const intervalMs = opts.intervalMs || 1500;
  const cleanup = () => process.exit(0);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.stdout.write('\x1b[2J\x1b[H');
  await superHudSnapshot(opts);
  setInterval(() => {
    process.stdout.write('\x1b[2J\x1b[H');
    superHudSnapshot(opts).catch(err => {
      process.stderr.write(`super-oma hud: render error: ${err.message}\n`);
    });
  }, intervalMs);
  await new Promise(() => {});
}
