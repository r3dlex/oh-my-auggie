// plugins/oma/src/cli/ui.ts — Shared UI rendering helpers for OMA CLI
// Merged from cli/commands/hud.mjs + cli/commands/super-oma-ui.mjs

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { listWorkerDirs, readJsonSafe, findOmaDir, tailLines } from '../utils.js';

const WIDTH = 96;
const DEFAULT_EVENT_LIMIT = 6;

// ── Text helpers ──────────────────────────────────────────────────────────

function clip(text: unknown, max = WIDTH - 4): string {
  const singleLine = String(text ?? 'n/a').replace(/\s+/g, ' ').trim() || 'n/a';
  if (singleLine.length <= max) return singleLine;
  return singleLine.slice(0, Math.max(0, max - 3)) + '...';
}

// ── Box drawing ───────────────────────────────────────────────────────────

export function hbar(char = '─', width = WIDTH - 4): string {
  return char.repeat(Math.max(0, width));
}

export function boxTop(title = 'OMA HUD', width = WIDTH): string {
  const inner = width - 2;
  const label = ` ${title} `;
  const left = Math.floor((inner - label.length) / 2);
  const right = inner - left - label.length;
  return '┌' + hbar('─', left) + label + hbar('─', right) + '┐';
}

export function boxMid(width = WIDTH): string {
  return '├' + hbar('─', width - 2) + '┤';
}

export function boxBot(width = WIDTH): string {
  return '└' + hbar('─', width - 2) + '┘';
}

export function boxLine(content = '', width = WIDTH): string {
  const inner = width - 4;
  return `│ ${clip(content, inner).padEnd(inner)} │`;
}

export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

// ── Data loading helpers ──────────────────────────────────────────────────

function listDirectories(path: string): { name: string; path: string }[] {
  if (!existsSync(path)) return [];
  try {
    return readdirSync(path)
      .map(name => ({ name, path: join(path, name) }))
      .filter(entry => {
        try { return statSync(entry.path).isDirectory(); }
        catch { return false; }
      });
  } catch { return []; }
}

function listFiles(path: string, suffix = ''): { name: string; path: string }[] {
  if (!existsSync(path)) return [];
  try {
    return readdirSync(path)
      .filter(name => !suffix || name.endsWith(suffix))
      .map(name => ({ name, path: join(path, name) }));
  } catch { return []; }
}

function safeTimestamp(value: unknown): string {
  if (!value) return 'n/a';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

function readJsonLines(path: string): { items: Record<string, unknown>[]; corruptCount: number } {
  if (!existsSync(path)) return { items: [], corruptCount: 0 };
  try {
    const content = readFileSync(path, 'utf8');
    const items: Record<string, unknown>[] = [];
    let corruptCount = 0;
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      try { items.push(JSON.parse(line)); }
      catch { corruptCount++; }
    }
    return { items, corruptCount };
  } catch { return { items: [], corruptCount: 0 }; }
}

function latestByTimestamp(
  entries: { name: string; path: string }[],
  valueForEntry: (entry: { name: string; path: string }) => string,
): { name: string; path: string } | null {
  return [...entries].sort((a, b) => {
    return valueForEntry(b).localeCompare(valueForEntry(a));
  })[0] || null;
}

// ── Worker helpers ────────────────────────────────────────────────────────

export interface WorkerInfo {
  id: number;
  meta: Record<string, unknown>;
  status: Record<string, unknown>;
  logLines: string[];
}

function readWorkers(omaDir: string): WorkerInfo[] {
  const teamDir = join(omaDir, 'team');
  return listWorkerDirs(teamDir).map(dir => {
    const id = Number.parseInt(dir.split('/worker-').pop() || '', 10);
    return {
      id,
      meta: readJsonSafe(join(dir, 'meta.json'), {}) as Record<string, unknown>,
      status: readJsonSafe(join(dir, 'status.json'), {}) as Record<string, unknown>,
      logLines: tailLines(join(dir, 'log.txt'), 4),
    };
  });
}

export interface WorkerSummary {
  total: number;
  running: number;
  done: number;
  errors: number;
}

function summarizeWorkerStates(workers: WorkerInfo[]): WorkerSummary {
  return {
    total: workers.length,
    running: workers.filter(w => ['running', 'in_progress'].includes(w.status?.status as string || w.status?.state as string || '')).length,
    done: workers.filter(w => ['done', 'completed', 'idle'].includes(w.status?.status as string || w.status?.state as string || '')).length,
    errors: workers.filter(w => ['error', 'failed', 'blocked'].includes(w.status?.status as string || w.status?.state as string || '')).length,
  };
}

// ── Session helpers ───────────────────────────────────────────────────────

export interface SessionBundle {
  id: string;
  dir: string;
  session: Record<string, unknown>;
  topology: Record<string, unknown>;
  panes: Record<string, unknown>[];
}

function readSessionBundle(omaDir: string, sessionId: string | null): SessionBundle | null {
  if (!sessionId) return null;
  const sessionDir = join(omaDir, 'sessions', sessionId);
  if (!existsSync(sessionDir)) return null;

  const session = readJsonSafe(join(sessionDir, 'session.json'), {}) as Record<string, unknown>;
  const topology = readJsonSafe(join(sessionDir, 'topology.json'), {}) as Record<string, unknown>;
  const panesRaw = readJsonSafe<unknown>(join(sessionDir, 'panes.json'), []);
  const panes: Record<string, unknown>[] = Array.isArray(panesRaw)
    ? panesRaw as Record<string, unknown>[]
    : Array.isArray((panesRaw as Record<string, unknown>)?.panes)
      ? ((panesRaw as Record<string, unknown>).panes as Record<string, unknown>[])
      : Object.entries(panesRaw as Record<string, unknown> || {}).map(([role, value]) => ({ role, ...(value as Record<string, unknown>) }));

  return { id: sessionId, dir: sessionDir, session, topology, panes };
}

function readKnownSessions(omaDir: string): SessionBundle[] {
  const sessionsDir = join(omaDir, 'sessions');
  return listDirectories(sessionsDir)
    .map(entry => readSessionBundle(omaDir, entry.name))
    .filter(Boolean) as SessionBundle[];
}

// ── Event helpers ─────────────────────────────────────────────────────────

export interface EventItem {
  seq: number;
  ts: string;
  kind: string;
  source: string;
  mode: string | null;
  command: string | null;
  tool_name: string | null;
  agent: string | null;
  pane_id: string | null;
  status: string | null;
  message: string | null;
}

export interface EventsResult {
  file: string | null;
  items: EventItem[];
  corruptCount: number;
}

function readRecentEvents(omaDir: string, sessionId: string | null, limit = DEFAULT_EVENT_LIMIT): EventsResult {
  const eventsDir = join(omaDir, 'events');
  const preferred = sessionId ? join(eventsDir, `${sessionId}.jsonl`) : null;

  let eventFile = preferred;
  if (!eventFile || !existsSync(eventFile)) {
    const latest = latestByTimestamp(listFiles(eventsDir, '.jsonl'), entry => {
      try { return statSync(entry.path).mtime.toISOString(); }
      catch { return ''; }
    });
    eventFile = latest?.path ?? null;
  }

  if (!eventFile) return { file: null, items: [], corruptCount: 0 };

  const parsed = readJsonLines(eventFile);
  const items: EventItem[] = parsed.items.slice(-limit).map((event, index) => ({
    seq: (event.seq as number) ?? index + 1,
    ts: safeTimestamp(event.ts),
    kind: (event.kind as string) ?? 'event',
    source: (event.source as string) ?? 'unknown',
    mode: (event.mode as string) ?? null,
    command: (event.command as string) ?? null,
    tool_name: (event.tool_name as string) ?? null,
    agent: (event.agent as string) ?? null,
    pane_id: (event.pane_id as string) ?? null,
    status: (event.status as string) ?? null,
    message: (event.message as string) ?? null,
  }));

  return { file: eventFile, items, corruptCount: parsed.corruptCount };
}

// ── Snapshot ──────────────────────────────────────────────────────────────

export interface HudSnapshot {
  omaDir: string;
  state: Record<string, unknown>;
  workers: WorkerInfo[];
  workerSummary: WorkerSummary;
  sessions: SessionBundle[];
  selectedSession: SessionBundle | null;
  events: EventsResult;
}

export function readHudSnapshot(opts: { omaDir?: string; sessionId?: string; eventLimit?: number } = {}): HudSnapshot {
  const omaDir = opts.omaDir || findOmaDir();
  const state = readJsonSafe(join(omaDir, 'state.json'), {}) as Record<string, unknown>;
  const workers = readWorkers(omaDir);
  const sessions = readKnownSessions(omaDir);
  const sessionId = opts.sessionId || (state?.session_id as string) || null;
  const selectedSession = readSessionBundle(omaDir, sessionId) || null;
  const events = readRecentEvents(omaDir, sessionId, opts.eventLimit);

  return { omaDir, state, workers, workerSummary: summarizeWorkerStates(workers), sessions, selectedSession, events };
}

// ── Rendering ─────────────────────────────────────────────────────────────

export function renderHud(snapshot: HudSnapshot): string {
  const mode = snapshot.state?.mode || 'n/a';
  const iteration = snapshot.state?.iteration ?? 'n/a';
  const maxIterations = snapshot.state?.max_iterations ?? '?';
  const task = snapshot.state?.task_description || snapshot.state?.task || 'n/a';
  const sessionLabel = snapshot.selectedSession?.id || 'state-only';

  const panes = snapshot.selectedSession?.panes || [];
  const paneSummary = panes.length > 0
    ? panes.map(p => `${p.role || p.kind || 'pane'}=${p.status || p.health || 'ok'}`).join(', ')
    : 'No pane metadata yet';

  const activityLines = snapshot.events.items.length > 0
    ? snapshot.events.items.map(e => `${e.ts} · ${e.kind}${e.message || e.command ? ` · ${e.message || e.command}` : ''}`)
    : snapshot.workers.flatMap(w =>
        w.logLines.length > 0
          ? w.logLines.map(l => `[worker-${w.id}] ${l}`)
          : [`[worker-${w.id}] (no output yet)`]
      );

  const lines = [
    boxTop('OMA HUD'),
    boxLine(`Mode: ${mode}   Iteration: ${iteration}/${maxIterations}`),
    boxLine(`Task: ${task}`),
    boxLine(`Session: ${sessionLabel}   Panes: ${paneSummary}`),
    boxMid(),
    boxLine(`Workers: ${snapshot.workerSummary.total} total   ${snapshot.workerSummary.running} running   ${snapshot.workerSummary.done} done   ${snapshot.workerSummary.errors} error`),
    boxMid(),
    boxLine('─ Activity ─'),
    ...(activityLines.length > 0 ? activityLines.map(l => boxLine(l)) : [boxLine('No recent activity')]),
    boxBot(),
  ];

  return lines.join('\n');
}

export function renderStatusline(snapshot: HudSnapshot): string {
  const mode = snapshot.state?.mode || 'n/a';
  const iteration = snapshot.state?.iteration ?? 'n/a';
  const maxIterations = snapshot.state?.max_iterations ?? '?';
  const task = clip(snapshot.state?.task_description || snapshot.state?.task || 'n/a', 24);
  return [
    'oma',
    `mode=${mode}`,
    `iter=${iteration}/${maxIterations}`,
    `task=${task}`,
    `workers=${snapshot.workerSummary.running}r/${snapshot.workerSummary.done}d/${snapshot.workerSummary.errors}e`,
  ].join(' | ');
}

export function renderWatchFrame(rendered: string): void {
  clearScreen();
  process.stdout.write(rendered + '\n');
}
