#!/usr/bin/env node
// cost-track.mjs -- PostToolUse/session-end hook: track model usage and cost per session
// Exit 0 = allow (always), Exit 2 = block (never used)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OMA_DIR = process.env.OMA_DIR
  ?? join(__dirname, '..', '.oma');
const COST_LOG_FILE = join(OMA_DIR, 'cost-log.json');
const SESSION_ID = process.env.SESSION_ID ?? `${Date.now()}-${process.pid}`;

const PRICING = {
  opus: { input: 15, output: 75 },
  sonnet: { input: 3, output: 15 },
  haiku: { input: 0.25, output: 1.25 },
  '4o': { input: 2.5, output: 10 },
  '4o-mini': { input: 0.25, output: 1.25 },
};

function ensureCostLog() {
  if (!existsSync(OMA_DIR)) {
    mkdirSync(OMA_DIR, { recursive: true });
  }
  if (!existsSync(COST_LOG_FILE)) {
    writeFileSync(COST_LOG_FILE, JSON.stringify({ sessions: [], version: '0.1' }));
  }
}

function readCostLog() {
  ensureCostLog();
  try {
    return JSON.parse(readFileSync(COST_LOG_FILE, 'utf8'));
  } catch {
    return { sessions: [], version: '0.1' };
  }
}

function writeCostLog(log) {
  writeFileSync(COST_LOG_FILE, JSON.stringify(log, null, 2));
}

function estimateCost(model, inputTokens, outputTokens) {
  const rates = PRICING[model] ?? PRICING.sonnet;
  const inputCost = (inputTokens * rates.input) / 1_000_000;
  const outputCost = (outputTokens * rates.output) / 1_000_000;
  return inputCost + outputCost;
}

function recordToolUsage(toolName, model, inputTokens, outputTokens, durationMs) {
  const costLog = readCostLog();
  let session = costLog.sessions.find(s => s.id === SESSION_ID);
  if (!session) {
    session = { id: SESSION_ID, start_time: new Date().toISOString(), tools: [], total_tokens: 0, estimated_cost_usd: 0 };
    costLog.sessions.push(session);
  }
  session.tools.push({ tool: toolName, model, input_tokens: inputTokens, output_tokens: outputTokens, duration_ms: durationMs });
  session.total_tokens += inputTokens + outputTokens;
  session.estimated_cost_usd += estimateCost(model, inputTokens, outputTokens);
  writeCostLog(costLog);
  console.error(`[cost-track] Token usage: ${inputTokens}+${outputTokens}=${inputTokens + outputTokens}, Estimated cost: $${(estimateCost(model, inputTokens, outputTokens)).toFixed(6)}`);
}

function main() {
  const hookType = process.env.HOOK_TYPE ?? 'PostToolUse';
  const toolName = process.env.OMA_TOOL_NAME ?? 'unknown';
  const model = process.env.OMA_MODEL ?? 'unknown';
  const inputTokens = parseInt(process.env.OMA_INPUT_TOKENS ?? '0');
  const outputTokens = parseInt(process.env.OMA_OUTPUT_TOKENS ?? '0');
  const durationMs = parseInt(process.env.OMA_DURATION_MS ?? '0');

  if (hookType === 'PostToolUse') {
    recordToolUsage(toolName, model, inputTokens, outputTokens, durationMs);
  } else if (hookType === 'SessionEnd' || hookType === 'session-end') {
    const costLog = readCostLog();
    const session = costLog.sessions.find(s => s.id === SESSION_ID);
    if (session) {
      console.error(`OMA Cost Summary for session ${SESSION_ID}: ${JSON.stringify(session)}`);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
