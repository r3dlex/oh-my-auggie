// cli/commands/hud.mjs — oma hud subcommand: snapshot and watch modes

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { resolveOmaDir, readJsonSafe, listWorkerDirs, tailLines } from '../utils.mjs';

const WIDTH = 80;

// ── ANSI helpers ─────────────────────────────────────────────────────────────

function hbar(char = '─', width = WIDTH - 4) {
  return char.repeat(width);
}

function boxTop(title, width = WIDTH) {
  const inner = width - 2;
  const label = ` OMA HUD `;
  const left = Math.floor((inner - label.length) / 2);
  const right = inner - left - label.length;
  return '┌' + hbar('─', left) + label + hbar('─', right) + '┐';
}

function boxMid(width = WIDTH) {
  return '├' + hbar('─', width - 2) + '┤';
}

function boxBot(width = WIDTH) {
  return '└' + hbar('─', width - 2) + '┘';
}

function boxLine(content, width = WIDTH) {
  const inner = width - 4;
  const text = content.length > inner ? content.substring(0, inner - 3) + '...' : content;
  return '│ ' + text.padEnd(inner) + ' │';
}

function clearScreen() {
  // CSI Erase Display + CSI Cursor Home
  process.stdout.write('\x1b[2J\x1b[H');
}

// ── HUD snapshot ────────────────────────────────────────────────────────────

/**
 * Render a one-shot HUD snapshot.
 * @param {{ omaDir?: string }} opts
 * @returns {Promise<boolean>}
 */
export async function hudSnapshot(opts = {}) {
  const omaDir = opts.omaDir || resolveOmaDir();
  const state = readJsonSafe(join(omaDir, 'state.json'), null);
  const teamDir = join(omaDir, 'team');
  const workers = listWorkerDirs(teamDir).map(dir => {
    const id = parseInt(dir.split('/worker-').pop(), 10);
    const status = readJsonSafe(join(dir, 'status.json'), {});
    const logLines = tailLines(join(dir, 'log.txt'), 3);
    return { id, status, logLines };
  });

  const mode = state?.mode || 'n/a';
  const iteration = state?.iteration || 'n/a';
  const maxIter = state?.max_iterations || '?';
  const task = state?.task_description || state?.task || 'n/a';
  const running = workers.filter(w => w.status?.status === 'running').length;
  const done = workers.filter(w => w.status?.status === 'done').length;
  const errors = workers.filter(w => w.status?.status === 'error').length;

  const lines = [
    boxTop('OMA HUD'),
    boxLine(`Mode: ${String(mode).padEnd(12)}  Iteration: ${iteration}/${maxIter}`),
    boxLine(`Task: ${task}`),
    boxMid(),
    boxLine(`Workers: ${workers.length} total   ${running} running  ${done} done  ${errors} error`),
    boxLine(`Status command: oma team status [--json]`),
    boxMid(),
    boxLine('─ Activity ─'),
    ...workers.flatMap(w => [
      ...(w.logLines.length > 0
        ? w.logLines.map(l => boxLine(`[worker-${w.id}] ${l}`))
        : [boxLine(`[worker-${w.id}] (no output yet)`)])
    ]),
    boxBot(),
  ];

  process.stdout.write(lines.join('\n') + '\n');
  return true;
}

// ── HUD watch loop ──────────────────────────────────────────────────────────

let _watchTimer = null;
let _watchRunning = false;

/**
 * Start the HUD watch loop, re-rendering every `intervalMs` milliseconds.
 * Exits cleanly on SIGINT/SIGTERM.
 * @param {number} intervalMs
 * @param {{ omaDir?: string }} opts
 */
export async function hudWatch(intervalMs = 1500, opts = {}) {
  const omaDir = opts.omaDir || resolveOmaDir();

  const cleanup = () => {
    if (_watchTimer) { clearInterval(_watchTimer); _watchTimer = null; }
    if (_watchRunning) {
      process.stdout.write('\noma hud: exiting (Ctrl+C)\n');
      _watchRunning = false;
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  _watchRunning = true;

  // Render once immediately
  await hudSnapshot({ omaDir });

  _watchTimer = setInterval(async () => {
    if (!_watchRunning) return;
    try {
      await hudSnapshot({ omaDir });
    } catch (err) {
      process.stderr.write(`oma hud: render error: ${err.message}\n`);
    }
  }, intervalMs);

  // Keep process alive (watch loop handles cleanup via signal listeners)
  await new Promise(() => {});
}
