// cli/utils.mjs — Shared utilities for OMA CLI (zero npm deps, ESM only)

import { existsSync, readFileSync, writeFileSync, openSync, fsyncSync, renameSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';

// ── OMA_DIR resolution ────────────────────────────────────────────────────────

/**
 * Resolve OMA_DIR by checking the OMA_DIR env var first (for tests),
 * then walking up from cwd for .oma/, falling back to $HOME/.oma.
 * @returns {string} Absolute path to .oma directory
 */
export function resolveOmaDir() {
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
    if (parent === dir) break; // reached root
    dir = parent;
  }
  return join(process.env.HOME || '/tmp', '.oma');
}

/**
 * Resolve a path relative to OMA_DIR, creating the directory if absent.
 * @param {string} rel  Relative path within .oma
 * @returns {string}     Absolute path
 */
export function resolveInOmaDir(rel) {
  const omaDir = resolveOmaDir();
  const full = resolve(omaDir, rel);
  mkdirSync(dirname(full), { recursive: true });
  return full;
}

// ── Atomic JSON write ────────────────────────────────────────────────────────

/**
 * Write data to a JSON file atomically: write to temp file in the same
 * directory, fsync, then rename. Safe against concurrent writes.
 * @param {string} path  Target file path
 * @param {unknown} data  Serializable data
 */
export function atomicWrite(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp.' + process.pid + '.' + Date.now();
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  try {
    fsyncSync(openSync(tmp, 'r+'));
  } catch {
    // fsync may not be available on all filesystems (e.g. tmpfs, network mounts);
    // proceed anyway — rename is still atomic on POSIX.
  }
  renameSync(tmp, path);
}

/**
 * Read a JSON file safely. Returns fallback on missing or corrupt files.
 * @param {string} path
 * @param {unknown} fallback
 * @returns {unknown}
 */
export function readJsonSafe(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
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

/**
 * Pad a string to a given width, left-aligned.
 * @param {string} s
 * @param {number} w
 * @returns {string}
 */
export function pad(s, w) {
  return String(s).padEnd(w);
}

// ── Per-worker directory helpers ─────────────────────────────────────────────

/**
 * List all worker-{n} subdirectories under a team dir.
 * @param {string} teamDir  Path to .oma/team
 * @returns {string[]} Sorted list of worker directory paths
 */
export function listWorkerDirs(teamDir) {
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

/**
 * Get the next available worker ID under a team dir.
 * @param {string} teamDir
 * @returns {number}
 */
export function nextWorkerId(teamDir) {
  const dirs = listWorkerDirs(teamDir);
  if (dirs.length === 0) return 1;
  return dirs.reduce((max, d) => {
    const n = parseInt(d.split('/worker-').pop());
    return n > max ? n : max;
  }, 0) + 1;
}

/**
 * Check if a PID is alive using kill -0.
 * @param {number} pid
 * @returns {boolean}
 */
export function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the last N lines from a file.
 * @param {string} path
 * @param {number} n
 * @returns {string[]}
 */
export function tailLines(path, n = 3) {
  if (!existsSync(path)) return [];
  try {
    const content = readFileSync(path, 'utf8');
    const lines = content.split('\n').filter(l => l.length > 0);
    return lines.slice(-n);
  } catch {
    return [];
  }
}
