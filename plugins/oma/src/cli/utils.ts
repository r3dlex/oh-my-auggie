// plugins/oma/src/cli/utils.ts — Shared utilities for OMA CLI (zero npm deps)

import {
  existsSync, readFileSync, writeFileSync, openSync, fsyncSync,
  renameSync, mkdirSync, readdirSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';

// ── OMA_DIR resolution ──────────────────────────────────────────────────────

export function resolveOmaDir(): string {
  if (process.env.OMA_DIR) {
    const abs = resolve(process.env.OMA_DIR);
    mkdirSync(abs, { recursive: true });
    return abs;
  }
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, '.oma');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.env.HOME || '/tmp', '.oma');
}

export function resolveInOmaDir(rel: string): string {
  const omaDir = resolveOmaDir();
  const full = resolve(omaDir, rel);
  mkdirSync(dirname(full), { recursive: true });
  return full;
}

// ── Atomic JSON I/O ─────────────────────────────────────────────────────────

export function atomicWrite(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp.' + process.pid + '.' + Date.now();
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  try {
    openSync(tmp, 'r+');
  } catch {
    // non-fatal on tmpfs / network mounts
  }
  renameSync(tmp, path);
}

export function readJsonSafe<T = unknown>(path: string, fallback: T | null = null): T | null {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

// ── ANSI box drawing ────────────────────────────────────────────────────────

const BOX_H  = '─';
const BOX_TL = '┌';
const BOX_TR = '┐';
const BOX_BL = '└';
const BOX_BR = '┘';
const BOX_V  = '│';
const BOX_VL = '├';
const BOX_VR = '┤';

export function pad(s: unknown, w: number): string {
  return String(s).padEnd(w);
}

// ── Worker directory helpers ────────────────────────────────────────────────

export function listWorkerDirs(teamDir: string): string[] {
  if (!existsSync(teamDir)) return [];
  try {
    return readdirSync(teamDir)
      .filter(n => /^worker-\d+$/.test(n))
      .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
      .map(n => join(teamDir, n));
  } catch {
    return [];
  }
}

export function nextWorkerId(teamDir: string): number {
  const dirs = listWorkerDirs(teamDir);
  if (dirs.length === 0) return 1;
  return dirs.reduce((max, d) => {
    const n = parseInt(d.split('/worker-').pop()!);
    return n > max ? n : max;
  }, 0) + 1;
}

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function tailLines(path: string, n = 3): string[] {
  if (!existsSync(path)) return [];
  try {
    const content = readFileSync(path, 'utf8');
    const lines = content.split('\n').filter(l => l.length > 0);
    return lines.slice(-n);
  } catch {
    return [];
  }
}
