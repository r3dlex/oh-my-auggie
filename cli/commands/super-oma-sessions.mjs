// cli/commands/super-oma-sessions.mjs — session list + inspector surfaces

import {
  readSuperOmaSnapshot,
  renderSuperOmaSessionInspector,
  renderSuperOmaSessionsList,
  renderWatchFrame,
} from './super-oma-ui.mjs';

let inspectTimer = null;
let inspectRunning = false;

export async function superOmaSessionsList(opts = {}) {
  process.stdout.write(renderSuperOmaSessionsList(readSuperOmaSnapshot(opts)) + '\n');
  return true;
}

export async function superOmaSessionInspect(opts = {}) {
  process.stdout.write(renderSuperOmaSessionInspector(readSuperOmaSnapshot(opts)) + '\n');
  return true;
}

export async function superOmaSessionInspectWatch(intervalMs = 1500, opts = {}) {
  const cleanup = () => {
    if (inspectTimer) {
      clearInterval(inspectTimer);
      inspectTimer = null;
    }
    if (inspectRunning) {
      process.stdout.write('\nsuper-oma sessions inspect: exiting (Ctrl+C)\n');
      inspectRunning = false;
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  inspectRunning = true;

  renderWatchFrame(renderSuperOmaSessionInspector(readSuperOmaSnapshot(opts)));
  inspectTimer = setInterval(() => {
    if (!inspectRunning) return;
    try {
      renderWatchFrame(renderSuperOmaSessionInspector(readSuperOmaSnapshot(opts)));
    } catch (error) {
      process.stderr.write(`super-oma sessions inspect: render error: ${error.message}\n`);
    }
  }, intervalMs);

  await new Promise(() => {});
}
