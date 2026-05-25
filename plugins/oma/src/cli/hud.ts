// plugins/oma/src/cli/hud.ts — HUD entry points: snapshot and watch
// Merged from cli/commands/hud.mjs + cli/commands/super-oma-hud.mjs +
// cli/commands/super-oma-statusline.mjs

import { readHudSnapshot, renderHud, renderStatusline, renderWatchFrame } from './ui.js';
import { resolveOmaDir } from './utils.js';

// ── HUD snapshot ─────────────────────────────────────────────────────────

export async function hudSnapshot(opts: { omaDir?: string; sessionId?: string } = {}): Promise<boolean> {
  const omaDir = opts.omaDir || resolveOmaDir();
  const snapshot = readHudSnapshot({ omaDir, sessionId: opts.sessionId });
  process.stdout.write(renderHud(snapshot) + '\n');
  return true;
}

// ── HUD watch loop ───────────────────────────────────────────────────────

export async function hudWatch(intervalMs = 1500, opts: { omaDir?: string; sessionId?: string } = {}): Promise<void> {
  const omaDir = opts.omaDir || resolveOmaDir();

  const cleanup = (): never => {
    process.stdout.write('\noma hud: exiting (Ctrl+C)\n');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Render once
  renderWatchFrame(renderHud(readHudSnapshot({ omaDir, sessionId: opts.sessionId })));

  const timer = setInterval(() => {
    try {
      renderWatchFrame(renderHud(readHudSnapshot({ omaDir, sessionId: opts.sessionId })));
    } catch (err) {
      process.stderr.write(`oma hud: render error: ${(err as Error).message}\n`);
    }
  }, intervalMs);

  await new Promise(() => { timer.ref(); });
}

// ── Statusline snapshot ──────────────────────────────────────────────────

export async function statuslineSnapshot(opts: { omaDir?: string; sessionId?: string } = {}): Promise<boolean> {
  const omaDir = opts.omaDir || resolveOmaDir();
  const snapshot = readHudSnapshot({ omaDir, sessionId: opts.sessionId });
  process.stdout.write(renderStatusline(snapshot) + '\n');
  return true;
}

export async function statuslineWatch(intervalMs = 1500, opts: { omaDir?: string; sessionId?: string } = {}): Promise<void> {
  const omaDir = opts.omaDir || resolveOmaDir();

  const cleanup = (): never => {
    process.stdout.write('\noma statusline: exiting (Ctrl+C)\n');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  process.stdout.write(renderStatusline(readHudSnapshot({ omaDir, sessionId: opts.sessionId })));

  const timer = setInterval(() => {
    try {
      process.stdout.write(`\r\x1b[2K${renderStatusline(readHudSnapshot({ omaDir, sessionId: opts.sessionId }))}`);
    } catch (err) {
      process.stderr.write(`\noma statusline: render error: ${(err as Error).message}\n`);
    }
  }, intervalMs);

  await new Promise(() => { timer.ref(); });
}
