import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { resolveOmaDir, getMergedConfig } from '../utils.js';
// ─── Credit cost constants ────────────────────────────────────────────────────
// Credits per 1M tokens; $0.000625 per credit ($15 / 24,000)
// Keys use dot-free identifiers (dots/hyphens stripped from Auggie model names)
export const CREDIT_COST = {
    'haiku45': 88,
    'sonnet46': 293,
    'opus46': 488, // legacy -- keep for backward compat
    'opus47': 488,
    'gpt51': 219,
    'gpt52': 390,
    'gpt54': 420,
    'gemini31pro': 270,
};
const DEFAULT_CREDIT_COST = 293;
const CREDIT_TO_USD = 0.000625; // $15 / 24,000 credits
// ─── Helpers ─────────────────────────────────────────────────────────────────
function ensureCostLog(omaDir) {
    const logPath = join(omaDir, 'cost-log.json');
    try {
        readFileSync(logPath, 'utf8');
    }
    catch {
        writeFileSync(logPath, JSON.stringify({ sessions: [], version: '0.2' }, null, 2), 'utf8');
    }
}
function readCostLog(omaDir) {
    const logPath = join(omaDir, 'cost-log.json');
    ensureCostLog(omaDir);
    try {
        const content = readFileSync(logPath, 'utf8');
        if (!content.trim()) {
            return { sessions: [], version: '0.2' };
        }
        return JSON.parse(content);
    }
    catch {
        return { sessions: [], version: '0.2' };
    }
}
function writeCostLog(omaDir, log) {
    const logPath = join(omaDir, 'cost-log.json');
    writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf8');
}
function getSessionId() {
    if (process.env.SESSION_ID)
        return process.env.SESSION_ID;
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${ts}-${process.pid}`;
}
// ─── Auggie model normalization ────────────────────────────────────────────────
// Keys: dot-and-hyphen-stripped/lowercased Auggie model names
// Values: CREDIT_COST keys (also dot-free)
const MODEL_TIER_MAP = {
    // Fully hyphenated auggie model strings → dot-free tier
    'claudeopus46': 'opus46', // legacy -- keep for backward compat
    'claudeopus47': 'opus47',
    'claudesonnet46': 'sonnet46',
    'claudehaiku45': 'haiku45',
    // Dot-hyphen models → dot-free tier
    'gpt54': 'gpt54',
    'gpt52': 'gpt52',
    'gpt51': 'gpt51',
    'gemini31pro': 'gemini31pro',
    // Short names (already dot-free)
    'opus': 'opus47',
    'sonnet': 'sonnet46',
    'haiku': 'haiku45',
    'minimax': 'haiku45',
    // Dot-stripped model names (e.g. 'sonnet4.6' → 'sonnet46')
    'sonnet46': 'sonnet46',
    'opus46': 'opus46', // legacy -- keep for backward compat
    'opus47': 'opus47',
    'haiku45': 'haiku45',
};
function normalizeModel(model) {
    // Strip dots and hyphens to normalize all variants to a common key
    // e.g. 'sonnet4.6' → 'sonnet46', 'claude-sonnet-4-6' → 'claudesonnet46'
    const key = model.toLowerCase().replace(/[^a-z0-9]/g, '');
    return MODEL_TIER_MAP[key] ?? 'haiku45';
}
export function estimateCredits(model, toolName) {
    const tier = normalizeModel(model);
    const baseCost = CREDIT_COST[tier] ?? DEFAULT_CREDIT_COST;
    const READ_TOOLS = new Set(['Read', 'Glob', 'Grep', 'view', 'codebase-retrieval', 'lsp_goto_definition', 'lsp_find_references', 'lsp_workspace_symbols']);
    const HEAVY_TOOLS = new Set(['Bash', 'launch-process', 'web-search', 'web-fetch']);
    if (READ_TOOLS.has(toolName))
        return Math.round(baseCost * 0.6);
    if (HEAVY_TOOLS.has(toolName))
        return Math.round(baseCost * 1.2);
    return baseCost;
}
export function creditsToUsd(credits) {
    return credits * CREDIT_TO_USD;
}
export function getCurrentTimestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}
export function upsertSession(log, sessionId) {
    let session = log.sessions.find(s => s.id === sessionId);
    if (!session) {
        session = {
            id: sessionId,
            start_time: getCurrentTimestamp(),
            tools: [],
            total_estimated_credits: 0,
            credit_cost_usd: 0,
        };
        log.sessions.push(session);
    }
    return session;
}
export function recordToolUsage(session, toolName, model, estimatedCredits, durationMs) {
    session.tools.push({
        name: toolName,
        model,
        estimated_credits: estimatedCredits,
        duration_ms: durationMs,
        timestamp: getCurrentTimestamp(),
    });
    session.total_estimated_credits += estimatedCredits;
    session.credit_cost_usd = creditsToUsd(session.total_estimated_credits);
}
// ─── Tool info extraction ──────────────────────────────────────────────────────
export function extractFromInput(rawInput) {
    try {
        const input = JSON.parse(rawInput);
        return {
            toolName: input.tool_name,
            model: input.model,
            estimatedCredits: Number(input.estimated_credits ?? 0),
            durationMs: Number(input.duration_ms ?? 0),
        };
    }
    catch {
        return {};
    }
}
// ─── Main ─────────────────────────────────────────────────────────────────────
export async function main() {
    const hookType = process.env.HOOK_TYPE ?? 'PostToolUse';
    const omaDir = resolveOmaDir();
    const config = getMergedConfig();
    if (!config.hooks.costTracking) {
        process.exit(0);
        return;
    }
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
        let durationMs = parseInt(env.OMA_DURATION_MS ?? '0', 10);
        // Auggie provides ANTHROPIC_MODEL; use it to derive model and estimate credits
        const auggieModel = env.ANTHROPIC_MODEL;
        if (auggieModel) {
            model = normalizeModel(auggieModel);
        }
        // Fall back to parsing stdin FIRST so toolName/model are correct before estimating
        if (toolName === 'unknown' && rawInput) {
            const extracted = extractFromInput(rawInput);
            toolName = extracted.toolName ?? 'unknown';
            model = extracted.model ?? model;
            durationMs = extracted.durationMs ?? 0;
        }
        // Estimate credits based on best available model + tool class
        const estimatedCredits = estimateCredits(model, toolName);
        const log = readCostLog(omaDir);
        const session = upsertSession(log, sessionId);
        recordToolUsage(session, toolName, model, estimatedCredits, durationMs);
        writeCostLog(omaDir, log);
        // Debug output to stderr
        console.error(`[cost-track] session=${sessionId} tool=${toolName} model=${model} credits=${estimatedCredits} duration=${durationMs}ms`);
        console.error(`[cost-track] Estimated credits: ${estimatedCredits}, Estimated cost: $${creditsToUsd(estimatedCredits).toFixed(6)}`);
    }
    else if (hookType === 'SessionEnd' || hookType === 'session-end') {
        ensureCostLog(omaDir);
        const log = readCostLog(omaDir);
        const session = log.sessions.find(s => s.id === sessionId);
        if (session) {
            console.error(`OMA Cost Summary for session ${sessionId}:`);
            console.error(`  Total estimated credits: ${session.total_estimated_credits}`);
            console.error(`  Estimated cost: $${session.credit_cost_usd.toFixed(6)}`);
            console.error(`  Tools used: ${session.tools.length}`);
        }
    }
    else if (rawInput) {
        // Default: try to record what we can
        const extracted = extractFromInput(rawInput);
        if (extracted.toolName) {
            const log = readCostLog(omaDir);
            const session = upsertSession(log, sessionId);
            recordToolUsage(session, extracted.toolName, extracted.model ?? 'unknown', extracted.estimatedCredits ?? 0, extracted.durationMs ?? 0);
            writeCostLog(omaDir, log);
        }
    }
    process.exit(0);
}
main().catch((err) => {
    console.error(`[cost-track] fatal error: ${err}`);
    process.exit(0); // non-blocking hook, but still log
});
