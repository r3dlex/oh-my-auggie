// plugins/oma/src/cli/session.ts — tmux session management for OMA CLI
// Ported from cli/commands/super-session.mjs + cli/commands/super-status.mjs
import { spawnSync } from 'node:child_process';
import { SUPER_OMA_SCHEMA_VERSION, computeSessionHealth, createSessionId, displayPaneId, ensureDir, hasTmux, listSessions, listTmuxPanes, makeTmuxSessionName, nowIso, readSessionArtifacts, resolveSessionId, resolveSuperOmaDir, runTmux, sessionsRoot, shellQuote, tmuxHasSession, upsertRegistrySession, writeSessionArtifacts, } from './tmux.js';
// ── Internal helpers ────────────────────────────────────────────────────────
function detectNewPaneId(sessionName, beforePanes) {
    const afterPanes = listTmuxPanes(sessionName);
    const beforeIds = new Set(beforePanes.map(pane => pane.pane_id));
    return afterPanes.find(pane => !beforeIds.has(pane.pane_id))?.pane_id || null;
}
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
function topologyTemplate({ leaderPaneId, hudPaneId, inspectorPaneId }) {
    return {
        schema_version: SUPER_OMA_SCHEMA_VERSION,
        layout: 'leader+hud+optional-inspector',
        leader_pane_id: leaderPaneId || null,
        hud_pane_id: hudPaneId || null,
        inspector_pane_id: inspectorPaneId || null,
        reconciled_at: nowIso(),
    };
}
function panesTemplate({ leaderPaneId, hudPaneId, inspectorPaneId, cwd }) {
    const panes = [];
    if (leaderPaneId && cwd)
        panes.push({ role: 'leader', pane_id: leaderPaneId, cwd, updated_at: nowIso() });
    if (hudPaneId && cwd)
        panes.push({ role: 'hud', pane_id: hudPaneId, cwd, updated_at: nowIso() });
    if (inspectorPaneId && cwd)
        panes.push({ role: 'inspector', pane_id: inspectorPaneId, cwd, updated_at: nowIso() });
    return { schema_version: SUPER_OMA_SCHEMA_VERSION, panes, updated_at: nowIso() };
}
function syncSessionMetadata(omaDir, sessionId) {
    const artifacts = readSessionArtifacts(omaDir, sessionId);
    if (!artifacts)
        return null;
    const session = artifacts.session;
    if (!session)
        return null;
    const livePanes = session.tmux_session_name ? listTmuxPanes(session.tmux_session_name) : [];
    const health = computeSessionHealth({
        tmuxAvailable: hasTmux(),
        session,
        panes: livePanes,
    });
    const nextSession = { ...session, updated_at: nowIso(), health, degraded: health !== 'ok' };
    writeSessionArtifacts(omaDir, sessionId, { session: nextSession });
    upsertRegistrySession(omaDir, {
        session_id: sessionId,
        tmux_session_name: nextSession.tmux_session_name,
        started_at: nextSession.started_at,
        updated_at: nextSession.updated_at,
        health: nextSession.health,
        active: nextSession.active,
    });
    return { session: nextSession, livePanes };
}
export async function sessionUp(opts = {}) {
    const omaDir = resolveSuperOmaDir(opts);
    ensureDir(sessionsRoot(omaDir));
    const sessionId = opts.session || createSessionId();
    const tmuxSessionName = opts.tmuxSessionName || makeTmuxSessionName(sessionId);
    const cwd = opts.cwd || process.cwd();
    const leaderCommand = opts.leaderCommand || process.env.SUPER_OMA_LEADER_CMD || 'auggie';
    const inspectEnabled = opts.inspect !== false;
    if (!hasTmux()) {
        const degradedSession = sessionTemplate({ sessionId, tmuxSessionName: null, cwd, leaderCommand, degraded: true });
        writeSessionArtifacts(omaDir, sessionId, {
            session: degradedSession,
            panes: panesTemplate({ cwd }),
            topology: topologyTemplate({}),
        });
        upsertRegistrySession(omaDir, {
            session_id: sessionId, tmux_session_name: null, started_at: degradedSession.started_at,
            updated_at: degradedSession.updated_at, health: degradedSession.health, active: true,
        });
        process.stderr.write('session up: tmux not found; wrote degraded session metadata only.\n');
        return 1;
    }
    if (tmuxHasSession(tmuxSessionName)) {
        process.stderr.write(`session up: tmux session already exists: ${tmuxSessionName}\n`);
        return 1;
    }
    const newSession = runTmux(['new-session', '-d', '-s', tmuxSessionName, '-c', cwd, leaderCommand]);
    if (newSession.status !== 0) {
        process.stderr.write(newSession.stderr || 'session up: failed\n');
        return 1;
    }
    const leaderPaneId = displayPaneId(`${tmuxSessionName}:0.0`);
    const beforeHudSplit = listTmuxPanes(tmuxSessionName);
    const hudSplit = runTmux(['split-window', '-v', '-t', leaderPaneId || `${tmuxSessionName}:0.0`, '-c', cwd,
        `oma hud --watch --session ${shellQuote(sessionId)}`]);
    if (hudSplit.status !== 0) {
        process.stderr.write(hudSplit.stderr || 'session up: HUD pane failed\n');
        return 1;
    }
    const hudPaneId = detectNewPaneId(tmuxSessionName, beforeHudSplit) || displayPaneId(`${tmuxSessionName}:0.1`);
    runTmux(['resize-pane', '-t', hudPaneId || `${tmuxSessionName}:0.1`, '-y', String(opts.hudHeight || 12)]);
    let inspectorPaneId = null;
    if (inspectEnabled) {
        const beforeInspectSplit = listTmuxPanes(tmuxSessionName);
        const inspectSplit = runTmux(['split-window', '-h', '-t', leaderPaneId || `${tmuxSessionName}:0.0`, '-c', cwd,
            `oma sessions inspect ${shellQuote(sessionId)} --watch`]);
        if (inspectSplit.status === 0) {
            inspectorPaneId = detectNewPaneId(tmuxSessionName, beforeInspectSplit) || displayPaneId(`${tmuxSessionName}:0.2`);
        }
    }
    const session = sessionTemplate({ sessionId, tmuxSessionName, cwd, leaderCommand });
    const panes = panesTemplate({ leaderPaneId, hudPaneId, inspectorPaneId, cwd });
    const topology = topologyTemplate({ leaderPaneId, hudPaneId, inspectorPaneId });
    writeSessionArtifacts(omaDir, sessionId, { session, panes, topology });
    upsertRegistrySession(omaDir, {
        session_id: sessionId, tmux_session_name: tmuxSessionName,
        started_at: session.started_at, updated_at: session.updated_at, health: session.health, active: true,
    });
    process.stdout.write(`session up: ${sessionId} ready (tmux: ${tmuxSessionName})\n`);
    process.stdout.write(`session up: leader=${leaderPaneId || '?'} hud=${hudPaneId || '?'} inspector=${inspectorPaneId || 'disabled'}\n`);
    if (opts.attach)
        return sessionAttach({ ...opts, session: sessionId });
    process.stdout.write(`session up: attach with: oma session attach --session ${sessionId}\n`);
    return 0;
}
export async function sessionAttach(opts = {}) {
    const omaDir = resolveSuperOmaDir(opts);
    const sessionId = resolveSessionId(omaDir, opts.session || null);
    if (!sessionId) {
        process.stderr.write('session attach: no known session\n');
        return 1;
    }
    const artifacts = readSessionArtifacts(omaDir, sessionId);
    const tmuxSessionName = artifacts?.session ? artifacts.session.tmux_session_name : null;
    if (!tmuxSessionName) {
        process.stderr.write('session attach: degraded or missing tmux\n');
        return 1;
    }
    const r = spawnSync('tmux', ['attach-session', '-t', tmuxSessionName], { stdio: 'inherit' });
    return r.status ?? 0;
}
export async function sessionReconcile(opts = {}) {
    const omaDir = resolveSuperOmaDir(opts);
    const sessionId = resolveSessionId(omaDir, opts.session || null);
    if (!sessionId) {
        process.stderr.write('session reconcile: no known session\n');
        return 1;
    }
    syncSessionMetadata(omaDir, sessionId);
    process.stdout.write('session reconcile: completed\n');
    return 0;
}
export async function sessionsList(opts = {}) {
    const omaDir = resolveSuperOmaDir(opts);
    const sessions = listSessions(omaDir).map(sid => {
        const synced = syncSessionMetadata(omaDir, sid);
        const session = synced?.session;
        return {
            session_id: sid,
            tmux_session_name: session?.tmux_session_name || null,
            started_at: session?.started_at || null,
            updated_at: session?.updated_at || null,
            health: session?.health || 'unknown',
            active: false,
        };
    });
    if (opts.json) {
        process.stdout.write(JSON.stringify({ ok: true, sessions }, null, 2) + '\n');
        return 0;
    }
    if (sessions.length === 0) {
        process.stdout.write('sessions: none recorded\n');
        return 0;
    }
    for (const s of sessions) {
        process.stdout.write(` ${s.session_id}  ${s.health}  tmux=${s.tmux_session_name || 'n/a'}  started=${s.started_at || 'n/a'}\n`);
    }
    return 0;
}
export async function sessionsInspect(opts = {}) {
    const omaDir = resolveSuperOmaDir(opts);
    const sessionId = resolveSessionId(omaDir, opts.session || null);
    if (!sessionId) {
        process.stderr.write('sessions inspect: no known session\n');
        return 1;
    }
    const render = () => {
        const synced = syncSessionMetadata(omaDir, sessionId);
        if (opts.json) {
            process.stdout.write(JSON.stringify({ ok: true, session_id: sessionId, ...synced }, null, 2) + '\n');
            return;
        }
        const s = synced?.session;
        process.stdout.write(`session ${sessionId}\n${'─'.repeat(72)}\n`);
        process.stdout.write(`tmux    : ${s?.tmux_session_name || 'n/a'}\n`);
        process.stdout.write(`health  : ${s?.health || 'unknown'}\n`);
        process.stdout.write(`cwd     : ${s?.cwd || 'n/a'}\n`);
        process.stdout.write(`leader  : ${synced?.topology ? synced.topology?.leader_pane_id || 'n/a' : 'n/a'}\n`);
        process.stdout.write(`hud     : ${synced?.topology ? synced.topology?.hud_pane_id || 'n/a' : 'n/a'}\n`);
    };
    if (opts.watch) {
        process.on('SIGINT', () => process.exit(0));
        process.on('SIGTERM', () => process.exit(0));
        render();
        setInterval(render, opts.intervalMs || 1500);
        await new Promise(() => { });
    }
    render();
    return 0;
}
export async function panesList(opts = {}) {
    const omaDir = resolveSuperOmaDir(opts);
    const sessionId = resolveSessionId(omaDir, opts.session || null);
    if (!sessionId) {
        process.stderr.write('panes list: no known session\n');
        return 1;
    }
    const synced = syncSessionMetadata(omaDir, sessionId);
    const livePanes = synced?.livePanes || [];
    if (opts.json) {
        process.stdout.write(JSON.stringify({ ok: true, session_id: sessionId, panes: livePanes }, null, 2) + '\n');
        return 0;
    }
    if (livePanes.length === 0) {
        process.stdout.write('panes: none live\n');
        return 0;
    }
    for (const pane of livePanes)
        process.stdout.write(`${pane.pane_id}\n`);
    return 0;
}
export async function sessionStatus(opts = {}) {
    const omaDir = resolveSuperOmaDir(opts);
    const sessionId = resolveSessionId(omaDir, opts.session || null);
    if (!sessionId) {
        process.stderr.write('session status: no known session\n');
        return 1;
    }
    const synced = syncSessionMetadata(omaDir, sessionId);
    const s = synced?.session;
    const health = s?.health || 'unknown';
    if (opts.json)
        process.stdout.write(JSON.stringify({ ok: true, session_id: sessionId, health, ...synced }, null, 2) + '\n');
    else
        process.stdout.write(`session ${sessionId}: health=${health}\n`);
    return 0;
}
