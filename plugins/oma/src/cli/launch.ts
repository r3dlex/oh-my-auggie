// plugins/oma/src/cli/launch.ts — oma TUI: launch auggie in tmux with HUD pane
// MVP: creates a named tmux session, splits into auggie (top) + HUD status (bottom)

import { basename } from 'node:path';
import { hasTmux, runTmux } from './tmux.js';
import { findOmaDir } from '../utils.js';

// ── Exports ─────────────────────────────────────────────────────────────────

export interface LaunchOpts {
  omaDir?: string;
  intervalMs?: number;
}

/**
 * Build a unique tmux session name from the current working directory.
 * Format: oma-<dirname>-<pid>
 */
export function buildOmaSessionName(): string {
  const cwd = process.cwd();
  const dir = basename(cwd) || 'unknown';
  return `oma-${dir}-${process.pid}`;
}

/**
 * Build the shell command for the HUD watch pane.
 * Uses the current node binary and entry script.
 * OMA state directory is passed via OMA_DIR env var so the child process
 * can resolve it without needing a --oma-dir flag on oma.ts.
 */
export function buildHudCommand(opts: { omaDir?: string; intervalMs?: number } = {}): string {
  const omaDir = opts.omaDir || findOmaDir();
  const interval = opts.intervalMs || 2000;
  const entryPath = process.argv[1];
  const quoted = entryPath.includes(' ') ? `'${entryPath}'` : entryPath;
  // Pass OMA_DIR as env var prefix, then exec node
  return `OMA_DIR='${omaDir}' exec ${quoted} hud --watch --interval-ms ${interval}`;
}

/**
 * Check whether tmux is available on this system.
 */
export function isTmuxAvailable(): boolean {
  return hasTmux();
}

/**
 * Launch auggie in a tmux session with a HUD status pane.
 *
 * Creates:
 *   - tmux session named `oma-<basename>-<pid>`
 *   - Pane 0 (top, ~80%): interactive `auggie` shell
 *   - Pane 1 (bottom, ~6 lines): `oma hud --watch` via node
 *
 * Attaches to the session. When auggie exits or user detaches, cleans up.
 */
export async function launchAuggie(opts: LaunchOpts = {}): Promise<number> {
  const omaDir = opts.omaDir || findOmaDir();

  // ── Preflight ───────────────────────────────────────────────────────────
  if (!isTmuxAvailable()) {
    process.stderr.write(
      'oma: tmux is required for the TUI launcher.\n' +
      '  Install tmux (brew install tmux) or run auggie directly.\n' +
      '  Or use: oma <command> for subcommands (version, team, hud, etc.)\n'
    );
    return 1;
  }

  const sessionName = buildOmaSessionName();
  const hudCommand = buildHudCommand({ omaDir, intervalMs: opts.intervalMs });

  // ── Create new tmux session (detached) ──────────────────────────────────
  const createResult = runTmux(['new-session', '-d', '-s', sessionName, '-x', '120', '-y', '40']);
  if (createResult.status !== 0) {
    process.stderr.write(`oma: failed to create tmux session.\n`);
    return 1;
  }

  // ── Split the bottom HUD pane ───────────────────────────────────────────
  const splitResult = runTmux([
    'split-window', '-v', '-l', '6', '-t', `${sessionName}:0.0`,
    '-c', process.cwd(),
    hudCommand,
  ]);
  if (splitResult.status !== 0) {
    // HUD pane failed; continue without it
    process.stderr.write('oma: warning — could not create HUD pane (continuing without status).\n');
  }

  // ── Send `auggie` command to the main pane ──────────────────────────────
  const sendResult = runTmux(['send-keys', '-t', `${sessionName}:0.0`, 'auggie', 'Enter']);
  if (sendResult.status !== 0) {
    process.stderr.write('oma: failed to launch auggie in tmux pane.\n');
    runTmux(['kill-session', '-t', sessionName]);
    return 1;
  }

  // ── Attach to the session ───────────────────────────────────────────────
  // When auggie exits or user detaches (Ctrl+B d), this returns.
  runTmux(['attach-session', '-t', sessionName], { stdio: 'inherit' });

  // ── Cleanup: kill the tmux session ──────────────────────────────────────
  runTmux(['kill-session', '-t', sessionName]);

  return 0;
}
