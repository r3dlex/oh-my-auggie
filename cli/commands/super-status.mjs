// cli/commands/super-status.mjs — status view for super-oma

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

export async function superStatus(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const state = readState(omaDir);
  const workers = listWorkers(omaDir);
  const sessionId = resolveSessionId(omaDir, opts.session);
  const sessionArtifacts = sessionId ? readSessionArtifacts(omaDir, sessionId) : { session: null, panes: null, topology: null };
  const livePanes = sessionArtifacts.session?.tmux_session_name ? listTmuxPanes(sessionArtifacts.session.tmux_session_name) : [];
  const health = computeSessionHealth({
    tmuxAvailable: hasTmux(),
    session: sessionArtifacts.session,
    panes: livePanes,
    paneRecords: sessionArtifacts.panes,
  });
  const { events, invalidLines } = readSessionEvents(omaDir, sessionId, 20);
  const summary = summarizeEvents(events);

  const payload = {
    ok: true,
    oma_dir: omaDir,
    session_id: sessionId,
    tmux_available: hasTmux(),
    health,
    state: {
      mode: state.mode || 'none',
      active: Boolean(state.active),
      task: state.task_description || state.task || '',
      iteration: state.iteration ?? null,
      max_iterations: state.max_iterations ?? null,
    },
    workers: workers.map(worker => ({
      id: worker.id,
      status: worker.status?.status || 'unknown',
      last_log: worker.logLines[worker.logLines.length - 1] || null,
    })),
    session: sessionArtifacts.session,
    topology: sessionArtifacts.topology,
    live_panes: livePanes,
    recent_commands: summary.recentCommands,
    latest_tool: summary.latestTool,
    warnings: summary.warnings,
    errors: summary.errors,
    invalid_event_lines: invalidLines,
  };

  if (opts.json) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return 0;
  }

  process.stdout.write('super-oma status\n');
  process.stdout.write('─'.repeat(72) + '\n');
  process.stdout.write(`Health     : ${health}\n`);
  process.stdout.write(`tmux       : ${payload.tmux_available ? 'available' : 'missing'}\n`);
  process.stdout.write(`Session    : ${sessionId || 'none'}\n`);
  process.stdout.write(`Mode       : ${payload.state.mode}\n`);
  process.stdout.write(`Task       : ${payload.state.task || '—'}\n`);
  process.stdout.write(`Iteration  : ${payload.state.iteration ?? '—'}/${payload.state.max_iterations ?? '—'}\n`);
  process.stdout.write(`Workers    : ${workers.length}\n`);

  if (workers.length > 0) {
    for (const worker of workers) {
      process.stdout.write(`  worker-${worker.id}: ${worker.status?.status || 'unknown'} | ${worker.logLines[worker.logLines.length - 1] || '(no log)'}\n`);
    }
  }

  if (summary.recentCommands.length > 0) {
    process.stdout.write('\nRecent commands:\n');
    for (const event of summary.recentCommands) {
      process.stdout.write(`  - ${event.command || event.command_name || 'unknown'} @ ${event.ts || 'n/a'}\n`);
    }
  }

  if (summary.latestTool) {
    process.stdout.write(`\nLatest tool: ${summary.latestTool.tool || summary.latestTool.name || 'unknown'} (${summary.latestTool.kind})\n`);
  }

  if (invalidLines > 0) {
    process.stdout.write(`\nEvent stream: ${invalidLines} corrupt/partial line(s) ignored\n`);
  }

  return 0;
}
