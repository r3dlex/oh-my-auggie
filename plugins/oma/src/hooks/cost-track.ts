import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { resolveOmaDir, getMergedConfig } from '../utils.js';
import type { HookInput } from '../types.js';

// ─── Pricing constants ────────────────────────────────────────────────────────

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const PRICING: Record<string, ModelPricing> = {
  opus:      { inputPerMillion: 15,   outputPerMillion: 75 },
  sonnet:    { inputPerMillion: 3,    outputPerMillion: 15 },
  haiku:     { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  '4o':      { inputPerMillion: 2.5,  outputPerMillion: 10 },
  '4o-mini': { inputPerMillion: 2.5,  outputPerMillion: 10 },
  'gpt-4o':      { inputPerMillion: 2.5,  outputPerMillion: 10 },
  'gpt-4o-mini': { inputPerMillion: 2.5,  outputPerMillion: 10 },
};

// Default to sonnet pricing
const DEFAULT_PRICING: ModelPricing = { inputPerMillion: 3, outputPerMillion: 15 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureCostLog(omaDir: string): void {
  const logPath = join(omaDir, 'cost-log.json');
  try {
    readFileSync(logPath, 'utf8');
  } catch {
    writeFileSync(logPath, JSON.stringify({ sessions: [], version: '0.1' }, null, 2), 'utf8');
  }
}

function readCostLog(omaDir: string): { sessions: CostSession[]; version: string } {
  const logPath = join(omaDir, 'cost-log.json');
  ensureCostLog(omaDir);
  try {
    const content = readFileSync(logPath, 'utf8');
    if (!content.trim()) {
      return { sessions: [], version: '0.1' };
    }
    return JSON.parse(content) as { sessions: CostSession[]; version: string };
  } catch {
    return { sessions: [], version: '0.1' };
  }
}

function writeCostLog(omaDir: string, log: { sessions: CostSession[]; version: string }): void {
  const logPath = join(omaDir, 'cost-log.json');
  writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf8');
}

function getSessionId(): string {
  if (process.env.SESSION_ID) return process.env.SESSION_ID;
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${ts}-${process.pid}`;
}

// ─── Auggie model normalization ────────────────────────────────────────────────

// Auggie model names differ from standard naming; map to pricing tiers
const MODEL_TIER_MAP: Record<string, string> = {
  'miniMax-M2.7': 'haiku',
  'MiniMax-M2.7': 'haiku',
  'minimax': 'haiku',
  'sonnet': 'sonnet',
  'opus': 'opus',
  'haiku': 'haiku',
  'gpt-4o': '4o',
  'gpt-4o-mini': '4o-mini',
  'claude-sonnet': 'sonnet',
  'claude-opus': 'opus',
  'claude-haiku': 'haiku',
};

function normalizeModel(model: string): string {
  const lower = model.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return MODEL_TIER_MAP[lower] ?? MODEL_TIER_MAP[model] ?? 'haiku';
}

// Estimate input tokens from raw stdin content
function estimateInputTokens(rawInput: string, toolName: string): number {
  if (!rawInput) return 0;
  // Rough estimate: ~4 chars per token for input
  const chars = rawInput.length;
  return Math.max(1, Math.round(chars / 4));
}

// Estimate output tokens based on tool type
function estimateOutputTokens(rawInput: string, toolName: string): number {
  // Web search/tools typically have smaller outputs
  const SMALL_OUTPUT_TOOLS = ['Web Search', 'Bash', 'Read', 'Grep', 'Glob'];
  if (SMALL_OUTPUT_TOOLS.some(t => toolName.includes(t))) {
    return 50;
  }
  // Default medium estimate
  return 200;
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model.toLowerCase()] ?? DEFAULT_PRICING;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return inputCost + outputCost;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

export function upsertSession(log: { sessions: CostSession[]; version: string }, sessionId: string): CostSession {
  let session = log.sessions.find(s => s.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      start_time: getCurrentTimestamp(),
      tools: [],
      total_tokens: 0,
      estimated_cost_usd: 0,
    };
    log.sessions.push(session);
  }
  return session;
}

export function recordToolUsage(
  session: CostSession,
  toolName: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
): void {
  const totalTokens = inputTokens + outputTokens;
  const cost = estimateCost(model, inputTokens, outputTokens);

  session.tools.push({
    name: toolName,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    duration_ms: durationMs,
    timestamp: getCurrentTimestamp(),
  });
  session.total_tokens += totalTokens;
  session.estimated_cost_usd += cost;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CostSession {
  id: string;
  start_time: string;
  tools: Array<{
    name: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    duration_ms: number;
    timestamp: string;
  }>;
  total_tokens: number;
  estimated_cost_usd: number;
}

// ─── Tool info extraction ──────────────────────────────────────────────────────

export function extractFromInput(rawInput: string): Partial<ToolInfo> {
  try {
    const input = JSON.parse(rawInput) as HookInput;
    return {
      toolName: input.tool_name,
      model: (input as Record<string, unknown>).model as string | undefined,
      inputTokens: Number((input as Record<string, unknown>).input_tokens ?? 0),
      outputTokens: Number((input as Record<string, unknown>).output_tokens ?? 0),
      durationMs: Number((input as Record<string, unknown>).duration_ms ?? 0),
    };
  } catch {
    return {};
  }
}

interface ToolInfo {
  toolName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function main(): Promise<void> {
  const hookType = process.env.HOOK_TYPE ?? 'PostToolUse';
  const omaDir = resolveOmaDir();

  // Read stdin if available
  let rawInput = '';
  if (!process.stdin.isTTY) {
    const { readAllStdin } = await import('../utils.js');
    rawInput = await readAllStdin();
  }

  const sessionId = getSessionId();

  if (hookType === 'PostToolUse') {
    const env = process.env;
    let toolName = env.OMA_TOOL_NAME ?? 'unknown';
    let model = env.OMA_MODEL ?? 'unknown';
    let inputTokens = parseInt(env.OMA_INPUT_TOKENS ?? '0', 10);
    let outputTokens = parseInt(env.OMA_OUTPUT_TOKENS ?? '0', 10);
    let durationMs = parseInt(env.OMA_DURATION_MS ?? '0', 10);

    // Auggie provides ANTHROPIC_MODEL but not OMA_* token env vars.
    // Use it to derive model and estimate tokens when not provided.
    const auggieModel = env.ANTHROPIC_MODEL;
    if (auggieModel) {
      model = normalizeModel(auggieModel);
      if (inputTokens === 0 && outputTokens === 0) {
        inputTokens = estimateInputTokens(rawInput, toolName);
        outputTokens = estimateOutputTokens(rawInput, toolName);
      }
    }

    // Fall back to parsing stdin
    if (toolName === 'unknown' && rawInput) {
      const extracted = extractFromInput(rawInput);
      toolName = extracted.toolName ?? 'unknown';
      model = extracted.model ?? model; // keep auggie-derived model if set
      inputTokens = extracted.inputTokens || inputTokens;
      outputTokens = extracted.outputTokens || outputTokens;
      durationMs = extracted.durationMs ?? 0;
    }

    const log = readCostLog(omaDir);
    const session = upsertSession(log, sessionId);
    recordToolUsage(session, toolName, model, inputTokens, outputTokens, durationMs);
    writeCostLog(omaDir, log);

    // Debug output to stderr
    const totalTokens = inputTokens + outputTokens;
    const cost = estimateCost(model, inputTokens, outputTokens);
    console.error(`[cost-track] session=${sessionId} tool=${toolName} model=${model} tokens=${inputTokens}/${outputTokens} duration=${durationMs}ms`);
    console.error(`[cost-track] Token usage: ${inputTokens}+${outputTokens}=${totalTokens}, Estimated cost: $${cost.toFixed(6)}`);
  } else if (hookType === 'SessionEnd' || hookType === 'session-end') {
    ensureCostLog(omaDir);
    const log = readCostLog(omaDir);
    const session = log.sessions.find(s => s.id === sessionId);
    if (session) {
      console.error(`OMA Cost Summary for session ${sessionId}:`);
      console.error(`  Total tokens: ${session.total_tokens}`);
      console.error(`  Estimated cost: $${session.estimated_cost_usd.toFixed(6)}`);
      console.error(`  Tools used: ${session.tools.length}`);
    }
  } else if (rawInput) {
    // Default: try to record what we can
    const extracted = extractFromInput(rawInput);
    if (extracted.toolName) {
      const log = readCostLog(omaDir);
      const session = upsertSession(log, sessionId);
      recordToolUsage(session, extracted.toolName, extracted.model ?? 'unknown', extracted.inputTokens ?? 0, extracted.outputTokens ?? 0, extracted.durationMs ?? 0);
      writeCostLog(omaDir, log);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`[cost-track] fatal error: ${err}`);
  process.exit(0); // non-blocking hook, but still log
});
