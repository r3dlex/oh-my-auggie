// cli/super-utils.mjs — shared helpers for the super-oma wrapper CLI

import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, listWorkerDirs, readJsonSafe, resolveOmaDir, tailLines } from './utils.mjs';

export const SUPER_OMA_SCHEMA_VERSION = '1';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const SUPER_OMA_CLI = resolve(__dirname, 'super-oma.mjs');

export function nowIso() {
  return new Date().toISOString();
}

export function repoRoot() {
  return REPO_ROOT;
}

export function superOmaCliPath() {
  return SUPER_OMA_CLI;
}

export function resolveSuperOmaDir(opts = {}) {
  return opts.omaDir || resolveOmaDir();
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
  return join(sessionsRoot(omaDir), 'registry.json');
}

export function manifestCachePath(omaDir) {
  return join(cacheRoot(omaDir), 'oma-command-manifest.json');
}

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
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

export function makeTmuxSessionName(sessionId) {
  const base = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '-');
  return `super-oma-${base}`.slice(0, 48);
}

export function readState(omaDir) {
  return readJsonSafe(join(omaDir, 'state.json'), {});
}

export function listWorkers(omaDir) {
  const teamDir = join(omaDir, 'team');
  return listWorkerDirs(teamDir).map(dir => {
    const id = parseInt(dir.split('/worker-').pop(), 10);
    const meta = readJsonSafe(join(dir, 'meta.json'), {});
    const status = readJsonSafe(join(dir, 'status.json'), {});
    return {
      id,
      dir,
      meta,
      status,
      logLines: tailLines(join(dir, 'log.txt'), 3),
    };
  });
}

export function readRegistry(omaDir) {
  return readJsonSafe(registryPath(omaDir), {
    schema_version: SUPER_OMA_SCHEMA_VERSION,
    active_session_id: null,
    sessions: [],
    updated_at: null,
  });
}

export function writeRegistry(omaDir, registry) {
  atomicWrite(registryPath(omaDir), {
    schema_version: SUPER_OMA_SCHEMA_VERSION,
    active_session_id: registry.active_session_id ?? null,
    sessions: Array.isArray(registry.sessions) ? registry.sessions : [],
    updated_at: nowIso(),
  });
}

export function upsertRegistrySession(omaDir, record) {
  const registry = readRegistry(omaDir);
  const sessions = Array.isArray(registry.sessions) ? registry.sessions.slice() : [];
  const idx = sessions.findIndex(s => s.session_id === record.session_id);
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], ...record, updated_at: nowIso() };
  } else {
    sessions.push({ ...record, updated_at: nowIso() });
  }
  sessions.sort((a, b) => String(b.started_at || '').localeCompare(String(a.started_at || '')));
  registry.sessions = sessions;
  if (record.active !== false) {
    registry.active_session_id = record.session_id;
  } else if (registry.active_session_id === record.session_id) {
    registry.active_session_id = null;
  }
  writeRegistry(omaDir, registry);
  return registry;
}

export function readSessionArtifacts(omaDir, sessionId) {
  return {
    session: readJsonSafe(sessionFile(omaDir, sessionId, 'session.json'), null),
    panes: readJsonSafe(sessionFile(omaDir, sessionId, 'panes.json'), null),
    topology: readJsonSafe(sessionFile(omaDir, sessionId, 'topology.json'), null),
  };
}

export function writeSessionArtifacts(omaDir, sessionId, { session, panes, topology }) {
  if (session) {
    atomicWrite(sessionFile(omaDir, sessionId, 'session.json'), session);
  }
  if (panes) {
    atomicWrite(sessionFile(omaDir, sessionId, 'panes.json'), panes);
  }
  if (topology) {
    atomicWrite(sessionFile(omaDir, sessionId, 'topology.json'), topology);
  }
}

export function listSessions(omaDir) {
  const root = sessionsRoot(omaDir);
  const registry = readRegistry(omaDir);
  const fromRegistry = new Map((registry.sessions || []).map(s => [s.session_id, s]));

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sessionId = entry.name;
    if (!fromRegistry.has(sessionId)) {
      const { session } = readSessionArtifacts(omaDir, sessionId);
      if (session) {
        fromRegistry.set(sessionId, {
          session_id: sessionId,
          tmux_session_name: session.tmux_session_name || null,
          started_at: session.started_at || null,
          updated_at: session.updated_at || null,
          health: session.health || 'unknown',
          active: registry.active_session_id === sessionId,
        });
      }
    }
  }

  return Array.from(fromRegistry.values()).sort((a, b) =>
    String(b.started_at || '').localeCompare(String(a.started_at || ''))
  );
}

export function resolveSessionId(omaDir, sessionId = null) {
  if (sessionId) return sessionId;
  const registry = readRegistry(omaDir);
  if (registry.active_session_id) return registry.active_session_id;
  const sessions = listSessions(omaDir);
  return sessions[0]?.session_id || null;
}

export function hasBinary(name) {
  const result = spawnSync('which', [name], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim().length > 0;
}

export function hasTmux() {
  return hasBinary('tmux');
}

export function runTmux(args, opts = {}) {
  return spawnSync('tmux', args, {
    encoding: 'utf8',
    ...opts,
  });
}

export function tmuxHasSession(sessionName) {
  const result = runTmux(['has-session', '-t', sessionName]);
  return result.status === 0;
}

export function listTmuxPanes(sessionName) {
  const result = runTmux([
    'list-panes',
    '-t',
    sessionName,
    '-F',
    '#{pane_id}\t#{pane_active}\t#{pane_dead}\t#{pane_current_command}\t#{pane_title}\t#{pane_current_path}'
  ]);
  if (result.status !== 0) return [];
  return result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [pane_id, active, dead, current_command, title, current_path] = line.split('\t');
      return {
        pane_id,
        active: active === '1',
        dead: dead === '1',
        current_command,
        title,
        current_path,
      };
    });
}

export function displayPaneId(target) {
  const result = runTmux(['display-message', '-p', '-t', target, '#{pane_id}']);
  return result.status === 0 ? result.stdout.trim() : null;
}

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function parseJsonlEvents(path) {
  if (!existsSync(path)) return { events: [], invalidLines: 0 };
  const lines = readFileSync(path, 'utf8').split('\n').filter(line => line.trim().length > 0);
  const events = [];
  let invalidLines = 0;
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== 'object') {
        invalidLines++;
        continue;
      }
      events.push(event);
    } catch {
      invalidLines++;
    }
  }

  events.sort((a, b) => {
    const seqA = Number.isFinite(Number(a.seq)) ? Number(a.seq) : Number.MAX_SAFE_INTEGER;
    const seqB = Number.isFinite(Number(b.seq)) ? Number(b.seq) : Number.MAX_SAFE_INTEGER;
    if (seqA !== seqB) return seqA - seqB;
    return String(a.ts || '').localeCompare(String(b.ts || ''));
  });

  return { events, invalidLines };
}

export function readSessionEvents(omaDir, sessionId, limit = 30) {
  if (!sessionId) return { events: [], invalidLines: 0 };
  const { events, invalidLines } = parseJsonlEvents(eventFile(omaDir, sessionId));
  return {
    events: events.slice(-limit),
    invalidLines,
  };
}

export function summarizeEvents(events) {
  const recentCommands = events.filter(e => e.kind === 'command_detected').slice(-5);
  const toolEvents = events.filter(e => e.kind === 'tool_started' || e.kind === 'tool_finished').slice(-6);
  const warnings = events.filter(e => e.kind === 'warning').slice(-3);
  const errors = events.filter(e => e.kind === 'error').slice(-3);
  const workerUpdates = events.filter(e => e.kind === 'worker_status').slice(-5);

  return {
    recentCommands,
    latestTool: toolEvents[toolEvents.length - 1] || null,
    toolEvents,
    warnings,
    errors,
    workerUpdates,
  };
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---\n', 4);
  if (end < 0) return { meta: {}, body: raw };
  const header = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const meta = {};
  let currentArrayKey = null;

  for (const line of header.split('\n')) {
    if (!line.trim()) continue;
    const arrayItem = line.match(/^\s*-\s+(.*)$/);
    if (arrayItem && currentArrayKey) {
      meta[currentArrayKey] ??= [];
      meta[currentArrayKey].push(arrayItem[1].trim().replace(/^"(.*)"$/, '$1'));
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    currentArrayKey = null;
    if (!rawValue) {
      meta[key] = [];
      currentArrayKey = key;
      continue;
    }
    meta[key] = rawValue.trim().replace(/^"(.*)"$/, '$1');
  }

  return { meta, body };
}

function inferModeImpact(name, body) {
  const explicit = body.match(/^\s*-\s*Mode:\s*([A-Za-z0-9_-]+)/m) || body.match(/^\s*Mode:\s*([A-Za-z0-9_-]+)/m);
  if (explicit) return explicit[1];
  if (['ralph', 'ralplan', 'team', 'autopilot', 'ultrawork', 'ultraqa', 'plan'].includes(name)) {
    return name;
  }
  return 'none';
}

export function generateCommandManifest(omaDir, opts = {}) {
  const commandDir = join(opts.repoRoot || repoRoot(), 'plugins', 'oma', 'commands');
  const files = readdirSync(commandDir).filter(name => /^oma-.*\.md$/.test(name)).sort();
  const manifest = files.map(file => {
    const raw = readFileSync(join(commandDir, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const name = meta.name || (typeof meta.command === 'string' ? meta.command.replace(/^\/oma:/, '') : '');
    const slashCommand = typeof meta.command === 'string' && meta.command.trim()
      ? meta.command.trim()
      : (name ? `/oma:${name}` : '');
    if (!name || !meta.description || !slashCommand) {
      throw new Error(`Malformed command metadata in ${file}: name/command and description are required`);
    }
    const aliases = Array.isArray(meta.aliases)
      ? meta.aliases
      : typeof meta.triggers === 'string'
        ? meta.triggers.split(',').map(token => token.trim()).filter(Boolean)
        : [];
    return {
      name,
      slash_command: slashCommand,
      description: meta.description,
      aliases,
      argument_hint: meta['argument-hint'] || '',
      mode_impact: inferModeImpact(name, body),
      help_text: body.split('\n').slice(0, 24).join('\n').trim(),
      source_file: `plugins/oma/commands/${file}`,
    };
  });

  const payload = {
    schema_version: SUPER_OMA_SCHEMA_VERSION,
    generated_at: nowIso(),
    command_count: manifest.length,
    commands: manifest,
  };
  atomicWrite(manifestCachePath(omaDir), payload);
  return payload;
}

export function loadCommandManifest(omaDir) {
  const cachePath = manifestCachePath(omaDir);
  if (existsSync(cachePath)) {
    const cached = readJsonSafe(cachePath, null);
    if (cached?.commands) return cached;
  }
  return generateCommandManifest(omaDir);
}

export function resolveSlashCommand(omaDir, args) {
  const [target, ...rest] = args;
  const manifest = loadCommandManifest(omaDir);
  if (!target) {
    throw new Error('run requires a mode or /oma:command');
  }
  if (target === 'command') {
    const command = rest.join(' ').trim();
    if (!command) throw new Error('run command requires an exact slash command');
    return command;
  }
  if (target.startsWith('/oma:')) {
    return [target, ...rest].join(' ').trim();
  }

  const command = manifest.commands.find(entry =>
    entry.name === target || (Array.isArray(entry.aliases) && entry.aliases.includes(target))
  );
  if (!command) {
    throw new Error(`unknown OMA command/mode: ${target}`);
  }
  const suffix = rest.join(' ').trim();
  return suffix ? `${command.slash_command} ${suffix}` : command.slash_command;
}

export function latestMtime(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

export function computeSessionHealth({ tmuxAvailable, session, panes, paneRecords }) {
  if (!session) return 'unknown';
  if (!tmuxAvailable) return 'degraded';
  if (!session.tmux_session_name) return 'degraded';
  if (!tmuxHasSession(session.tmux_session_name)) return 'degraded';

  const expectedHud = paneRecords?.panes?.find(p => p.role === 'hud');
  if (expectedHud && !panes.some(p => p.pane_id === expectedHud.pane_id && !p.dead)) {
    return 'missing-hud';
  }
  return 'ok';
}
