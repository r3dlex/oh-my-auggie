// cli/commands/team.mjs — oma team subcommand: spawn, status, shutdown

import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';
import { atomicWrite, readJsonSafe, isPidAlive, listWorkerDirs, nextWorkerId } from '../utils.mjs';

const TEAM_DIR_VERSION = '1'; // bump to invalidate stale dirs on format change

// ── Stale worker detection ────────────────────────────────────────────────────

/**
 * Scan teamDir for stale workers (parent PID no longer alive).
 * @param {string} teamDir
 * @returns {{ id: number, dir: string, meta: object }[]}
 */
export function detectStaleWorkers(teamDir) {
  const stale = [];
  for (const dir of listWorkerDirs(teamDir)) {
    const meta = readJsonSafe(join(dir, 'meta.json'), null);
    if (!meta) continue;
    const status = readJsonSafe(join(dir, 'status.json'), null);
    if (!status) continue;
    const pid = parseInt(status.pid, 10);
    if (isNaN(pid) || !isPidAlive(pid)) {
      stale.push({ id: meta.id, dir, meta });
    }
  }
  return stale;
}

// ── team spawn ──────────────────────────────────────────────────────────────

/**
 * Spawn N worker processes, each running the given task.
 * @param {number} N
 * @param {string} task
 * @param {{ force?: boolean, omaDir: string }} opts
 */
export async function teamSpawn(N, task, opts = {}) {
  const { force = false, omaDir } = opts;
  const teamDir = join(omaDir, 'team');

  mkdirSync(teamDir, { recursive: true });

  // Check claude-code availability
  const ccCheck = spawn('which', ['claude-code'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise(resolve => { ccCheck.on('close', resolve); });
  if (ccCheck.exitCode !== 0) {
    process.stderr.write(
      'oma: error: claude-code not found in $PATH.\n' +
      'oma: Install instructions:\n' +
      'oma:   npm install -g @anthropic-ai/claude-code\n' +
      'oma:   # or: brew install claude-code\n' +
      'oma: Workers require Claude Code CLI to execute tasks.\n'
    );
    process.exit(2);
  }

  // Detect stale workers
  const stale = detectStaleWorkers(teamDir);
  if (stale.length > 0) {
    process.stderr.write('oma: stale workers detected (parent process gone):\n');
    for (const w of stale) {
      process.stderr.write(`oma:   worker-${w.id} (parent PID ${w.meta.parent_pid}, last seen ${w.meta.spawned_at})\n`);
    }
    if (!force) {
      process.stderr.write('oma: use --force to proceed anyway, or `oma team shutdown --stale` to clean up.\n');
      process.exit(1);
    }
    process.stderr.write('oma: proceeding with --force...\n');
  }

  const startId = nextWorkerId(teamDir);
  const parentPid = process.pid;

  for (let i = 0; i < N; i++) {
    const id = startId + i;
    const workerDir = join(teamDir, `worker-${id}`);
    mkdirSync(workerDir, { recursive: true });

    // meta.json — static worker metadata
    const meta = {
      id,
      parent_pid: parentPid,
      spawned_at: new Date().toISOString(),
      task: task.length > 200 ? task.substring(0, 200) + '…' : task,
      task_full: task,
      version: TEAM_DIR_VERSION,
    };
    atomicWrite(join(workerDir, 'meta.json'), meta);

    // Spawn the worker wrapper via Node.js (worker-wrapper.mjs is the entry point
    // that itself spawns claude-code; we use a Node.js intermediate so that
    // SIGTERM propagates correctly and we can stream stdout/stderr to log.txt).
    // Spawn detached: worker-wrapper.mjs handles its own I/O (writes to log.txt).
    // detached=true + stdio=ignore + unref() ensures parent returns immediately
    // without waiting for the child to exit.
    const workerProcess = spawn(
      process.execPath,
      [
        join(dirname(import.meta.filename), '..', 'workers', 'wrapper.mjs'),
        '--id', String(id),
        '--oma-dir', omaDir,
        '--task', task,
      ],
      {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'],
        env: { ...process.env },
      }
    );

    // Unref so parent exits even if child is still running
    workerProcess.unref();

    // status.json — written immediately; worker updates it on done/error via wrapper
    atomicWrite(join(workerDir, 'status.json'), {
      status: 'running',
      pid: workerProcess.pid,
      started_at: new Date().toISOString(),
    });

    process.stdout.write(`oma: spawned worker-${id} (PID ${workerProcess.pid})\n`);
  }

  // Aggregated team status file (parent-written, sequential — no race)
  atomicWrite(join(teamDir, 'status.json'), {
    spawned_at: new Date().toISOString(),
    parent_pid: parentPid,
    workers: Array.from({ length: N }, (_, i) => startId + i),
  });

  process.stdout.write(`oma: team of ${N} worker(s) spawned.\n`);
  process.stdout.write(`oma: track with: oma team status [--json]\n`);
}

// ── team status ─────────────────────────────────────────────────────────────

/**
 * Display team status (human or JSON).
 * @param {{ json?: boolean, omaDir: string }} opts
 * @returns {Promise<boolean>} true if team exists and is readable
 */
export async function teamStatus(opts = {}) {
  const { json = false, omaDir } = opts;
  const teamDir = join(omaDir, 'team');

  if (!existsSync(teamDir)) {
    if (json) {
      process.stdout.write(JSON.stringify({ ok: true, workers: [] }, null, 2) + '\n');
    } else {
      process.stdout.write('oma team: no active team (no .oma/team/ directory)\n');
    }
    return true;
  }

  const workerDirs = listWorkerDirs(teamDir);
  const workers = [];

  for (const dir of workerDirs) {
    const id = parseInt(dir.split('/worker-').pop(), 10);
    const meta = readJsonSafe(join(dir, 'meta.json'), {});
    const status = readJsonSafe(join(dir, 'status.json'), {});
    const logLines = [];

    try {
      const logPath = join(dir, 'log.txt');
      if (existsSync(logPath)) {
        const content = readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(l => l.length > 0);
        logLines.push(...lines.slice(-3));
      }
    } catch { /* ignore */ }

    workers.push({
      id,
      status: status.status || 'unknown',
      pid: status.pid || null,
      parent_pid: meta.parent_pid || null,
      spawned_at: meta.spawned_at || null,
      log_lines: logLines,
    });
  }

  if (json) {
    process.stdout.write(JSON.stringify({ ok: true, workers }, null, 2) + '\n');
    return true;
  }

  if (workers.length === 0) {
    process.stdout.write('oma team: no active workers\n');
    return true;
  }

  const running = workers.filter(w => w.status === 'running').length;
  const done = workers.filter(w => w.status === 'done').length;
  const errors = workers.filter(w => w.status === 'error').length;

  process.stdout.write(`oma team — ${workers.length} worker(s): ${running} running, ${done} done, ${errors} error\n`);
  process.stdout.write('\n');

  for (const w of workers) {
    const badge = w.status === 'running' ? '[running]'
      : w.status === 'done' ? '[done]   '
      : w.status === 'error' ? '[ERROR]  '
      : '[unknown]';
    process.stdout.write(`  worker-${w.id}  ${badge}  PID=${w.pid || 'n/a'}\n`);
    for (const line of w.log_lines) {
      process.stdout.write(`            ${line.length > 72 ? line.substring(0, 69) + '...' : line}\n`);
    }
  }

  // Check for stale workers
  const stale = detectStaleWorkers(teamDir);
  if (stale.length > 0) {
    process.stdout.write('\noma team: WARNING: stale workers detected (parent PID gone): ');
    process.stdout.write(stale.map(w => `worker-${w.id}`).join(', ') + '\n');
  }

  return true;
}

// ── team shutdown ────────────────────────────────────────────────────────────

/**
 * Shutdown all workers and clean up directories.
 * @param {{ stale?: boolean, omaDir: string }} opts
 * @returns {Promise<boolean>}
 */
export async function teamShutdown(opts = {}) {
  const { stale = false, omaDir } = opts;
  const teamDir = join(omaDir, 'team');

  if (!existsSync(teamDir)) {
    process.stdout.write('oma team shutdown: no team directory found\n');
    return true;
  }

  const workerDirs = listWorkerDirs(teamDir);
  let terminated = 0;

  for (const dir of workerDirs) {
    const status = readJsonSafe(join(dir, 'status.json'), {});
    const pid = parseInt(status.pid, 10);

    if (!isNaN(pid)) {
      try {
        process.kill(pid, 0); // check alive
        process.kill(pid, 'SIGTERM');
        terminated++;
      } catch {
        // already dead — either way, clean up
      }
    }

    // Remove worker directory
    try {
      const files = ['status.json', 'meta.json', 'log.txt'];
      for (const f of files) {
        try { unlinkSync(join(dir, f)); } catch { /* ignore */ }
      }
      // Remove dir (rmdir only if empty; we already tried unlink)
      try { rmdirSync(dir); } catch { /* ignore */ }
    } catch { /* ignore */ }
  }

  // Remove team-level files
  try { unlinkSync(join(teamDir, 'status.json')); } catch { /* ignore */ }

  // Remove team dir (ignore failure if not empty)
  try { rmdirSync(teamDir); } catch { /* ignore */ }

  if (terminated > 0) {
    process.stdout.write(`oma team shutdown: sent SIGTERM to ${terminated} worker(s)\n`);
  }
  process.stdout.write('oma team shutdown: done\n');
  return true;
}
