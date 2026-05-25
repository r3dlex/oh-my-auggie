// plugins/oma/src/cli/tmux.ts — Tmux/task helpers for OMA CLI (super-utils port)
// Ported from cli/super-utils.mjs

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, listWorkerDirs, readJsonSafe, resolveOmaDir, tailLines } from './utils.js';

export const SUPER_OMA_SCHEMA_VERSION = '1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const SUPER_OMA_CLI = resolve(__dirname, 'super-oma.mjs');

// ── Time ─────────────────────────────────────────────────────────────────────

export function nowIso(): string {
  return new Date().toISOString();
}

export function repoRoot(): string {
  return REPO_ROOT;
}

export function superOmaCliPath(): string {
  return SUPER_OMA_CLI;
}

// ── Directory resolution ─────────────────────────────────────────────────────

export function resolveSuperOmaDir(opts: { omaDir?: string } = {}): string {
  return opts.omaDir || resolveOmaDir();
}

export function ensureDir(path: string): string {
  mkdirSync(path, { recursive: true });
  return path;
}

export function sessionsRoot(omaDir: string): string {
  return ensureDir(join(omaDir, 'sessions'));
}

export function eventsRoot(omaDir: string): string {
  return ensureDir(join(omaDir, 'events'));
}

export function cacheRoot(omaDir: string): string {
  return ensureDir(join(omaDir, 'cache'));
}

export function registryPath(omaDir: string): string {
  return join(omaDir, 'registry.json');
}

export function manifestCachePath(omaDir: string): string {
  return join(cacheRoot(omaDir), 'manifest.json');
}

// ── Session path helpers ─────────────────────────────────────────────────────

export function sessionDir(omaDir: string, sessionId: string): string {
  return ensureDir(join(sessionsRoot(omaDir), sessionId));
}

export function sessionFile(omaDir: string, sessionId: string, filename: string): string {
  return join(sessionDir(omaDir, sessionId), filename);
}

export function eventFile(omaDir: string, sessionId: string): string {
  return join(eventsRoot(omaDir), `${sessionId}.jsonl`);
}

export function createSessionId(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${process.pid}`;
}

export function makeTmuxSessionName(sessionId: string): string {
  return 'oma-' + sessionId.replace(/[^a-zA-Z0-9-]/g, '-');
}

// ── State / Registry I/O ────────────────────────────────────────────────────

export function readState(omaDir: string): Record<string, unknown> | null {
  return readJsonSafe(join(omaDir, 'state.json'), null);
}

export function listWorkers(omaDir: string): string[] {
  const teamDir = join(omaDir, 'team');
  return listWorkerDirs(teamDir).map(d => d.split('/').pop()!);
}

export function readRegistry(omaDir: string): Record<string, unknown> | null {
  return readJsonSafe(registryPath(omaDir), null);
}

export function writeRegistry(omaDir: string, registry: unknown): void {
  atomicWrite(registryPath(omaDir), registry);
}

export function upsertRegistrySession(omaDir: string, record: Record<string, unknown>): void {
  const registry = readRegistry(omaDir) || { sessions: [] };
  const sessions = (registry as { sessions: unknown[] }).sessions || [];
  const idx = (sessions as Array<Record<string, unknown>>).findIndex(
    (s) => (s as { session_id?: string }).session_id === (record as Record<string, unknown>).session_id
  );
  if (idx >= 0) sessions[idx] = record;
  else sessions.push(record);
  writeRegistry(omaDir, { ...registry, sessions });
}

// ── Session artifacts ───────────────────────────────────────────────────────

export function readSessionArtifacts(omaDir: string, sessionId: string): Record<string, unknown> | null {
  return readJsonSafe(join(sessionsRoot(omaDir), sessionId, 'session.json'), null);
}

export function writeSessionArtifacts(
  omaDir: string,
  sessionId: string,
  artifacts: { session?: unknown; panes?: unknown; topology?: unknown },
): void {
  const sd = sessionDir(omaDir, sessionId);
  if (artifacts.session) atomicWrite(join(sd, 'session.json'), artifacts.session);
  if (artifacts.panes) atomicWrite(join(sd, 'panes.json'), artifacts.panes);
  if (artifacts.topology) atomicWrite(join(sd, 'topology.json'), artifacts.topology);
}

export function listSessions(omaDir: string): string[] {
  const sr = sessionsRoot(omaDir);
  if (!existsSync(sr)) return [];
  return readdirSync(sr).filter(n => existsSync(join(sr, n, 'session.json')));
}

export function resolveSessionId(omaDir: string, sessionId: string | null = null): string | null {
  if (sessionId) return sessionId;
  const sessions = listSessions(omaDir);
  if (sessions.length === 0) return null;
  // return most recent by mtime
  return sessions.sort((a, b) =>
    statSync(join(omaDir, 'sessions', b, 'session.json')).mtimeMs -
    statSync(join(omaDir, 'sessions', a, 'session.json')).mtimeMs
  )[0];
}

// ── Binary / tmux helpers ───────────────────────────────────────────────────

export function hasBinary(name: string): boolean {
  const r = spawnSync('which', [name], { stdio: 'ignore' });
  return r.status === 0;
}

export function hasTmux(): boolean {
  return hasBinary('tmux');
}

export function runTmux(args: string[], opts: { stdio?: 'inherit' | 'pipe' | 'ignore' } = {}): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync('tmux', args, { stdio: opts.stdio || 'pipe' });
  return {
    status: r.status,
    stdout: r.stdout?.toString() || '',
    stderr: r.stderr?.toString() || '',
  };
}

export function tmuxHasSession(sessionName: string): boolean {
  const r = runTmux(['has-session', '-t', sessionName]);
  return r.status === 0;
}

export function listTmuxPanes(sessionName: string): { pane_id: string; session_name: string }[] {
  const r = runTmux(['list-panes', '-t', sessionName, '-F', '#{pane_id}\t#{session_name}']);
  if (r.status !== 0) return [];
  return r.stdout.trim().split('\n').filter(Boolean).map(line => {
    const [pane_id, session_name] = line.split('\t');
    return { pane_id: pane_id || '', session_name: session_name || '' };
  });
}

export function displayPaneId(target: string): string {
  return target.replace('%', '');
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

// ── Event log helpers ───────────────────────────────────────────────────────

export function parseJsonlEvents(path: string): Record<string, unknown>[] {
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

export function readSessionEvents(omaDir: string, sessionId: string, limit = 30): Record<string, unknown>[] {
  return parseJsonlEvents(eventFile(omaDir, sessionId)).slice(-limit);
}

export function summarizeEvents(events: Record<string, unknown>[]): string[] {
  return events.map(e => `[${String(e.kind || '?')}] ${String(e.message || e.command || '')}`);
}

// ── Command manifest ────────────────────────────────────────────────────────

export function generateCommandManifest(omaDir: string, _opts: Record<string, unknown> = {}): Record<string, unknown> {
  const manifest: Record<string, unknown> = {
    schema_version: SUPER_OMA_SCHEMA_VERSION,
    generated_at: nowIso(),
    commands: {},
  };
  return manifest;
}

export function loadCommandManifest(omaDir: string): Record<string, unknown> | null {
  return readJsonSafe(manifestCachePath(omaDir), null);
}

export function resolveSlashCommand(omaDir: string, args: string[]): string | null {
  if (args.length === 0) return null;
  const manifest = loadCommandManifest(omaDir);
  if (!manifest) return null;
  const cmds = (manifest as Record<string, unknown>).commands as Record<string, unknown> | undefined;
  if (!cmds) return null;
  return (cmds[args[0]] as string) || null;
}

// ── Misc ─────────────────────────────────────────────────────────────────────

export function latestMtime(path: string): number {
  if (!existsSync(path)) return 0;
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

export function computeSessionHealth(info: {
  tmuxAvailable: boolean;
  session?: { active?: boolean; degraded?: boolean };
  panes?: { pane_id: string }[];
  paneRecords?: { pane_id: string }[];
}): string {
  if (!info.tmuxAvailable) return 'no-tmux';
  if (!info.session || !info.session.active) return 'inactive';
  if (info.session.degraded) return 'degraded';
  return 'ok';
}
