// cli/commands/doctor.mjs — oma doctor subcommand: offline, install, ci modes

import { spawn } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { resolveOmaDir, readJsonSafe, listWorkerDirs, tailLines } from '../utils.mjs';

// ── doctorOffline: reads state files directly, no Auggie required ────────────

/**
 * Run offline diagnostics: read .oma/state.json and worker logs.
 * @param {{ omaDir?: string, json?: boolean }} opts
 * @returns {Promise<number>} exit code: 0=ok, 1=partial, 2=critical missing
 */
export async function doctorOffline(opts = {}) {
  const { omaDir = resolveOmaDir(), json = false } = opts;
  const issues = [];
  const warnings = [];

  const stateFile = join(omaDir, 'state.json');
  const state = readJsonSafe(stateFile, null);

  if (!existsSync(stateFile)) {
    issues.push({ severity: 'error', msg: 'state.json not found' });
  } else if (!state) {
    issues.push({ severity: 'error', msg: 'state.json is corrupt or empty' });
  }

  const teamDir = join(omaDir, 'team');
  const workers = listWorkerDirs(teamDir).map(dir => {
    const id = parseInt(dir.split('/worker-').pop(), 10);
    const meta = readJsonSafe(join(dir, 'meta.json'), null);
    const status = readJsonSafe(join(dir, 'status.json'), null);
    const logLines = tailLines(join(dir, 'log.txt'), 5);
    return { id, meta, status, logLines };
  });

  const running = workers.filter(w => w.status?.status === 'running').length;
  const done = workers.filter(w => w.status?.status === 'done').length;
  const errors = workers.filter(w => w.status?.status === 'error').length;

  if (workers.length === 0) {
    warnings.push({ severity: 'warn', msg: 'no active team (no .oma/team/ directory)' });
  }

  if (json) {
    process.stdout.write(JSON.stringify({
      oma_dir: omaDir,
      state_exists: existsSync(stateFile),
      state_parsable: state !== null,
      mode: state?.mode || null,
      iteration: state?.iteration || null,
      max_iterations: state?.max_iterations || null,
      task_description: state?.task_description || null,
      workers: workers.map(w => ({
        id: w.id,
        status: w.status?.status || null,
        pid: w.status?.pid || null,
        spawned_at: w.meta?.spawned_at || null,
        last_log: w.logLines.length > 0 ? w.logLines[w.logLines.length - 1] : null,
      })),
      worker_summary: { total: workers.length, running, done, errors },
      issues: issues.length,
      warnings: warnings.length,
    }, null, 2) + '\n');
    return issues.length > 0 ? 1 : 0;
  }

  process.stdout.write('oma doctor — offline diagnostics\n');
  process.stdout.write('─'.repeat(50) + '\n');
  process.stdout.write(`OMA_DIR : ${omaDir}\n`);

  if (state) {
    process.stdout.write(`Mode    : ${state.mode || 'n/a'}\n`);
    process.stdout.write(`Iteration: ${state.iteration || 'n/a'}/${state.max_iterations || '?'}\n`);
    process.stdout.write(`Task    : ${state.task_description || state.task || 'n/a'}\n`);
    process.stdout.write(`Active  : ${state.active ? 'yes' : 'no'}\n`);
  } else {
    process.stdout.write(`State   : ${existsSync(stateFile) ? 'CORRUPT' : 'MISSING'}\n`);
  }

  process.stdout.write('\n');
  process.stdout.write(`Team    : ${workers.length} worker(s) (${running} running, ${done} done, ${errors} error)\n`);

  for (const w of workers) {
    const log = w.logLines.length > 0 ? w.logLines[w.logLines.length - 1] : '(no output)';
    process.stdout.write(`  worker-${w.id}: ${w.status?.status || 'unknown'} | last: ${log}\n`);
  }

  for (const { msg } of issues) process.stdout.write(`[ERROR]   ${msg}\n`);
  for (const { msg } of warnings) process.stdout.write(`[WARN]    ${msg}\n`);

  if (issues.length === 0 && warnings.length === 0) {
    process.stdout.write('oma doctor: all checks passed.\n');
  } else if (issues.length > 0) {
    process.stdout.write(`oma doctor: ${issues.length} issue(s), ${warnings.length} warning(s).\n`);
  } else {
    process.stdout.write(`oma doctor: ${warnings.length} warning(s) — state is usable.\n`);
  }

  if (issues.some(i => i.severity === 'error')) return 2;
  if (issues.length > 0) return 1;
  return 0;
}

// ── doctorInstall: validate plugin files and manifests ──────────────────────

/**
 * Check plugin installation: manifests, hooks, MCP server.
 * @param {{ omaDir?: string }} opts
 * @returns {Promise<number>} exit code: 0=pass, 1=something failed
 */
export async function doctorInstall(opts = {}) {
  const { omaDir = resolveOmaDir() } = opts;
  const repoRoot = process.cwd();
  let exitCode = 0;

  const checks = [
    { label: 'plugin.json',          path: join(repoRoot, 'plugins/oma/.augment-plugin/plugin.json'), required: true },
    { label: '.mcp.json',             path: join(repoRoot, 'plugins/oma/.augment-plugin/.mcp.json'),  required: true },
    { label: 'hooks.json',            path: join(repoRoot, 'plugins/oma/hooks/hooks.json'),          required: true },
    { label: 'state-server.mjs',      path: join(repoRoot, 'plugins/oma/mcp/state-server.mjs'),       required: true },
    { label: 'marketplace.json',      path: join(repoRoot, '.augment-plugin/marketplace.json'),      required: false },
    { label: '.claude-plugin/plugin.json', path: join(repoRoot, '.claude-plugin/plugin.json'),       required: false },
  ];

  process.stdout.write('oma doctor --install — plugin installation checks\n');
  process.stdout.write('─'.repeat(50) + '\n');

  for (const { label, path, required } of checks) {
    const exists = existsSync(path);
    if (!exists) {
      process.stdout.write(`[${required ? 'FAIL' : 'SKIP'}] ${label}: not found\n`);
      if (required) exitCode = 1;
      continue;
    }

    try {
      const content = readFileSync(path, 'utf8');
      // Only validate JSON for .json files; other files are just checked for readability
      if (path.endsWith('.json')) JSON.parse(content);
      process.stdout.write(`[OK]   ${label}\n`);
    } catch (err) {
      process.stdout.write(`[FAIL] ${label}: ${err.message}\n`);
      if (required) exitCode = 1;
    }
  }

  // Check hooks directory
  const hooksDir = join(repoRoot, 'plugins/oma/hooks');
  if (existsSync(hooksDir)) {
    const scripts = readdirSync(hooksDir).filter(f => f.endsWith('.sh'));
    process.stdout.write(`[OK]   hooks/ — ${scripts.length} hook script(s)\n`);
  } else {
    process.stdout.write('[FAIL] hooks/ directory not found\n');
    exitCode = 1;
  }

  // Check skills directory
  const skillsDir = join(repoRoot, 'plugins/oma/skills');
  if (existsSync(skillsDir)) {
    const skills = readdirSync(skillsDir).filter(f =>
      existsSync(join(skillsDir, f, 'SKILL.md'))
    );
    process.stdout.write(`[OK]   skills/ — ${skills.length} skill(s)\n`);
  } else {
    process.stdout.write('[WARN] skills/ directory not found\n');
  }

  if (exitCode === 0) {
    process.stdout.write('oma doctor --install: all checks passed.\n');
  } else {
    process.stdout.write('oma doctor --install: one or more checks failed.\n');
  }

  return exitCode;
}

// ── doctorCI: run full CI suite locally ─────────────────────────────────────

/**
 * Run the full CI pipeline locally: bats tests + shellcheck + JSON validation.
 * @param {{ omaDir?: string }} opts
 * @returns {Promise<number>} worst exit code (2 > 1 > 0)
 */
export async function doctorCi(opts = {}) {
  const repoRoot = process.cwd();
  process.stdout.write('oma doctor --ci — running full CI pipeline\n');
  process.stdout.write('─'.repeat(50) + '\n');

  let worst = 0;

  // 1. bats e2e/oma-core-loop.bats
  await runStep('bats e2e/oma-core-loop.bats', async () => {
    return new Promise((resolve) => {
      const proc = spawn('bats', ['e2e/oma-core-loop.bats'], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });
      proc.stdout.on('data', d => process.stdout.write(d));
      proc.stderr.on('data', d => process.stderr.write(d));
      proc.on('close', code => resolve(code || 0));
    });
  });

  // 2. shellcheck on all hook scripts
  const hooksDir = join(repoRoot, 'plugins/oma/hooks');
  if (existsSync(hooksDir)) {
    const scripts = readdirSync(hooksDir).filter(f => f.endsWith('.sh'));
    for (const script of scripts) {
      const path = join(hooksDir, script);
      await runStep(`shellcheck ${script}`, async () => {
        return new Promise((resolve) => {
          const proc = spawn('shellcheck', ['--severity=error', path], {
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let stderr = '';
          proc.stderr.on('data', d => { stderr += d; });
          proc.on('close', code => {
            if (code !== 0) {
              process.stderr.write(stderr);
              resolve(1);
            } else {
              resolve(0);
            }
          });
        });
      });
    }
  }

  // 3. JSON manifest validation
  await runStep('JSON manifest validation', async () => {
    const manifests = [
      join(repoRoot, '.augment-plugin/marketplace.json'),
      join(repoRoot, 'plugins/oma/.augment-plugin/plugin.json'),
      join(repoRoot, 'plugins/oma/.augment-plugin/.mcp.json'),
      join(repoRoot, 'plugins/oma/hooks/hooks.json'),
      join(repoRoot, '.claude-plugin/plugin.json'),
    ];
    let fail = 0;
    for (const f of manifests) {
      try {
        JSON.parse(readFileSync(f, 'utf8'));
      } catch (err) {
        process.stderr.write(`FAIL: ${f}: ${err.message}\n`);
        fail++;
      }
    }
    return fail > 0 ? 1 : 0;
  });

  if (worst === 0) {
    process.stdout.write('oma doctor --ci: all CI checks passed.\n');
  } else {
    process.stdout.write(`oma doctor --ci: CI checks completed with exit code ${worst}.\n`);
  }

  return worst;
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function runStep(label, fn) {
  process.stdout.write(`\n[RUNNING] ${label}\n`);
  try {
    const code = await fn();
    if (code === 0) {
      process.stdout.write(`[PASS]   ${label}\n`);
    } else {
      process.stdout.write(`[FAIL]   ${label} (exit ${code})\n`);
      worst = Math.max(worst, code);
    }
  } catch (err) {
    process.stdout.write(`[ERROR]  ${label}: ${err.message}\n`);
    worst = Math.max(worst, 2);
  }
}

// Mutable accumulator for runStep (captured in closure)
let worst = 0;
