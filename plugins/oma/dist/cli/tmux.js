// plugins/oma/src/cli/tmux.ts — Tmux/task helpers for OMA CLI (super-utils port)
// Ported from cli/super-utils.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, listWorkerDirs, readJsonSafe, findOmaDir } from '../utils.js';
export const SUPER_OMA_SCHEMA_VERSION = '1';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const SUPER_OMA_CLI = resolve(__dirname, 'super-oma.mjs');
// ── Time ─────────────────────────────────────────────────────────────────────
export function nowIso() {
    return new Date().toISOString();
}
export function repoRoot() {
    return REPO_ROOT;
}
export function superOmaCliPath() {
    return SUPER_OMA_CLI;
}
// ── Directory resolution ─────────────────────────────────────────────────────
export function resolveSuperOmaDir(opts = {}) {
    return opts.omaDir || findOmaDir();
}
export function ensureDir(path) {
    mkdirSync(path, { recursive: true });
    return path;
}
export function sessionsRoot(omaDir) {
    return ensureDir(join(omaDir, 'sessions'));
}
export function eventsRoot(omaDir) {
    return ensureDir(join(omaDir, 'events'));
}
export function cacheRoot(omaDir) {
    return ensureDir(join(omaDir, 'cache'));
}
export function registryPath(omaDir) {
    return join(omaDir, 'registry.json');
}
export function manifestCachePath(omaDir) {
    return join(cacheRoot(omaDir), 'manifest.json');
}
// ── Session path helpers ─────────────────────────────────────────────────────
export function sessionDir(omaDir, sessionId) {
    return ensureDir(join(sessionsRoot(omaDir), sessionId));
}
export function sessionFile(omaDir, sessionId, filename) {
    return join(sessionDir(omaDir, sessionId), filename);
}
export function eventFile(omaDir, sessionId) {
    return join(eventsRoot(omaDir), `${sessionId}.jsonl`);
}
export function createSessionId() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${process.pid}`;
}
export function makeTmuxSessionName(sessionId) {
    return 'oma-' + sessionId.replace(/[^a-zA-Z0-9-]/g, '-');
}
// ── State / Registry I/O ────────────────────────────────────────────────────
export function readState(omaDir) {
    return readJsonSafe(join(omaDir, 'state.json'), null);
}
export function listWorkers(omaDir) {
    const teamDir = join(omaDir, 'team');
    return listWorkerDirs(teamDir).map(d => d.split('/').pop());
}
export function readRegistry(omaDir) {
    return readJsonSafe(registryPath(omaDir), null);
}
export function writeRegistry(omaDir, registry) {
    atomicWrite(registryPath(omaDir), registry);
}
export function upsertRegistrySession(omaDir, record) {
    const registry = readRegistry(omaDir) || { sessions: [] };
    const sessions = registry.sessions || [];
    const idx = sessions.findIndex((s) => s.session_id === record.session_id);
    if (idx >= 0)
        sessions[idx] = record;
    else
        sessions.push(record);
    writeRegistry(omaDir, { ...registry, sessions });
}
// ── Session artifacts ───────────────────────────────────────────────────────
export function readSessionArtifacts(omaDir, sessionId) {
    return readJsonSafe(join(sessionsRoot(omaDir), sessionId, 'session.json'), null);
}
export function writeSessionArtifacts(omaDir, sessionId, artifacts) {
    const sd = sessionDir(omaDir, sessionId);
    if (artifacts.session)
        atomicWrite(join(sd, 'session.json'), artifacts.session);
    if (artifacts.panes)
        atomicWrite(join(sd, 'panes.json'), artifacts.panes);
    if (artifacts.topology)
        atomicWrite(join(sd, 'topology.json'), artifacts.topology);
}
export function listSessions(omaDir) {
    const sr = sessionsRoot(omaDir);
    if (!existsSync(sr))
        return [];
    return readdirSync(sr).filter(n => existsSync(join(sr, n, 'session.json')));
}
export function resolveSessionId(omaDir, sessionId = null) {
    if (sessionId)
        return sessionId;
    const sessions = listSessions(omaDir);
    if (sessions.length === 0)
        return null;
    // return most recent by mtime
    return sessions.sort((a, b) => statSync(join(omaDir, 'sessions', b, 'session.json')).mtimeMs -
        statSync(join(omaDir, 'sessions', a, 'session.json')).mtimeMs)[0];
}
// ── Binary / tmux helpers ───────────────────────────────────────────────────
export function hasBinary(name) {
    const r = spawnSync('which', [name], { stdio: 'ignore' });
    return r.status === 0;
}
export function hasTmux() {
    return hasBinary('tmux');
}
export function runTmux(args, opts = {}) {
    const r = spawnSync('tmux', args, { stdio: opts.stdio || 'pipe' });
    return {
        status: r.status,
        stdout: r.stdout?.toString() || '',
        stderr: r.stderr?.toString() || '',
    };
}
export function tmuxHasSession(sessionName) {
    const r = runTmux(['has-session', '-t', sessionName]);
    return r.status === 0;
}
export function listTmuxPanes(sessionName) {
    const r = runTmux(['list-panes', '-t', sessionName, '-F', '#{pane_id}\t#{session_name}']);
    if (r.status !== 0)
        return [];
    return r.stdout.trim().split('\n').filter(Boolean).map(line => {
        const [pane_id, session_name] = line.split('\t');
        return { pane_id: pane_id || '', session_name: session_name || '' };
    });
}
export function displayPaneId(target) {
    return target.replace('%', '');
}
export function shellQuote(value) {
    return `'${value.replace(/'/g, "'\\''")}'`;
}
// ── Event log helpers ───────────────────────────────────────────────────────
export function parseJsonlEvents(path) {
    if (!existsSync(path))
        return [];
    try {
        return readFileSync(path, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map(line => JSON.parse(line));
    }
    catch {
        return [];
    }
}
export function readSessionEvents(omaDir, sessionId, limit = 30) {
    return parseJsonlEvents(eventFile(omaDir, sessionId)).slice(-limit);
}
export function summarizeEvents(events) {
    return events.map(e => `[${String(e.kind || '?')}] ${String(e.message || e.command || '')}`);
}
// ── Command manifest ────────────────────────────────────────────────────────
export function generateCommandManifest(omaDir, _opts = {}) {
    const manifest = {
        schema_version: SUPER_OMA_SCHEMA_VERSION,
        generated_at: nowIso(),
        commands: {},
    };
    return manifest;
}
export function loadCommandManifest(omaDir) {
    return readJsonSafe(manifestCachePath(omaDir), null);
}
export function resolveSlashCommand(omaDir, args) {
    if (args.length === 0)
        return null;
    const manifest = loadCommandManifest(omaDir);
    if (!manifest)
        return null;
    const cmds = manifest.commands;
    if (!cmds)
        return null;
    return cmds[args[0]] || null;
}
// ── Misc ─────────────────────────────────────────────────────────────────────
export function latestMtime(path) {
    if (!existsSync(path))
        return 0;
    try {
        return statSync(path).mtimeMs;
    }
    catch {
        return 0;
    }
}
export function computeSessionHealth(info) {
    if (!info.tmuxAvailable)
        return 'no-tmux';
    if (!info.session || !info.session.active)
        return 'inactive';
    if (info.session.degraded)
        return 'degraded';
    return 'ok';
}
