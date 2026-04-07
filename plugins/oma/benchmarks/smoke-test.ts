#!/usr/bin/env node
/**
 * smoke-test.ts — Hook performance benchmarks
 *
 * Usage:
 *   npx tsx benchmarks/smoke-test.ts              # run benchmarks
 *   npx tsx benchmarks/smoke-test.ts --baseline   # save/update baseline
 *   npx tsx benchmarks/smoke-test.ts --compare   # compare against baseline
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { HookInput } from '../src/types.js';
import type { KeywordEntry } from '../src/hooks/keyword-detect.js';

// ─── Re-implement only the pure logic we need so benchmarks stay self-contained ───

// keyword-detect pure match (mirrors src/hooks/keyword-detect.ts KEYWORDS + match logic)
const KEYWORDS: KeywordEntry[] = [
  { keyword: 'autopilot',       command: '/oma:autopilot'   },
  { keyword: 'ralph',           command: '/oma:ralph'        },
  { keyword: "don't stop",      command: '/oma:ralph'        },
  { keyword: 'ulw',             command: '/oma:ultrawork'    },
  { keyword: 'ultrawork',       command: '/oma:ultrawork'    },
  { keyword: 'ccg',              command: '/oma:ccg'          },
  { keyword: 'ralplan',         command: '/oma:ralplan'      },
  { keyword: 'deep interview',  command: '/oma:interview'    },
  { keyword: 'deslop',          command: '/oma:deslop'       },
  { keyword: 'anti-slop',       command: '/oma:deslop'       },
  { keyword: 'canceloma',       command: '/oma:cancel'        },
];

function detectKeyword(input: string): string | null {
  const lower = input.toLowerCase();
  for (const entry of KEYWORDS) {
    if (lower.includes(entry.keyword)) return entry.keyword;
  }
  return null;
}

// delegation-enforce: tools that require delegation check
const BLOCKING_TOOLS = new Set(['Edit', 'Write', 'remove_files', 'str-replace-editor', 'save-file']);

function checkDelegationEnforce(
  toolName: string,
  mode: string,
  active: boolean
): 'block' | 'allow' {
  if (!BLOCKING_TOOLS.has(toolName)) return 'allow';
  if (mode !== 'none' && active) return 'block';
  return 'allow';
}

// approval-gate pure helpers (mirrors src/hooks/approval-gate.ts)
type ApprovalType = 'Security' | 'DevOps' | 'DBA' | 'Security+DevOps' | '';

function getRequiredApproval(filePath: string): ApprovalType {
  const lower = filePath.toLowerCase();
  if (lower.includes('secrets') || lower.includes('secret')) return 'Security+DevOps';
  if (lower.includes('auth') || /auth\*\.ts$/i.test(filePath)) return 'Security';
  if (lower.includes('config') || filePath.includes('/config')) return 'DevOps';
  if (lower.includes('migration') || filePath.includes('/migration') || lower.includes('migrate')) return 'DBA';
  return '';
}

function isApprovalExpired(expires: string | undefined): boolean {
  if (!expires) return false;
  return Date.now() > new Date(expires).getTime() + 5 * 60 * 1000;
}

interface ApprovalRecord {
  type: string;
  expires?: string;
}

function hasValidApproval(required: ApprovalType, approvals: ApprovalRecord[]): boolean {
  if (!required || approvals.length === 0) return false;
  if (required === 'Security+DevOps') {
    return approvals.some((r) => r.type === 'Security' && !isApprovalExpired(r.expires)) &&
           approvals.some((r) => r.type === 'DevOps' && !isApprovalExpired(r.expires));
  }
  return approvals.some((r) => r.type === required && !isApprovalExpired(r.expires));
}

function checkApprovalGate(
  filePath: string,
  isEnterprise: boolean,
  approvals: ApprovalRecord[]
): 'block' | 'allow' {
  if (!isEnterprise) return 'allow';
  const required = getRequiredApproval(filePath);
  if (!required) return 'allow';
  return hasValidApproval(required, approvals) ? 'allow' : 'block';
}

// ─── Statistics helpers ──────────────────────────────────────────────────────────

interface Percentiles {
  p50: number;
  p95: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computeStats(samples: number[]): { avg: number; p50: number; p95: number; runs: number } {
  if (samples.length === 0) return { avg: 0, p50: 0, p95: 0, runs: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    avg: parseFloat(avg.toFixed(3)),
    p50:  parseFloat(percentile(sorted, 50).toFixed(3)),
    p95:  parseFloat(percentile(sorted, 95).toFixed(3)),
    runs: samples.length,
  };
}

// ─── Benchmark suites ───────────────────────────────────────────────────────────

interface BenchmarkResult {
  hookName: string;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  runs: number;
}

const RUNS = 5000;

// ── Keyword-detect ───────────────────────────────────────────────────────────────

interface KeywordTestCase {
  label: string;
  input: string;
}

const KEYWORD_CASES: KeywordTestCase[] = [
  { label: 'short-ralph',        input: 'Can you ralph on this?' },
  { label: 'short-autopilot',   input: 'Run in autopilot mode please.' },
  { label: 'short-ultrawork',   input: 'Use ulw to speed things up.' },
  { label: 'short-deslop',      input: 'Deslop this file.' },
  { label: 'short-canceloma',   input: 'canceloma now' },
  { label: 'medium-ralph',      input: 'I want to keep working without stopping. Use ralph mode to persist.' },
  { label: 'medium-ultrawork',  input: 'Please run the ultrawork orchestration mode to parallelize everything.' },
  { label: 'medium-deep',        input: 'This needs a deep interview style review process.' },
  { label: 'long-pr-text',      input: '## Summary\n- Implement new hook\n\n## Test plan\n- Run smoke tests\n\nThe reviewer said: "use ralph to iterate".' },
  { label: 'edge-no-keyword',   input: 'Please refactor the authentication module carefully.' },
  { label: 'edge-case-sensitivity', input: 'RALPH mode activated!' },
  { label: 'edge-partial-word',  input: 'The autopilot feature is not what we need here.' },
];

function benchmarkKeywordDetect(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const hookLabel = 'keyword-detect';

  // Run each case enough times to get meaningful stats
  const runsPerCase = Math.max(100, Math.floor(RUNS / KEYWORD_CASES.length));

  for (const tc of KEYWORD_CASES) {
    const samples: number[] = [];
    for (let i = 0; i < runsPerCase; i++) {
      const t0 = process.hrtime.bigint();
      detectKeyword(tc.input);
      const ns = Number(process.hrtime.bigint() - t0);
      samples.push(ns / 1e6);
    }
    const stats = computeStats(samples);
    results.push({
      hookName: `${hookLabel}/${tc.label}`,
      avgLatencyMs:  stats.avg,
      p50LatencyMs:  stats.p50,
      p95LatencyMs:  stats.p95,
      runs:           stats.runs,
    });
  }

  return results;
}

// ── Delegation-enforce ───────────────────────────────────────────────────────────

interface DelegationTestCase {
  label: string;
  toolName: string;
  mode: string;
  active: boolean;
}

const DELEGATION_CASES: DelegationTestCase[] = [
  { label: 'edit-active-ralph',     toolName: 'Edit',       mode: 'ralph',      active: true  },
  { label: 'write-active-autopilot', toolName: 'Write',     mode: 'autopilot', active: true  },
  { label: 'edit-inactive',         toolName: 'Edit',       mode: 'ralph',      active: false },
  { label: 'edit-no-mode',          toolName: 'Edit',       mode: 'none',       active: false },
  { label: 'bash-any',              toolName: 'Bash',       mode: 'ralph',      active: true  },
  { label: 'read-any',              toolName: 'Read',       mode: 'autopilot', active: true  },
  { label: 'edit-active-ultrawork', toolName: 'Edit',       mode: 'ultrawork', active: true  },
  { label: 'edit-active-none-mode', toolName: 'Edit',       mode: 'none',       active: true  },
];

function benchmarkDelegationEnforce(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const hookLabel = 'delegation-enforce';

  const runsPerCase = Math.max(100, Math.floor(RUNS / DELEGATION_CASES.length));

  for (const tc of DELEGATION_CASES) {
    const samples: number[] = [];
    for (let i = 0; i < runsPerCase; i++) {
      const t0 = process.hrtime.bigint();
      checkDelegationEnforce(tc.toolName, tc.mode, tc.active);
      const ns = Number(process.hrtime.bigint() - t0);
      samples.push(ns / 1e6);
    }
    const stats = computeStats(samples);
    results.push({
      hookName: `${hookLabel}/${tc.label}`,
      avgLatencyMs:  stats.avg,
      p50LatencyMs:  stats.p50,
      p95LatencyMs:  stats.p95,
      runs:           stats.runs,
    });
  }

  return results;
}

// ── Approval-gate ──────────────────────────────────────────────────────────────

interface ApprovalTestCase {
  label: string;
  filePath: string;
  isEnterprise: boolean;
  approvals: ApprovalRecord[];
}

const APPROVAL_CASES: ApprovalTestCase[] = [
  {
    label: 'auth-needs-security',
    filePath: '/project/src/auth/login.ts',
    isEnterprise: true,
    approvals: [],
  },
  {
    label: 'config-needs-devops',
    filePath: '/project/config/settings.json',
    isEnterprise: true,
    approvals: [],
  },
  {
    label: 'migration-needs-dba',
    filePath: '/db/migrations/001_add_users.sql',
    isEnterprise: true,
    approvals: [],
  },
  {
    label: 'secrets-needs-both',
    filePath: '/project/secrets/credentials.json',
    isEnterprise: true,
    approvals: [],
  },
  {
    label: 'normal-file-no-approval',
    filePath: '/project/src/utils/helper.ts',
    isEnterprise: true,
    approvals: [],
  },
  {
    label: 'enterprise-with-valid-security',
    filePath: '/project/src/auth/middleware.ts',
    isEnterprise: true,
    approvals: [{ type: 'Security', expires: '2099-12-31T23:59:59Z' }],
  },
  {
    label: 'secrets-with-both-approvals',
    filePath: '/secrets/prod-keys.env',
    isEnterprise: true,
    approvals: [
      { type: 'Security', expires: '2099-12-31T23:59:59Z' },
      { type: 'DevOps',   expires: '2099-12-31T23:59:59Z' },
    ],
  },
  {
    label: 'non-enterprise-allow',
    filePath: '/project/src/auth/login.ts',
    isEnterprise: false,
    approvals: [],
  },
  {
    label: 'auth-star-file',
    filePath: '/project/auth*.ts',
    isEnterprise: true,
    approvals: [],
  },
  {
    label: 'expired-approval-block',
    filePath: '/project/config/secrets.yaml',
    isEnterprise: true,
    approvals: [{ type: 'Security', expires: '2020-01-01T00:00:00Z' }],
  },
];

function benchmarkApprovalGate(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const hookLabel = 'approval-gate';

  const runsPerCase = Math.max(100, Math.floor(RUNS / APPROVAL_CASES.length));

  for (const tc of APPROVAL_CASES) {
    const samples: number[] = [];
    for (let i = 0; i < runsPerCase; i++) {
      const t0 = process.hrtime.bigint();
      checkApprovalGate(tc.filePath, tc.isEnterprise, tc.approvals);
      const ns = Number(process.hrtime.bigint() - t0);
      samples.push(ns / 1e6);
    }
    const stats = computeStats(samples);
    results.push({
      hookName: `${hookLabel}/${tc.label}`,
      avgLatencyMs:  stats.avg,
      p50LatencyMs:  stats.p50,
      p95LatencyMs:  stats.p95,
      runs:           stats.runs,
    });
  }

  return results;
}

// ─── Baseline + comparison ──────────────────────────────────────────────────────

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = join(THIS_DIR, 'baselines');
const BASELINE_FILE = join(BASELINE_DIR, 'smoke-test-baseline.json');

interface Baseline {
  savedAt: string;
  version: string;
  results: BenchmarkResult[];
}

function loadBaseline(): Baseline | null {
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
  } catch {
    return null;
  }
}

function saveBaseline(results: BenchmarkResult[]): void {
  try {
    mkdirSync(BASELINE_DIR, { recursive: true });
  } catch {
    // dir already exists
  }
  const baseline: Baseline = {
    savedAt:  new Date().toISOString(),
    version:  '1.0.0',
    results,
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2), 'utf8');
}

interface ComparisonResult extends BenchmarkResult {
  deltaAvgMs: number;
  deltaP50Ms: number;
  deltaP95Ms: number;
  baselineAvgMs: number;
  baselineP50Ms: number;
  baselineP95Ms: number;
}

function compareWithBaseline(
  current: BenchmarkResult[],
  baseline: Baseline
): ComparisonResult[] {
  const baselineMap = new Map(baseline.results.map((r) => [r.hookName, r]));
  const comparison: ComparisonResult[] = [];

  for (const c of current) {
    const b = baselineMap.get(c.hookName);
    if (b) {
      comparison.push({
        ...c,
        baselineAvgMs: b.avgLatencyMs,
        baselineP50Ms: b.p50LatencyMs,
        baselineP95Ms: b.p95LatencyMs,
        deltaAvgMs: parseFloat((c.avgLatencyMs - b.avgLatencyMs).toFixed(3)),
        deltaP50Ms: parseFloat((c.p50LatencyMs - b.p50LatencyMs).toFixed(3)),
        deltaP95Ms: parseFloat((c.p95LatencyMs - b.p95LatencyMs).toFixed(3)),
      });
    } else {
      // New benchmark case — no baseline comparison
      comparison.push({
        ...c,
        baselineAvgMs: 0,
        baselineP50Ms: 0,
        baselineP95Ms: 0,
        deltaAvgMs: 0,
        deltaP50Ms: 0,
        deltaP95Ms: 0,
      });
    }
  }

  return comparison;
}

// ─── Output ────────────────────────────────────────────────────────────────────

function formatDelta(delta: number): string {
  if (delta === 0) return '  0.000 ms';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)} ms`;
}

function printCurrent(results: BenchmarkResult[]): void {
  console.log('\n## Current Results\n');
  console.log('| Hook / Case                        |  Avg (ms) |   P50 (ms) |   P95 (ms) | Runs  |');
  console.log('|------------------------------------|-----------|------------|------------|-------|');
  for (const r of results) {
    console.log(
      `| ${r.hookName.padEnd(36)} | ${r.avgLatencyMs.toFixed(3).padStart(9)} | `
      + `${r.p50LatencyMs.toFixed(3).padStart(10)} | ${r.p95LatencyMs.toFixed(3).padStart(10)} | ${String(r.runs).padStart(4)} |`
    );
  }
}

function printComparison(comparison: ComparisonResult[]): void {
  console.log('\n## Comparison vs Baseline\n');
  console.log(
    '| Hook / Case                        |  Avg (ms) |  Δ Avg    |  P50 (ms) |  Δ P50   |  P95 (ms) |  Δ P95   |'
  );
  console.log(
    '|------------------------------------|-----------|-----------|-----------|----------|-----------|----------|'
  );
  for (const c of comparison) {
    console.log(
      `| ${c.hookName.padEnd(36)} | ${c.avgLatencyMs.toFixed(3).padStart(9)} | `
      + `${formatDelta(c.deltaAvgMs).padStart(9)} | ${c.p50LatencyMs.toFixed(3).padStart(9)} | `
      + `${formatDelta(c.deltaP50Ms).padStart(8)} | ${c.p95LatencyMs.toFixed(3).padStart(9)} | `
      + `${formatDelta(c.deltaP95Ms).padStart(8)} |`
    );
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isBaseline = args.includes('--baseline');
  const isCompare  = args.includes('--compare');

  console.log(`# OMA Hook Benchmarks — smoke-test`);
  console.log(`# Date:    ${new Date().toISOString()}`);
  console.log(`# Runs:    ${RUNS} total (${Math.floor(RUNS / KEYWORD_CASES.length)} per keyword case, etc.)`);
  console.log(`# Node:    ${process.version}`);

  const keywordResults   = benchmarkKeywordDetect();
  const delegationResults = benchmarkDelegationEnforce();
  const approvalResults  = benchmarkApprovalGate();

  const allResults = [...keywordResults, ...delegationResults, ...approvalResults];

  if (isBaseline) {
    saveBaseline(allResults);
    console.log(`\nBaseline saved to: ${BASELINE_FILE}`);
    printCurrent(allResults);
    return;
  }

  if (isCompare) {
    const baseline = loadBaseline();
    if (!baseline) {
      console.error('\nNo baseline found. Run with --baseline first.\n');
      process.exit(1);
    }
    printCurrent(allResults);
    const comparison = compareWithBaseline(allResults, baseline);
    printComparison(comparison);

    // Emit JSON comparison to stdout for tooling
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify({ comparison, baselineVersion: baseline.version, savedAt: baseline.savedAt }, null, 2));
    return;
  }

  // Default: just run and show current results
  printCurrent(allResults);

  const existing = loadBaseline();
  if (existing) {
    const comparison = compareWithBaseline(allResults, existing);
    printComparison(comparison);
  } else {
    console.log('\n(No baseline found — run with --baseline to save one.)');
  }
}

main().catch((err) => {
  console.error('smoke-test error:', err);
  process.exit(1);
});
