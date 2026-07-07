// plugins/oma/src/cli/doctor.ts — Offline diagnostics for OMA CLI
// Ported from cli/commands/doctor.mjs + cli/commands/super-doctor.mjs

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { findOmaDir } from '../utils.js';

interface DoctorOpts {
  omaDir?: string;
  json?: boolean;
}

// ── Offline diagnostics ───────────────────────────────────────────────────

export async function doctorOffline(opts: DoctorOpts = {}): Promise<number> {
  const omaDir = opts.omaDir || findOmaDir();
  const checks: Record<string, unknown>[] = [];

  // OMA_DIR
  checks.push({ check: 'oma_dir', ok: existsSync(omaDir), detail: omaDir });

  // State file
  const statePath = join(omaDir, 'state.json');
  checks.push({ check: 'state_file', ok: existsSync(statePath), detail: statePath });

  // Auggie CLI
  let hasAuggie = false;
  try { execSync('which auggie', { stdio: 'ignore' }); hasAuggie = true; } catch { /* not found */ }
  checks.push({ check: 'auggie_cli', ok: hasAuggie, detail: 'which auggie' });

  // Tmux
  let hasTmuxBin = false;
  try { execSync('which tmux', { stdio: 'ignore' }); hasTmuxBin = true; } catch { /* not found */ }
  checks.push({ check: 'tmux', ok: hasTmuxBin, detail: 'which tmux' });

  // Node version
  const nodeVersion = process.version;
  checks.push({ check: 'node_version', ok: true, detail: nodeVersion });

  const allOk = checks.every(c => c.ok);

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: allOk, checks }, null, 2) + '\n');
  } else {
    process.stdout.write('OMA Doctor\n');
    process.stdout.write('─'.repeat(40) + '\n');
    for (const c of checks) {
      process.stdout.write(`${c.ok ? '✓' : '✗'} ${(c.check as string).padEnd(20)} ${c.detail}\n`);
    }
  }

  return allOk ? 0 : 1;
}

export async function doctorInstall(_opts: DoctorOpts = {}): Promise<number> {
  process.stdout.write('doctor install: verifying build environment...\n');
  try {
    execSync('npm run build', { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' });
    process.stdout.write('doctor install: build OK\n');
    return 0;
  } catch {
    process.stderr.write('doctor install: build failed\n');
    return 1;
  }
}

export async function doctorCi(_opts: DoctorOpts = {}): Promise<number> {
  process.stdout.write('doctor ci: running CI checks...\n');
  let exitCode = 0;
  try {
    execSync('npm run typecheck', { stdio: 'inherit' });
    process.stdout.write('typecheck: OK\n');
  } catch { process.stderr.write('typecheck: FAILED\n'); exitCode = 1; }
  try {
    execSync('npm test', { stdio: 'inherit' });
    process.stdout.write('tests: OK\n');
  } catch { process.stderr.write('tests: FAILED\n'); exitCode = 1; }
  return exitCode;
}
