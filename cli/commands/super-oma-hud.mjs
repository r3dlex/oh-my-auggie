// cli/commands/super-oma-hud.mjs — super-oma HUD surface

import { readSuperOmaSnapshot, renderSuperOmaHud, renderWatchFrame } from './super-oma-ui.mjs';

let watchTimer = null;
let watchRunning = false;

export async function superOmaHudSnapshot(opts = {}) {
  const snapshot = readSuperOmaSnapshot(opts);
  process.stdout.write(renderSuperOmaHud(snapshot) + '\n');
  return true;
}

export async function superOmaHudWatch(intervalMs = 1500, opts = {}) {
  const cleanup = () => {
    if (watchTimer) {
      clearInterval(watchTimer);
      watchTimer = null;
    }
    if (watchRunning) {
      process.stdout.write('\nsuper-oma hud: exiting (Ctrl+C)\n');
      watchRunning = false;
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  watchRunning = true;

  renderWatchFrame(renderSuperOmaHud(readSuperOmaSnapshot(opts)));
  watchTimer = setInterval(() => {
    if (!watchRunning) return;
    try {
      renderWatchFrame(renderSuperOmaHud(readSuperOmaSnapshot(opts)));
    } catch (error) {
      process.stderr.write(`super-oma hud: render error: ${error.message}\n`);
    }
  }, intervalMs);

  await new Promise(() => {});
}
