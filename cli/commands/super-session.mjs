// cli/commands/super-session.mjs — tmux/session supervisor commands for super-oma

import { spawnSync } from 'child_process';
import {
  SUPER_OMA_SCHEMA_VERSION,
  computeSessionHealth,
  createSessionId,
  displayPaneId,
  ensureDir,
  hasTmux,
  listSessions,
  listTmuxPanes,
  makeTmuxSessionName,
  nowIso,
  readRegistry,
  readSessionArtifacts,
  resolveSessionId,
  resolveSuperOmaDir,
  runTmux,
  sessionsRoot,
  shellQuote,
  superOmaCliPath,
  tmuxHasSession,
  upsertRegistrySession,
  writeSessionArtifacts,
} from '../super-utils.mjs';

function sessionTemplate({ sessionId, tmuxSessionName, cwd, leaderCommand, degraded = false }) {
  return {
    schema_version: SUPER_OMA_SCHEMA_VERSION,
    session_id: sessionId,
    tmux_session_name: tmuxSessionName,
    cwd,
    leader_command: leaderCommand,
    started_at: nowIso(),
    updated_at: nowIso(),
    active: true,
    degraded,
    health: degraded ? 'degraded' : 'ok',
  };
}

function topologyTemplate({ leaderPaneId = null, hudPaneId = null, inspectorPaneId = null }) {
  return {
    schema_version: SUPER_OMA_SCHEMA_VERSION,
    layout: 'leader+hud+optional-inspector',
    leader_pane_id: leaderPaneId,
    hud_pane_id: hudPaneId,
    inspector_pane_id: inspectorPaneId,
    reconciled_at: nowIso(),
  };
}

function panesTemplate({ leaderPaneId = null, hudPaneId = null, inspectorPaneId = null, cwd }) {
  const panes = [];
  if (leaderPaneId) panes.push({ role: 'leader', pane_id: leaderPaneId, cwd, updated_at: nowIso() });
  if (hudPaneId) panes.push({ role: 'hud', pane_id: hudPaneId, cwd, updated_at: nowIso() });
  if (inspectorPaneId) panes.push({ role: 'inspector', pane_id: inspectorPaneId, cwd, updated_at: nowIso() });
  return {
    schema_version: SUPER_OMA_SCHEMA_VERSION,
    panes,
    updated_at: nowIso(),
  };
}

function syncSessionMetadata(omaDir, sessionId) {
  const { session, panes, topology } = readSessionArtifacts(omaDir, sessionId);
  if (!session) return null;

  const livePanes = session.tmux_session_name ? listTmuxPanes(session.tmux_session_name) : [];
  const health = computeSessionHealth({
    tmuxAvailable: hasTmux(),
    session,
    panes: livePanes,
    paneRecords: panes,
  });

  const nextSession = {
    ...session,
    updated_at: nowIso(),
    health,
    degraded: health !== 'ok',
  };

  const nextPanes = panes ? {
    ...panes,
    panes: panes.panes.map(pane => ({
      ...pane,
      live: livePanes.some(live => live.pane_id === pane.pane_id && !live.dead),
      updated_at: nowIso(),
    })),
    updated_at: nowIso(),
  } : null;

  const nextTopology = topology ? {
    ...topology,
    reconciled_at: nowIso(),
  } : null;

  writeSessionArtifacts(omaDir, sessionId, {
    session: nextSession,
    panes: nextPanes,
    topology: nextTopology,
  });

  upsertRegistrySession(omaDir, {
    session_id: sessionId,
    tmux_session_name: nextSession.tmux_session_name,
    started_at: nextSession.started_at,
    updated_at: nextSession.updated_at,
    health: nextSession.health,
    active: nextSession.active,
  });

  return {
    session: nextSession,
    panes: nextPanes,
    topology: nextTopology,
    livePanes,
  };
}

export async function superUp(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  ensureDir(sessionsRoot(omaDir));

  const sessionId = opts.session || createSessionId();
  const tmuxSessionName = opts.tmuxSessionName || makeTmuxSessionName(sessionId);
  const cwd = opts.cwd || process.cwd();
  const leaderCommand = opts.leaderCommand || process.env.SUPER_OMA_LEADER_CMD || 'auggie';
  const inspectEnabled = opts.inspect !== false;

  if (!hasTmux()) {
    const degradedSession = sessionTemplate({
      sessionId,
      tmuxSessionName: null,
      cwd,
      leaderCommand,
      degraded: true,
    });
    writeSessionArtifacts(omaDir, sessionId, {
      session: degradedSession,
      panes: panesTemplate({ cwd }),
      topology: topologyTemplate({}),
    });
    upsertRegistrySession(omaDir, {
      session_id: sessionId,
      tmux_session_name: null,
      started_at: degradedSession.started_at,
      updated_at: degradedSession.updated_at,
      health: degradedSession.health,
      active: true,
    });
    process.stderr.write('super-oma up: tmux not found; wrote degraded session metadata only.\n');
    return 1;
  }

  if (tmuxHasSession(tmuxSessionName)) {
    process.stderr.write(`super-oma up: tmux session already exists: ${tmuxSessionName}\n`);
    return 1;
  }

  const newSession = runTmux(['new-session', '-d', '-s', tmuxSessionName, '-c', cwd, leaderCommand]);
  if (newSession.status !== 0) {
    process.stderr.write(newSession.stderr || 'super-oma up: failed to start tmux session\n');
    return 1;
  }

  const leaderPaneId = displayPaneId(`${tmuxSessionName}:0.0`);
  const hudCommand = `OMA_DIR=${shellQuote(omaDir)} ${shellQuote(process.execPath)} ${shellQuote(superOmaCliPath())} hud --watch --session ${shellQuote(sessionId)}`;
  const hudSplit = runTmux(['split-window', '-v', '-t', leaderPaneId || `${tmuxSessionName}:0.0`, '-c', cwd, hudCommand]);
  if (hudSplit.status !== 0) {
    process.stderr.write(hudSplit.stderr || 'super-oma up: failed to create HUD pane\n');
    return 1;
  }
  const hudPaneId = displayPaneId(`${tmuxSessionName}:0.1`);
  runTmux(['resize-pane', '-t', hudPaneId || `${tmuxSessionName}:0.1`, '-y', String(opts.hudHeight || 12)]);

  let inspectorPaneId = null;
  if (inspectEnabled) {
    const inspectCommand = `OMA_DIR=${shellQuote(omaDir)} ${shellQuote(process.execPath)} ${shellQuote(superOmaCliPath())} sessions inspect ${shellQuote(sessionId)} --watch`;
    const inspectSplit = runTmux(['split-window', '-h', '-t', leaderPaneId || `${tmuxSessionName}:0.0`, '-c', cwd, inspectCommand]);
    if (inspectSplit.status === 0) {
      inspectorPaneId = displayPaneId(`${tmuxSessionName}:0.2`) || displayPaneId(leaderPaneId || `${tmuxSessionName}:0.0`);
    }
  }

  const session = sessionTemplate({ sessionId, tmuxSessionName, cwd, leaderCommand });
  const panes = panesTemplate({ leaderPaneId, hudPaneId, inspectorPaneId, cwd });
  const topology = topologyTemplate({ leaderPaneId, hudPaneId, inspectorPaneId });

  writeSessionArtifacts(omaDir, sessionId, { session, panes, topology });
  upsertRegistrySession(omaDir, {
    session_id: sessionId,
    tmux_session_name: tmuxSessionName,
    started_at: session.started_at,
    updated_at: session.updated_at,
    health: session.health,
    active: true,
  });

  process.stdout.write(`super-oma up: session ${sessionId} ready (tmux: ${tmuxSessionName})\n`);
  process.stdout.write(`super-oma up: leader=${leaderPaneId || 'unknown'} hud=${hudPaneId || 'unknown'} inspector=${inspectorPaneId || 'disabled'}\n`);

  if (opts.attach === true) {
    return superAttach({ ...opts, session: sessionId });
  }
  process.stdout.write(`super-oma up: attach with: super-oma attach --session ${sessionId}\n`);
  return 0;
}

export async function superAttach(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const sessionId = resolveSessionId(omaDir, opts.session);
  if (!sessionId) {
    process.stderr.write('super-oma attach: no known session\n');
    return 1;
  }

  const { session } = readSessionArtifacts(omaDir, sessionId);
  if (!session?.tmux_session_name) {
    process.stderr.write('super-oma attach: session is degraded or missing tmux metadata\n');
    return 1;
  }
  if (!hasTmux() || !tmuxHasSession(session.tmux_session_name)) {
    process.stderr.write(`super-oma attach: tmux session not found: ${session.tmux_session_name}\n`);
    return 1;
  }

  const attachResult = spawnSync('tmux', ['attach-session', '-t', session.tmux_session_name], {
    stdio: 'inherit',
  });
  return attachResult.status ?? 0;
}

export async function superReconcile(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const sessionId = resolveSessionId(omaDir, opts.session);
  if (!sessionId) {
    process.stderr.write('super-oma reconcile: no known session\n');
    return 1;
  }

  const artifacts = readSessionArtifacts(omaDir, sessionId);
  if (!artifacts.session) {
    process.stderr.write(`super-oma reconcile: missing session metadata for ${sessionId}\n`);
    return 1;
  }

  const session = artifacts.session;
  if (!hasTmux()) {
    const degraded = { ...session, degraded: true, health: 'degraded', updated_at: nowIso() };
    writeSessionArtifacts(omaDir, sessionId, { session: degraded });
    upsertRegistrySession(omaDir, {
      session_id: sessionId,
      tmux_session_name: degraded.tmux_session_name,
      started_at: degraded.started_at,
      updated_at: degraded.updated_at,
      health: degraded.health,
      active: true,
    });
    process.stdout.write('super-oma reconcile: tmux unavailable; session marked degraded.\n');
    return 0;
  }

  if (!session.tmux_session_name || !tmuxHasSession(session.tmux_session_name)) {
    const degraded = { ...session, degraded: true, health: 'degraded', updated_at: nowIso() };
    writeSessionArtifacts(omaDir, sessionId, { session: degraded });
    upsertRegistrySession(omaDir, {
      session_id: sessionId,
      tmux_session_name: degraded.tmux_session_name,
      started_at: degraded.started_at,
      updated_at: degraded.updated_at,
      health: degraded.health,
      active: true,
    });
    process.stdout.write('super-oma reconcile: tmux session missing; leader pane not touched.\n');
    return 0;
  }

  const livePanes = listTmuxPanes(session.tmux_session_name);
  const paneRecords = artifacts.panes?.panes || [];
  const leaderPane = paneRecords.find(p => p.role === 'leader' && livePanes.some(l => l.pane_id === p.pane_id && !l.dead))
    || { pane_id: livePanes.find(p => !p.dead)?.pane_id || `${session.tmux_session_name}:0.0` };

  let hudPane = paneRecords.find(p => p.role === 'hud' && livePanes.some(l => l.pane_id === p.pane_id && !l.dead));
  if (!hudPane) {
    const hudCommand = `OMA_DIR=${shellQuote(omaDir)} ${shellQuote(process.execPath)} ${shellQuote(superOmaCliPath())} hud --watch --session ${shellQuote(sessionId)}`;
    const result = runTmux(['split-window', '-v', '-t', leaderPane.pane_id, '-c', session.cwd || process.cwd(), hudCommand]);
    if (result.status === 0) {
      hudPane = { role: 'hud', pane_id: displayPaneId(`${session.tmux_session_name}:0.99`) || displayPaneId(leaderPane.pane_id), cwd: session.cwd || process.cwd() };
      process.stdout.write('super-oma reconcile: restored HUD pane.\n');
    }
  }

  let inspectorPane = paneRecords.find(p => p.role === 'inspector' && livePanes.some(l => l.pane_id === p.pane_id && !l.dead));
  if (!inspectorPane && opts.inspect !== false) {
    const inspectCommand = `OMA_DIR=${shellQuote(omaDir)} ${shellQuote(process.execPath)} ${shellQuote(superOmaCliPath())} sessions inspect ${shellQuote(sessionId)} --watch`;
    const result = runTmux(['split-window', '-h', '-t', leaderPane.pane_id, '-c', session.cwd || process.cwd(), inspectCommand]);
    if (result.status === 0) {
      inspectorPane = { role: 'inspector', pane_id: displayPaneId(leaderPane.pane_id), cwd: session.cwd || process.cwd() };
      process.stdout.write('super-oma reconcile: restored inspector pane.\n');
    }
  }

  const nextPanes = panesTemplate({
    leaderPaneId: leaderPane.pane_id,
    hudPaneId: hudPane?.pane_id || null,
    inspectorPaneId: inspectorPane?.pane_id || null,
    cwd: session.cwd || process.cwd(),
  });

  const nextTopology = topologyTemplate({
    leaderPaneId: leaderPane.pane_id,
    hudPaneId: hudPane?.pane_id || null,
    inspectorPaneId: inspectorPane?.pane_id || null,
  });

  writeSessionArtifacts(omaDir, sessionId, {
    session: { ...session, updated_at: nowIso(), degraded: false },
    panes: nextPanes,
    topology: nextTopology,
  });

  syncSessionMetadata(omaDir, sessionId);
  process.stdout.write('super-oma reconcile: completed without touching the leader pane.\n');
  return 0;
}

export async function superSessionsList(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const sessions = listSessions(omaDir).map(session => {
    const synced = session.session_id ? syncSessionMetadata(omaDir, session.session_id) : null;
    const current = synced?.session || session;
    return {
      session_id: session.session_id,
      tmux_session_name: current.tmux_session_name || null,
      started_at: current.started_at || null,
      updated_at: current.updated_at || null,
      health: current.health || 'unknown',
      active: readRegistry(omaDir).active_session_id === session.session_id,
    };
  });

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: true, sessions }, null, 2) + '\n');
    return 0;
  }

  if (sessions.length === 0) {
    process.stdout.write('super-oma sessions: no sessions recorded\n');
    return 0;
  }

  for (const session of sessions) {
    process.stdout.write(
      `${session.active ? '*' : ' '} ${session.session_id}  ${session.health}  tmux=${session.tmux_session_name || 'n/a'}  started=${session.started_at || 'n/a'}\n`
    );
  }
  return 0;
}

function renderInspect(sessionId, details, json = false) {
  const payload = {
    ok: true,
    session_id: sessionId,
    session: details.session,
    panes: details.panes,
    topology: details.topology,
    live_panes: details.livePanes,
  };
  if (json) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return;
  }

  process.stdout.write(`super-oma session ${sessionId}\n`);
  process.stdout.write('─'.repeat(72) + '\n');
  process.stdout.write(`tmux    : ${details.session?.tmux_session_name || 'n/a'}\n`);
  process.stdout.write(`health  : ${details.session?.health || 'unknown'}\n`);
  process.stdout.write(`cwd     : ${details.session?.cwd || 'n/a'}\n`);
  process.stdout.write(`leader  : ${details.topology?.leader_pane_id || 'n/a'}\n`);
  process.stdout.write(`hud     : ${details.topology?.hud_pane_id || 'n/a'}\n`);
  process.stdout.write(`inspect : ${details.topology?.inspector_pane_id || 'n/a'}\n`);
  process.stdout.write(`live panes: ${details.livePanes.length}\n`);
}

export async function superSessionsInspect(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const sessionId = resolveSessionId(omaDir, opts.session);
  if (!sessionId) {
    process.stderr.write('super-oma sessions inspect: no known session\n');
    return 1;
  }

  const render = () => {
    const synced = syncSessionMetadata(omaDir, sessionId) || readSessionArtifacts(omaDir, sessionId);
    renderInspect(sessionId, synced, opts.json);
  };

  if (opts.watch) {
    const cleanup = () => process.exit(0);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    render();
    setInterval(render, opts.intervalMs || 1500);
    await new Promise(() => {});
  }

  render();
  return 0;
}

export async function superPanesList(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const sessionId = resolveSessionId(omaDir, opts.session);
  if (!sessionId) {
    process.stderr.write('super-oma panes list: no known session\n');
    return 1;
  }

  const details = syncSessionMetadata(omaDir, sessionId) || readSessionArtifacts(omaDir, sessionId);
  const panes = details.livePanes || [];

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: true, session_id: sessionId, panes }, null, 2) + '\n');
    return 0;
  }

  if (panes.length === 0) {
    process.stdout.write('super-oma panes: no live panes\n');
    return 0;
  }
  for (const pane of panes) {
    process.stdout.write(`${pane.pane_id}  active=${pane.active} dead=${pane.dead} cmd=${pane.current_command} path=${pane.current_path}\n`);
  }
  return 0;
}
