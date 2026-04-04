#!/usr/bin/env node
// cli/workers/wrapper.mjs — Worker entry point
// Spawns: claude-code --print --dangerously-skip-permissions --no-session-persistence "<task>"
// Writes: meta.json, status.json, streams stdout/stderr to log.txt
//
// Usage: wrapper.mjs --id <n> --oma-dir <path> --task <escaped-task>

import { spawn } from 'child_process';
import { mkdirSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { atomicWrite } from '../utils.mjs';

// ── Argument parsing ──────────────────────────────────────────────────────────

const args = {};
for (let i = 0; i < process.argv.length; i++) {
  const tok = process.argv[i];
  if (tok === '--id' && i + 1 < process.argv.length)       args.id = process.argv[++i];
  else if (tok === '--oma-dir' && i + 1 < process.argv.length) args.omaDir = process.argv[++i];
  else if (tok === '--task' && i + 1 < process.argv.length)   args.task = process.argv[++i];
}

const id = parseInt(args.id, 10);
const omaDir = args.omaDir;
const task = args.task;

if (!id || !omaDir || !task) {
  process.stderr.write(
    `wrapper: usage: wrapper.mjs --id <n> --oma-dir <path> --task "<task>"\n` +
    `  id=${id}, omaDir=${omaDir}, task=${task}\n`
  );
  process.exit(1);
}

const workerDir = join(omaDir, 'team', `worker-${id}`);
mkdirSync(workerDir, { recursive: true });

const logPath = join(workerDir, 'log.txt');
const logStream = createWriteStream(logPath, { flags: 'w' });

// Helper: write a line to log and also to status.json activity feed
function logLine(line) {
  logStream.write(line + '\n');
}

// Initial status
const startedAt = new Date().toISOString();
atomicWrite(join(workerDir, 'status.json'), {
  status: 'starting',
  started_at: startedAt,
  spawned_at: startedAt,
});

// ── Spawn claude-code ──────────────────────────────────────────────────────────

const CLAUDE_FLAGS = [
  '--print',
  '--dangerously-skip-permissions',
  '--no-session-persistence',
];

logLine(`[worker-${id}] spawning: claude-code ${CLAUDE_FLAGS.join(' ')} "<task>"`);
logLine(`[worker-${id}] started at ${startedAt}`);

const child = spawn('claude-code', [...CLAUDE_FLAGS, task], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env },
  cwd: process.cwd(),
});

atomicWrite(join(workerDir, 'status.json'), {
  status: 'running',
  pid: child.pid,
  started_at: startedAt,
  spawned_at: startedAt,
});

child.stdout.on('data', d => {
  const text = d.toString();
  process.stdout.write(text); // relay to stdout so parent sees it
  logStream.write(text);
});

child.stderr.on('data', d => {
  const text = d.toString();
  process.stderr.write(text);
  logStream.write(text);
});

child.on('close', (code) => {
  const endedAt = new Date().toISOString();
  logLine(`[worker-${id}] exited with code ${code} at ${endedAt}`);

  const exitStatus = code === 0 ? 'done' : 'error';
  atomicWrite(join(workerDir, 'status.json'), {
    status: exitStatus,
    pid: child.pid,
    started_at: startedAt,
    exited_at: endedAt,
    exit_code: code,
  });

  logStream.end();
});

child.on('error', (err) => {
  logLine(`[worker-${id}] ERROR: ${err.message}`);
  atomicWrite(join(workerDir, 'status.json'), {
    status: 'error',
    pid: null,
    started_at: startedAt,
    error: err.message,
    errored_at: new Date().toISOString(),
  });
  logStream.end();
});

// Keep the wrapper alive until the child exits
process.on('SIGTERM', () => {
  try { process.kill(child.pid, 'SIGTERM'); } catch { /* ignore */ }
});

process.on('SIGINT', () => {
  try { process.kill(child.pid, 'SIGINT'); } catch { /* ignore */ }
});
