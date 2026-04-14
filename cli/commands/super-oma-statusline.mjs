// cli/commands/super-oma-statusline.mjs — compact single-line session status

import { readSuperOmaSnapshot, renderSuperOmaStatusline } from './super-oma-ui.mjs';

let statuslineTimer = null;
let statuslineRunning = false;

export async function superOmaStatuslineSnapshot(opts = {}) {
  process.stdout.write(renderSuperOmaStatusline(readSuperOmaSnapshot(opts)) + '\n');
  return true;
}

export async function superOmaStatuslineWatch(intervalMs = 1500, opts = {}) {
  const cleanup = () => {
    if (statuslineTimer) {
      clearInterval(statuslineTimer);
      statuslineTimer = null;
    }
    if (statuslineRunning) {
      process.stdout.write('\nsuper-oma statusline: exiting (Ctrl+C)\n');
      statuslineRunning = false;
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  statuslineRunning = true;
  process.stdout.write(renderSuperOmaStatusline(readSuperOmaSnapshot(opts)));

  statuslineTimer = setInterval(() => {
    if (!statuslineRunning) return;
    try {
      process.stdout.write(`\r\x1b[2K${renderSuperOmaStatusline(readSuperOmaSnapshot(opts))}`);
    } catch (error) {
      process.stderr.write(`\nsuper-oma statusline: render error: ${error.message}\n`);
    }
  }, intervalMs);

  await new Promise(() => {});
}
