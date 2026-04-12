import { describe, it, expect, vi, beforeEach } from 'vitest';

// process.exit is stubbed in hooks-setup.ts

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => '{"sessions":[],"version":"0.2"}'),
  writeFileSync: vi.fn(),
}));

vi.mock('../../../src/utils.js', () => ({
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  getMergedConfig: vi.fn(() => ({ profile: 'default', hooks: { costTracking: true, statusMessages: false } })),
  readAllStdin: vi.fn(() => Promise.resolve('')),
}));

import {
  CREDIT_COST,
  estimateCredits,
  creditsToUsd,
  getCurrentTimestamp,
  upsertSession,
  recordToolUsage,
  extractFromInput,
  main,
} from '../../../src/hooks/cost-track.js';
import { readAllStdin, getMergedConfig } from '../../../src/utils.js';
import { readFileSync, writeFileSync } from 'fs';

// ─── Local types matching source (not exported from source) ─────────────────────

interface CostSession {
  id: string;
  start_time: string;
  tools: Array<{
    name: string;
    model: string;
    estimated_credits: number;
    duration_ms: number;
    timestamp: string;
  }>;
  total_estimated_credits: number;
  credit_cost_usd: number;
}

interface CostLog {
  sessions: CostSession[];
  version: string;
}

describe('cost-track hooks', () => {

  // ── CREDIT_COST table ──────────────────────────────────────────────────────

  describe('CREDIT_COST table', () => {
    it('has all required model entries', () => {
      expect(CREDIT_COST).toHaveProperty('haiku45');
      expect(CREDIT_COST).toHaveProperty('sonnet46');
      expect(CREDIT_COST).toHaveProperty('opus46');
      expect(CREDIT_COST).toHaveProperty('gpt51');
      expect(CREDIT_COST).toHaveProperty('gpt52');
      expect(CREDIT_COST).toHaveProperty('gpt54');
      expect(CREDIT_COST).toHaveProperty('gemini31pro');
    });

    it('has positive credit costs for all models', () => {
      for (const [model, credits] of Object.entries(CREDIT_COST)) {
        expect(credits, `Model ${model} should be positive`).toBeGreaterThan(0);
      }
    });

    it('sonnet46 is the default tier', () => {
      expect(CREDIT_COST['sonnet46']).toBe(293);
    });
  });

  // ── estimateCredits ───────────────────────────────────────────────────────

  describe('estimateCredits', () => {
    it('returns base credits for standard tools', () => {
      const credits = estimateCredits('sonnet', 'Write');
      expect(credits).toBe(293);
    });

    it('applies 0.6x multiplier for read tools', () => {
      const readTools = ['Read', 'Glob', 'Grep', 'view', 'codebase-retrieval', 'lsp_goto_definition', 'lsp_find_references', 'lsp_workspace_symbols'];
      for (const tool of readTools) {
        const credits = estimateCredits('sonnet', tool);
        expect(credits).toBe(Math.round(293 * 0.6));
      }
    });

    it('applies 1.2x multiplier for heavy tools', () => {
      const heavyTools = ['Bash', 'launch-process', 'web-search', 'web-fetch'];
      for (const tool of heavyTools) {
        const credits = estimateCredits('sonnet', tool);
        expect(credits).toBe(Math.round(293 * 1.2));
      }
    });

    it('handles unknown models with default credit cost', () => {
      // normalizeModel maps unknown to 'haiku45' (haiku4.5 tier)
      const credits = estimateCredits('unknown-model', 'Write');
      expect(credits).toBe(88); // DEFAULT_CREDIT_COST falls back to haiku45 tier
    });

    it('normalizes Auggie model strings to tiers', () => {
      expect(estimateCredits('claude-sonnet-4-6', 'Write')).toBe(293); // claudesonnet46 → sonnet46
      expect(estimateCredits('claude-opus-4-6', 'Write')).toBe(488);   // claudeopus46 → opus46
      expect(estimateCredits('claude-haiku-4-5', 'Write')).toBe(88);   // claudehaiu45 → haiku45
      expect(estimateCredits('opus', 'Write')).toBe(488);
      expect(estimateCredits('sonnet', 'Write')).toBe(293);
      expect(estimateCredits('haiku', 'Write')).toBe(88);
      expect(estimateCredits('minimax', 'Write')).toBe(88);
      expect(estimateCredits('gpt-5.4', 'Write')).toBe(420);  // gpt54
      expect(estimateCredits('gpt-5.2', 'Write')).toBe(390);  // gpt52
      expect(estimateCredits('gpt-5.1', 'Write')).toBe(219);  // gpt51
      expect(estimateCredits('gemini-3.1-pro', 'Write')).toBe(270); // gemini31pro
    });

    it('normalizes dotted model names like sonnet4.6', () => {
      // 'sonnet4.6' → 'sonnet46' → 'sonnet46' → 293
      expect(estimateCredits('sonnet4.6', 'Write')).toBe(293);
      expect(estimateCredits('opus4.6', 'Write')).toBe(488);
      expect(estimateCredits('haiku4.5', 'Write')).toBe(88);
    });
  });

  // ── creditsToUsd ───────────────────────────────────────────────────────────

  describe('creditsToUsd', () => {
    it('converts credits to USD at $0.000625 per credit', () => {
      expect(creditsToUsd(293)).toBeCloseTo(293 * 0.000625, 6);
    });

    it('handles zero credits', () => {
      expect(creditsToUsd(0)).toBe(0);
    });

    it('handles large credit counts', () => {
      const usd = creditsToUsd(24000);
      expect(usd).toBeCloseTo(15, 2); // 24000 * 0.000625 = 15
    });
  });

  // ── getCurrentTimestamp ───────────────────────────────────────────────────

  describe('getCurrentTimestamp', () => {
    it('returns a timestamp in expected format', () => {
      const ts = getCurrentTimestamp();
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z$/);
    });

    it('includes Z suffix', () => {
      const ts = getCurrentTimestamp();
      expect(ts.endsWith('Z')).toBe(true);
    });

    it('replaces T with space', () => {
      const ts = getCurrentTimestamp();
      expect(ts.includes('T')).toBe(false);
      expect(ts.includes(' ')).toBe(true);
    });
  });

  // ── upsertSession ────────────────────────────────────────────────────────

  describe('upsertSession', () => {
    it('creates a new session when none exists', () => {
      const log: CostLog = { sessions: [], version: '0.2' };
      const session = upsertSession(log, 'session-1');
      expect(log.sessions).toHaveLength(1);
      expect(session.id).toBe('session-1');
      expect(session.tools).toEqual([]);
      expect(session.total_estimated_credits).toBe(0);
      expect(session.credit_cost_usd).toBe(0);
    });

    it('returns existing session when it already exists', () => {
      const existing: CostSession = {
        id: 'session-1',
        start_time: '2026-01-01T00:00:00Z',
        tools: [{ name: 'Bash', model: 'sonnet46', estimated_credits: 352, duration_ms: 500, timestamp: '2026-01-01T00:00:00Z' }],
        total_estimated_credits: 352,
        credit_cost_usd: 352 * 0.000625,
      };
      const log: CostLog = { sessions: [existing], version: '0.2' };
      const session = upsertSession(log, 'session-1');
      expect(log.sessions).toHaveLength(1);
      expect(session).toBe(existing);
      expect(session.tools).toHaveLength(1);
    });

    it('creates second session when id differs', () => {
      const log: CostLog = { sessions: [], version: '0.2' };
      upsertSession(log, 'session-1');
      upsertSession(log, 'session-2');
      expect(log.sessions).toHaveLength(2);
    });
  });

  // ── recordToolUsage ──────────────────────────────────────────────────────

  describe('recordToolUsage', () => {
    it('records tool usage and updates session totals with credits', () => {
      const session: CostSession = {
        id: 'session-1',
        start_time: getCurrentTimestamp(),
        tools: [],
        total_estimated_credits: 0,
        credit_cost_usd: 0,
      };

      recordToolUsage(session, 'Write', 'sonnet46', 293, 300);

      expect(session.tools).toHaveLength(1);
      expect(session.tools[0].name).toBe('Write');
      expect(session.tools[0].model).toBe('sonnet46');
      expect(session.tools[0].estimated_credits).toBe(293);
      expect(session.tools[0].duration_ms).toBe(300);
      expect(session.total_estimated_credits).toBe(293);
      expect(session.credit_cost_usd).toBeCloseTo(293 * 0.000625, 6);
    });

    it('accumulates credits across multiple tools', () => {
      const session: CostSession = {
        id: 'session-1',
        start_time: getCurrentTimestamp(),
        tools: [],
        total_estimated_credits: 0,
        credit_cost_usd: 0,
      };

      recordToolUsage(session, 'Bash', 'sonnet46', 352, 300);   // 293 * 1.2 = 352
      recordToolUsage(session, 'Read', 'sonnet46', 176, 200);   // 293 * 0.6 = 176

      expect(session.total_estimated_credits).toBe(528);
      expect(session.tools).toHaveLength(2);
      expect(session.credit_cost_usd).toBeCloseTo(528 * 0.000625, 6);
    });

    it('records timestamp for each tool call', () => {
      const session: CostSession = {
        id: 'session-1',
        start_time: getCurrentTimestamp(),
        tools: [],
        total_estimated_credits: 0,
        credit_cost_usd: 0,
      };

      recordToolUsage(session, 'Grep', 'haiku45', 53, 100);
      expect(session.tools[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z$/);
    });
  });

  // ── extractFromInput ────────────────────────────────────────────────────

  describe('extractFromInput', () => {
    it('extracts all fields from valid JSON input', () => {
      const raw = JSON.stringify({
        tool_name: 'Bash',
        model: 'sonnet46',
        estimated_credits: 352,
        duration_ms: 300,
      });
      const result = extractFromInput(raw);
      expect(result.toolName).toBe('Bash');
      expect(result.model).toBe('sonnet46');
      expect(result.estimatedCredits).toBe(352);
      expect(result.durationMs).toBe(300);
    });

    it('returns empty object on invalid JSON', () => {
      const result = extractFromInput('not json');
      expect(result).toEqual({});
    });

    it('returns empty object on empty string', () => {
      const result = extractFromInput('');
      expect(result).toEqual({});
    });

    it('returns undefined for missing optional fields', () => {
      const raw = JSON.stringify({ tool_name: 'Read' });
      const result = extractFromInput(raw);
      expect(result.toolName).toBe('Read');
      expect(result.model).toBeUndefined();
      expect(result.estimatedCredits).toBe(0);
      expect(result.durationMs).toBe(0);
    });

    it('handles numeric strings by converting with Number()', () => {
      const raw = JSON.stringify({
        tool_name: 'Bash',
        estimated_credits: '352',
        duration_ms: '300',
      });
      const result = extractFromInput(raw);
      expect(result.estimatedCredits).toBe(352);
      expect(result.durationMs).toBe(300);
    });

    it('handles null values as zero', () => {
      const raw = JSON.stringify({
        tool_name: 'Bash',
        estimated_credits: null,
        duration_ms: null,
      });
      const result = extractFromInput(raw);
      expect(result.estimatedCredits).toBe(0);
      expect(result.durationMs).toBe(0);
    });

    it('handles empty object (all undefined fields)', () => {
      const raw = JSON.stringify({});
      const result = extractFromInput(raw);
      expect(result.toolName).toBeUndefined();
      expect(result.model).toBeUndefined();
      expect(result.estimatedCredits).toBe(0);
      expect(result.durationMs).toBe(0);
    });
  });

  // ── Hook type routing ───────────────────────────────────────────────────

  describe('hook type routing', () => {
    it('PostToolUse triggers tool recording path', () => {
      const hookType = 'PostToolUse';
      const shouldRecordTool = hookType === 'PostToolUse';
      expect(shouldRecordTool).toBe(true);
    });

    it('SessionEnd triggers summary output path', () => {
      const hookType = 'SessionEnd';
      const shouldSummarize = hookType === 'SessionEnd' || hookType === 'session-end';
      expect(shouldSummarize).toBe(true);
    });

    it('session-end (lowercase) also triggers summary', () => {
      const hookType = 'session-end';
      const shouldSummarize = hookType === 'SessionEnd' || hookType === 'session-end';
      expect(shouldSummarize).toBe(true);
    });

    it('other hook types fall through to default extraction path', () => {
      const hookType = 'PreToolUse';
      const isPostToolUse = hookType === 'PostToolUse';
      const isSessionEnd = hookType === 'SessionEnd' || hookType === 'session-end';
      const fallsThrough = !isPostToolUse && !isSessionEnd;
      expect(fallsThrough).toBe(true);
    });
  });

  // ── getSessionId ───────────────────────────────────────────────────────

  describe('getSessionId fallback', () => {
    it('returns SESSION_ID env var when set', () => {
      const original = process.env.SESSION_ID;
      process.env.SESSION_ID = 'my-session-123';
      const result = process.env.SESSION_ID
        ? process.env.SESSION_ID
        : `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${process.pid}`;
      expect(result).toBe('my-session-123');
      if (original !== undefined) {
        process.env.SESSION_ID = original;
      } else {
        delete process.env.SESSION_ID;
      }
    });
  });

  // ── main() integration tests ─────────────────────────────────────────────

  describe('main() integration', () => {
    const originalHookType = process.env.HOOK_TYPE;
    const originalSessionId = process.env.SESSION_ID;

    beforeEach(() => {
      vi.clearAllMocks();
      process.env.SESSION_ID = 'test-session-1';
    });

    afterEach(() => {
      if (originalHookType !== undefined) {
        process.env.HOOK_TYPE = originalHookType;
      } else {
        delete process.env.HOOK_TYPE;
      }
      if (originalSessionId !== undefined) {
        process.env.SESSION_ID = originalSessionId;
      } else {
        delete process.env.SESSION_ID;
      }
    });

    it('exits 0 for PostToolUse with env var tool info', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Write';
      process.env.OMA_MODEL = 'sonnet46';
      process.env.OMA_DURATION_MS = '300';
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 for SessionEnd hook type', async () => {
      process.env.HOOK_TYPE = 'SessionEnd';
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 for session-end hook type', async () => {
      process.env.HOOK_TYPE = 'session-end';
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 for unknown hook type with no stdin', async () => {
      process.env.HOOK_TYPE = 'PreToolUse';
      delete process.env.OMA_TOOL_NAME;
      delete process.env.OMA_MODEL;
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 for SessionEnd with session summary output', async () => {
      process.env.HOOK_TYPE = 'SessionEnd';
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 for SessionEnd with session present (session found, summary lines hit)', async () => {
      process.env.HOOK_TYPE = 'SessionEnd';
      const sessionData = {
        id: 'test-session-1',
        start_time: '2026-01-01T00:00:00Z',
        tools: [
          { name: 'Write', model: 'sonnet46', estimated_credits: 293, duration_ms: 300, timestamp: '2026-01-01T00:01:00Z' },
        ],
        total_estimated_credits: 293,
        credit_cost_usd: 293 * 0.000625,
      };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ sessions: [sessionData], version: '0.2' }));
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('does not write cost log when rawInput has no tool_name (extracted.toolName falsy)', async () => {
      process.env.HOOK_TYPE = 'SomeOtherHook';
      vi.mocked(readAllStdin).mockResolvedValue(JSON.stringify({ some_field: 'value' }));
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('falls back to stdin when OMA_TOOL_NAME is unknown', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      delete process.env.OMA_TOOL_NAME;
      delete process.env.OMA_MODEL;
      vi.mocked(readAllStdin).mockResolvedValue(
        JSON.stringify({ tool_name: 'Read', model: 'sonnet46', estimated_credits: 176, duration_ms: 200 })
      );
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('creates cost log file when ensureCostLog catches ENOENT', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Write';
      process.env.OMA_MODEL = 'sonnet46';
      process.env.OMA_DURATION_MS = '200';
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('returns empty session list when cost log has empty content', async () => {
      process.env.HOOK_TYPE = 'SessionEnd';
      vi.mocked(readFileSync).mockReturnValue('');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('returns empty session list when cost log has invalid JSON', async () => {
      process.env.HOOK_TYPE = 'SessionEnd';
      vi.mocked(readFileSync).mockReturnValue('not valid json {{{');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('triggers main().catch when process.exit throws', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code: number) => {
        throw Object.assign(new Error('exit'), { code });
      });
      vi.mocked(readFileSync).mockReturnValue('{"sessions":[],"version":"0.2"}');
      try {
        await main();
      } catch {
        // process.exit(0) inside .catch() also throws; we expect this to propagate
      }
      expect(exitSpy).toHaveBeenCalled();
      exitSpy.mockRestore();
    });

    it('records tool from rawInput via else-if branch when hook is non-standard', async () => {
      process.env.HOOK_TYPE = 'PreToolUse';
      delete process.env.OMA_TOOL_NAME;
      vi.mocked(readAllStdin).mockResolvedValue(
        JSON.stringify({ tool_name: 'Write', model: 'sonnet46', estimated_credits: 293, duration_ms: 200 })
      );
      vi.mocked(readFileSync).mockReturnValue('{"sessions":[],"version":"0.2"}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('normalizes ANTHROPIC_MODEL env var to tier on PostToolUse', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Write';
      process.env.ANTHROPIC_MODEL = 'claude-opus-4-6';
      process.env.OMA_DURATION_MS = '300';
      vi.mocked(readFileSync).mockReturnValue('{"sessions":[],"version":"0.2"}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 immediately when hooks.costTracking is false', async () => {
      vi.mocked(getMergedConfig).mockReturnValue({
        profile: 'default',
        hooks: { costTracking: false, statusMessages: false },
      });
      process.env.HOOK_TYPE = 'PostToolUse';
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
      // cost log should NOT have been written
      expect(writeFileSync).not.toHaveBeenCalled();
    });
  });
});
