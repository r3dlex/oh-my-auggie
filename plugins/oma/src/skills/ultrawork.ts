/**
 * ultrawork runtime — parallel execution engine for concurrent agent tasks.
 *
 * Accepts a task description, decomposes it into independent subtasks (2–8),
 * spawns oma-executor subagents in parallel, collects results, and produces
 * a structured execution report.
 */

import { spawn } from 'child_process';
import { readAllStdin, resolveOmaDir } from '../utils.js';
import { writeJsonFile, loadJsonFile } from '../utils.js';
import type { OmaState } from '../types.js';

// ─── Types ────────────────────────────────────────────────────────────────────────

interface Subtask {
  id: number;
  description: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  durationMs?: number;
  output?: string;
  error?: string;
}

interface UltraworkResult {
  taskDescription: string;
  mode: 'parallel' | 'staggered' | 'adaptive';
  concurrency: number;
  startTime: string;
  endTime: string;
  subtasks: Subtask[];
  totalDurationMs: number;
  speedup?: number;
  failures: number;
}

// ─── Task decomposition ─────────────────────────────────────────────────────

/**
 * Decomposes a high-level task into 2–8 independent subtasks.
 * Uses simple heuristics: split by common delimiters (comma, semicolon, "and"),
 * or by file-path groups. Returns an array of subtask descriptions.
 */
function decomposeTask(task: string): string[] {
  // Normalize whitespace
  const normalized = task.replace(/\s+/g, ' ').trim();

  // Try splitting by common delimiters
  const byBar = normalized.split('|').map(s => s.trim()).filter(Boolean);
  if (byBar.length >= 2 && byBar.length <= 8) return byBar;

  const bySemicolon = normalized.split(';').map(s => s.trim()).filter(Boolean);
  if (bySemicolon.length >= 2 && bySemicolon.length <= 8) return bySemicolon;

  const byAnd = normalized.split(/\s+and\s+/).map(s => s.trim()).filter(Boolean);
  if (byAnd.length >= 2 && byAnd.length <= 8) return byAnd;

  const byComma = normalized.split(',').map(s => s.trim()).filter(Boolean);
  if (byComma.length >= 2 && byComma.length <= 8) return byComma;

  // If the task still fits as a single unit, return it as one subtask
  if (normalized.length < 80) return [normalized];

  // Fallback: split by line or sentence heuristics
  const sentences = normalized.split(/(?<=[.;])\s+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length >= 2 && sentences.length <= 8) return sentences;

  // Last resort: return the whole task
  return [normalized];
}

// ─── State persistence ─────────────────────────────────────────────────────

function saveUltraworkState(omaDir: string, state: OmaState): void {
  writeJsonFile('ultrawork-state.json', state);
}

// ─── Executor spawning ─────────────────────────────────────────────────────

/**
 * Spawns a single oma-executor agent for a subtask.
 * Returns a promise that resolves with the subtask result.
 */
function spawnExecutor(
  subtask: Subtask,
  teamName: string,
  cwd: string,
): Promise<Subtask> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    // Build the agent invocation command
    const args = [
      'claude', 'code',
      `--task "${subtask.description}"`,
      `--team-name ${teamName}`,
      `--model sonnet4.6`,
    ];

    const proc = spawn('claude', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      const resolved: Subtask = {
        ...subtask,
        durationMs,
        status: code === 0 ? 'done' : 'failed',
        output: stdout.slice(-2000) || undefined,
        error: code !== 0 ? (stderr.slice(-500) || `exit code ${code}`) : undefined,
      };
      resolve(resolved);
    });

    proc.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      resolve({
        ...subtask,
        durationMs,
        status: 'failed',
        error: err.message,
      });
    });
  });
}

// ─── Retry logic ────────────────────────────────────────────────────────────

/**
 * Runs a subtask once. If it fails, retries once.
 */
async function runSubtaskWithRetry(
  subtask: Subtask,
  teamName: string,
  cwd: string,
): Promise<Subtask> {
  let result = await spawnExecutor(subtask, teamName, cwd);

  if (result.status === 'failed') {
    // Retry once
    const retryTask: Subtask = { ...subtask, id: subtask.id, status: 'running' };
    result = await spawnExecutor(retryTask, teamName, cwd);
  }

  return result;
}

// ─── Output formatting ────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function formatTimestamp(ts: string): string {
  return ts.replace('T', ' ').slice(0, 19) + 'Z';
}

/**
 * Produces the structured markdown report described in SKILL.md.
 */
function formatReport(result: UltraworkResult): string {
  const lines: string[] = [];

  lines.push(`## Ultrawork: ${result.taskDescription}`);
  lines.push('');
  lines.push('### Execution Plan');
  lines.push('| Task | Dependencies | Est. Duration |');
  lines.push('|------|--------------|---------------|');

  for (const st of result.subtasks) {
    const deps = 'none';
    const est = st.durationMs ? formatDuration(st.durationMs) : '—';
    lines.push(`| ${st.description.slice(0, 60)} | ${deps} | ${est} |`);
  }

  lines.push('');
  lines.push('### Execution');
  lines.push(`- **Mode:** ${result.mode}`);
  lines.push(`- **Concurrency:** ${result.concurrency} tasks`);
  lines.push(`- **Started:** ${formatTimestamp(result.startTime)}`);

  lines.push('');
  lines.push('### Results');
  lines.push('| Task | Status | Duration | Output |');
  lines.push('|------|--------|----------|--------|');

  for (const st of result.subtasks) {
    const statusIcon = st.status === 'done' ? '✅' : st.status === 'failed' ? '❌' : '⏳';
    const duration = st.durationMs ? formatDuration(st.durationMs) : '—';
    const output = st.output
      ? st.output.slice(0, 80).replace(/\n/g, ' ') + (st.output.length > 80 ? '…' : '')
      : st.error
        ? st.error.slice(0, 80).replace(/\n/g, ' ')
        : '—';
    lines.push(`| ${st.description.slice(0, 40)} | ${statusIcon} | ${duration} | ${output} |`);
  }

  lines.push('');
  lines.push('### Summary');
  lines.push(`- **Total duration:** ${formatDuration(result.totalDurationMs)}`);

  if (result.speedup !== undefined) {
    lines.push(`- **Speedup:** ${result.speedup.toFixed(1)}x vs sequential`);
  }

  lines.push(`- **Failures:** ${result.failures}`);

  return lines.join('\n');
}

// ─── Conflict detection ───────────────────────────────────────────────────

/**
 * Detects potential file conflicts across subtask outputs.
 * Returns a list of files that appear to be modified by multiple subtasks.
 * Note: last-write-wins is applied at write time; this is for reporting only.
 */
function detectConflicts(results: Subtask[]): string[] {
  // Placeholder: real implementation would parse tool outputs for file_path mentions
  return [];
}

// ─── Main ──────────────────────────────────────────────────────────────────

export async function main(): Promise<void> {
  const omaDir = resolveOmaDir();
  const startTime = Date.now();

  // Read task from stdin or arguments
  let taskDescription = '';
  if (!process.stdin.isTTY) {
    taskDescription = await readAllStdin();
  }
  // Also check process.argv for arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    taskDescription = args.join(' ').replace(/^['"]|['"]$/g, '');
  }

  if (!taskDescription.trim()) {
    console.error('[ultrawork] error: no task description provided');
    process.exit(1);
  }

  // Update OMA state
  const state: OmaState = {
    mode: 'ultrawork',
    active: true,
    iteration: 1,
    task: taskDescription,
  };
  saveUltraworkState(omaDir, state);

  // Decompose task
  const subtaskDescs = decomposeTask(taskDescription);
  const concurrency = Math.min(subtaskDescs.length, 8);

  // Initialize subtasks
  const subtasks: Subtask[] = subtaskDescs.map((desc, i) => ({
    id: i + 1,
    description: desc,
    status: 'pending',
  }));

  const teamName = `ultrawork-${Date.now()}`;
  const cwd = process.cwd();

  // Run all subtasks in parallel
  const running = subtasks.map((st) =>
    runSubtaskWithRetry(st, teamName, cwd)
  );

  const results = await Promise.all(running);

  const endTime = new Date().toISOString();
  const totalDurationMs = Date.now() - startTime;

  // Calculate speedup vs sequential
  const sequentialTime = results.reduce((sum, st) => sum + (st.durationMs ?? 0), 0);
  const speedup = sequentialTime > 0 ? sequentialTime / totalDurationMs : undefined;

  const failures = results.filter(st => st.status === 'failed').length;
  const conflicts = detectConflicts(results);

  const ultraworkResult: UltraworkResult = {
    taskDescription,
    mode: 'parallel',
    concurrency,
    startTime: new Date(startTime).toISOString(),
    endTime,
    subtasks: results,
    totalDurationMs,
    speedup,
    failures,
  };

  // Print report
  const report = formatReport(ultraworkResult);
  console.log(report);

  if (conflicts.length > 0) {
    console.error(`\n[ultrawork] warning: potential file conflicts detected on: ${conflicts.join(', ')}`);
  }

  if (failures > 0) {
    console.error(`\n[ultrawork] ${failures} subtask(s) failed — retry once, then report`);
  }

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[ultrawork] fatal error: ${err}`);
  process.exit(1);
});
