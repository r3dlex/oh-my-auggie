import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { resolveOmaDir } from '../utils.js';
export const PRICING = {
    opus: { inputPerMillion: 15, outputPerMillion: 75 },
    sonnet: { inputPerMillion: 3, outputPerMillion: 15 },
    haiku: { inputPerMillion: 0.25, outputPerMillion: 1.25 },
    '4o': { inputPerMillion: 2.5, outputPerMillion: 10 },
    '4o-mini': { inputPerMillion: 2.5, outputPerMillion: 10 },
    'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10 },
    'gpt-4o-mini': { inputPerMillion: 2.5, outputPerMillion: 10 },
};
// Default to sonnet pricing
const DEFAULT_PRICING = { inputPerMillion: 3, outputPerMillion: 15 };
// ─── Helpers ─────────────────────────────────────────────────────────────────
function ensureCostLog(omaDir) {
    const logPath = join(omaDir, 'cost-log.json');
    try {
        readFileSync(logPath, 'utf8');
    }
    catch {
        writeFileSync(logPath, JSON.stringify({ sessions: [], version: '0.1' }, null, 2), 'utf8');
    }
}
function readCostLog(omaDir) {
    const logPath = join(omaDir, 'cost-log.json');
    ensureCostLog(omaDir);
    try {
        const content = readFileSync(logPath, 'utf8');
        if (!content.trim()) {
            return { sessions: [], version: '0.1' };
        }
        return JSON.parse(content);
    }
    catch {
        return { sessions: [], version: '0.1' };
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
export function estimateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model.toLowerCase()] ?? DEFAULT_PRICING;
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
    return inputCost + outputCost;
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
            total_tokens: 0,
            estimated_cost_usd: 0,
        };
        log.sessions.push(session);
    }
    return session;
}
export function recordToolUsage(session, toolName, model, inputTokens, outputTokens, durationMs) {
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
// ─── Tool info extraction ──────────────────────────────────────────────────────
export function extractFromInput(rawInput) {
    try {
        const input = JSON.parse(rawInput);
        return {
            toolName: input.tool_name,
            model: input.model,
            inputTokens: Number(input.input_tokens ?? 0),
            outputTokens: Number(input.output_tokens ?? 0),
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
        // Fall back to parsing stdin
        if (toolName === 'unknown' && rawInput) {
            const extracted = extractFromInput(rawInput);
            toolName = extracted.toolName ?? 'unknown';
            model = extracted.model ?? 'unknown';
            inputTokens = extracted.inputTokens ?? 0;
            outputTokens = extracted.outputTokens ?? 0;
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
    }
    else if (hookType === 'SessionEnd' || hookType === 'session-end') {
        ensureCostLog(omaDir);
        const log = readCostLog(omaDir);
        const session = log.sessions.find(s => s.id === sessionId);
        if (session) {
            console.error(`OMA Cost Summary for session ${sessionId}:`);
            console.error(`  Total tokens: ${session.total_tokens}`);
            console.error(`  Estimated cost: $${session.estimated_cost_usd.toFixed(6)}`);
            console.error(`  Tools used: ${session.tools.length}`);
        }
    }
    else if (rawInput) {
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
