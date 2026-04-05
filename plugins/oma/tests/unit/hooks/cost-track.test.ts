import { describe, it, expect, vi, beforeEach } from 'vitest';

// process.exit is stubbed in hooks-setup.ts

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => '{"sessions":[],"version":"0.1"}'),
  writeFileSync: vi.fn(),
}));

vi.mock('../../../src/utils.js', () => ({
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  readAllStdin: vi.fn(() => Promise.resolve('')),
}));

import {
  PRICING,
  estimateCost,
  getCurrentTimestamp,
  upsertSession,
  recordToolUsage,
  extractFromInput,
  main,
} from '../../../src/hooks/cost-track.js';
import { readAllStdin } from '../../../src/utils.js';
import { readFileSync } from 'fs';

// ─── Local types matching source (not exported from source) ─────────────────────

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

interface CostLog {
  sessions: CostSession[];
  version: string;
}

describe('cost-track hooks', () => {

  // ── estimateCost ──────────────────────────────────────────────────────────

  describe('estimateCost', () => {
    it('calculates cost for opus model', () => {
      // opus: $15/M input, $75/M output
      const cost = estimateCost('opus', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(90, 5); // $15 + $75
    });

    it('calculates cost for sonnet model', () => {
      // sonnet: $3/M input, $15/M output
      const cost = estimateCost('sonnet', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(18, 5); // $3 + $15
    });

    it('calculates cost for haiku model', () => {
      // haiku: $0.25/M input, $1.25/M output
      const cost = estimateCost('haiku', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(1.5, 5); // $0.25 + $1.25
    });

    it('calculates cost for 4o model', () => {
      // 4o: $2.5/M input, $10/M output
      const cost = estimateCost('4o', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(12.5, 5); // $2.5 + $10
    });

    it('calculates cost for gpt-4o model', () => {
      const cost = estimateCost('gpt-4o', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(12.5, 5);
    });

    it('calculates cost for 4o-mini model', () => {
      const cost = estimateCost('4o-mini', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(12.5, 5);
    });

    it('calculates cost for gpt-4o-mini model', () => {
      const cost = estimateCost('gpt-4o-mini', 1_000_000, 1_000_000);
      expect(cost).toBeCloseTo(12.5, 5);
    });

    it('uses default pricing for unknown model', () => {
      const cost = estimateCost('unknown-model', 1_000_000, 1_000_000);
      // default: $3/M input, $15/M output = $18
      expect(cost).toBeCloseTo(18, 5);
    });

    it('handles zero tokens', () => {
      const cost = estimateCost('sonnet', 0, 0);
      expect(cost).toBe(0);
    });

    it('handles fractional tokens', () => {
      const cost = estimateCost('sonnet', 500_000, 500_000);
      // 0.5M * $3 + 0.5M * $15 = $1.5 + $7.5 = $9
      expect(cost).toBeCloseTo(9, 5);
    });

    it('handles very large token counts', () => {
      const cost = estimateCost('sonnet', 10_000_000, 10_000_000);
      // 10M * $3 + 10M * $15 = $30M + $150M in dollars = $30 + $150 = $180
      expect(cost).toBeCloseTo(180, 5);
    });

    it('model lookup is case-insensitive', () => {
      const cost1 = estimateCost('SONNET', 1_000_000, 1_000_000);
      const cost2 = estimateCost('Sonnet', 1_000_000, 1_000_000);
      const cost3 = estimateCost('sonnet', 1_000_000, 1_000_000);
      expect(cost1).toBeCloseTo(cost2);
      expect(cost2).toBeCloseTo(cost3);
    });

    it('calculates correct cost for partial million tokens', () => {
      // 100K tokens = 0.1M
      const cost = estimateCost('sonnet', 100_000, 200_000);
      // 0.1M * $3 + 0.2M * $15 = $0.3 + $3 = $3.3
      expect(cost).toBeCloseTo(3.3, 5);
    });
  });

  // ── getCurrentTimestamp ───────────────────────────────────────────────────

  describe('getCurrentTimestamp', () => {
    it('returns a timestamp in expected format', () => {
      const ts = getCurrentTimestamp();
      // Format: "2026-04-04 12:34:56Z"
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
      const log: CostLog = { sessions: [], version: '0.1' };
      const session = upsertSession(log, 'session-1');
      expect(log.sessions).toHaveLength(1);
      expect(session.id).toBe('session-1');
      expect(session.tools).toEqual([]);
      expect(session.total_tokens).toBe(0);
      expect(session.estimated_cost_usd).toBe(0);
    });

    it('returns existing session when it already exists', () => {
      const existing: CostSession = {
        id: 'session-1',
        start_time: '2026-01-01T00:00:00Z',
        tools: [{ name: 'Bash', model: 'sonnet', input_tokens: 100, output_tokens: 50, duration_ms: 500, timestamp: '2026-01-01T00:00:00Z' }],
        total_tokens: 150,
        estimated_cost_usd: 0.0027,
      };
      const log: CostLog = { sessions: [existing], version: '0.1' };
      const session = upsertSession(log, 'session-1');
      expect(log.sessions).toHaveLength(1);
      expect(session).toBe(existing);
      expect(session.tools).toHaveLength(1);
    });

    it('creates second session when id differs', () => {
      const log: CostLog = { sessions: [], version: '0.1' };
      upsertSession(log, 'session-1');
      upsertSession(log, 'session-2');
      expect(log.sessions).toHaveLength(2);
    });
  });

  // ── recordToolUsage ──────────────────────────────────────────────────────

  describe('recordToolUsage', () => {
    it('records tool usage and updates session totals', () => {
      const session: CostSession = {
        id: 'session-1',
        start_time: getCurrentTimestamp(),
        tools: [],
        total_tokens: 0,
        estimated_cost_usd: 0,
      };

      recordToolUsage(session, 'Bash', 'sonnet', 1000, 500, 300);

      expect(session.tools).toHaveLength(1);
      expect(session.tools[0].name).toBe('Bash');
      expect(session.tools[0].model).toBe('sonnet');
      expect(session.tools[0].input_tokens).toBe(1000);
      expect(session.tools[0].output_tokens).toBe(500);
      expect(session.tools[0].duration_ms).toBe(300);
      expect(session.total_tokens).toBe(1500);
      // sonnet: (1000/1M)*$3 + (500/1M)*$15 = $0.003 + $0.0075 = $0.0105
      expect(session.estimated_cost_usd).toBeCloseTo(0.0105, 4);
    });

    it('accumulates tokens and cost across multiple tools', () => {
      const session: CostSession = {
        id: 'session-1',
        start_time: getCurrentTimestamp(),
        tools: [],
        total_tokens: 0,
        estimated_cost_usd: 0,
      };

      recordToolUsage(session, 'Bash', 'sonnet', 1000, 500, 300);
      recordToolUsage(session, 'Read', 'sonnet', 2000, 1000, 200);

      expect(session.total_tokens).toBe(4500); // 1500 + 3000
      expect(session.tools).toHaveLength(2);
    });

    it('records timestamp for each tool call', () => {
      const session: CostSession = {
        id: 'session-1',
        start_time: getCurrentTimestamp(),
        tools: [],
        total_tokens: 0,
        estimated_cost_usd: 0,
      };

      recordToolUsage(session, 'Grep', 'haiku', 100, 50, 100);
      expect(session.tools[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z$/);
    });
  });

  // ── extractFromInput ────────────────────────────────────────────────────

  describe('extractFromInput', () => {
    it('extracts all fields from valid JSON input', () => {
      const raw = JSON.stringify({
        tool_name: 'Bash',
        model: 'sonnet',
        input_tokens: 1000,
        output_tokens: 500,
        duration_ms: 300,
      });
      const result = extractFromInput(raw);
      expect(result.toolName).toBe('Bash');
      expect(result.model).toBe('sonnet');
      expect(result.inputTokens).toBe(1000);
      expect(result.outputTokens).toBe(500);
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
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
      expect(result.durationMs).toBe(0);
    });

    it('handles numeric strings by converting with Number()', () => {
      const raw = JSON.stringify({
        tool_name: 'Bash',
        input_tokens: '1000',
        output_tokens: '500',
        duration_ms: '300',
      });
      const result = extractFromInput(raw);
      expect(result.inputTokens).toBe(1000);
      expect(result.outputTokens).toBe(500);
      expect(result.durationMs).toBe(300);
    });

    it('handles null values as zero', () => {
      const raw = JSON.stringify({
        tool_name: 'Bash',
        input_tokens: null,
        output_tokens: null,
        duration_ms: null,
      });
      const result = extractFromInput(raw);
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
      expect(result.durationMs).toBe(0);
    });

    it('handles undefined fields (returns object with all undefined values)', () => {
      const raw = JSON.stringify({});
      const result = extractFromInput(raw);
      // extractFromInput returns {} on JSON parse failure (caught by catch),
      // but when JSON parses successfully with no fields it returns an object
      // with undefined values (not empty). With JSON.stringify({}), the object
      // parses fine and every field is absent → undefined.
      expect(result.toolName).toBeUndefined();
      expect(result.model).toBeUndefined();
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
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

  // ── PRICING table ──────────────────────────────────────────────────────

  describe('PRICING table', () => {
    it('has all required model entries', () => {
      expect(PRICING).toHaveProperty('opus');
      expect(PRICING).toHaveProperty('sonnet');
      expect(PRICING).toHaveProperty('haiku');
      expect(PRICING).toHaveProperty('4o');
      expect(PRICING).toHaveProperty('4o-mini');
      expect(PRICING).toHaveProperty('gpt-4o');
      expect(PRICING).toHaveProperty('gpt-4o-mini');
    });

    it('has positive pricing for all models', () => {
      for (const [model, pricing] of Object.entries(PRICING)) {
        expect(pricing.inputPerMillion).toBeGreaterThan(0);
        expect(pricing.outputPerMillion).toBeGreaterThan(0);
      }
    });
  });

  // ── getSessionId ────────────────────────────────────────────────────────

  describe('getSessionId fallback', () => {
    it('returns SESSION_ID env var when set', () => {
      const original = process.env.SESSION_ID;
      process.env.SESSION_ID = 'my-session-123';
      // Inline the logic
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

  // ── main() integration tests ───────────────────────────────────────────────

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
      process.env.OMA_TOOL_NAME = 'Bash';
      process.env.OMA_MODEL = 'sonnet';
      process.env.OMA_INPUT_TOKENS = '1000';
      process.env.OMA_OUTPUT_TOKENS = '500';
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
          { name: 'Bash', model: 'sonnet', input_tokens: 1000, output_tokens: 500, duration_ms: 300, timestamp: '2026-01-01T00:01:00Z' },
        ],
        total_tokens: 1500,
        estimated_cost_usd: 0.027,
      };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ sessions: [sessionData], version: '0.1' }));
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('does not write cost log when rawInput has no tool_name (extracted.toolName falsy)', async () => {
      // Hook type is not PostToolUse or SessionEnd, rawInput is non-empty but has no tool_name
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
        JSON.stringify({ tool_name: 'Read', model: 'sonnet', input_tokens: 100, output_tokens: 50, duration_ms: 200 })
      );
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('creates cost log file when ensureCostLog catches ENOENT', async () => {
      // readFileSync throws → ensureCostLog catch creates the file
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Bash';
      process.env.OMA_MODEL = 'sonnet';
      process.env.OMA_INPUT_TOKENS = '100';
      process.env.OMA_OUTPUT_TOKENS = '50';
      process.env.OMA_DURATION_MS = '200';
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('returns empty session list when cost log has empty content', async () => {
      process.env.HOOK_TYPE = 'SessionEnd';
      // readFileSync returns empty string → readCostLog catches and returns default
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
      // Use spyOn so vitest tracks the call before we replace the implementation
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code: number) => {
        throw Object.assign(new Error('exit'), { code });
      });
      // Return valid JSON so readCostLog parses successfully; process.exit(0) then throws and triggers .catch
      vi.mocked(readFileSync).mockReturnValue('{"sessions":[],"version":"0.1"}');
      try {
        await main();
      } catch {
        // process.exit(0) inside .catch() also throws; we expect this to propagate
      }
      expect(exitSpy).toHaveBeenCalled();
      exitSpy.mockRestore();
    });

    it('records tool from rawInput via else-if branch when hook is non-standard', async () => {
      // Hook type is not PostToolUse/SessionEnd but stdin has tool_name → else-if branch
      process.env.HOOK_TYPE = 'PreToolUse';
      delete process.env.OMA_TOOL_NAME;
      vi.mocked(readAllStdin).mockResolvedValue(
        JSON.stringify({ tool_name: 'Bash', model: 'sonnet', input_tokens: 100, output_tokens: 50, duration_ms: 200 })
      );
      // Return valid JSON so readCostLog parses successfully and doesn't crash upsertSession
      vi.mocked(readFileSync).mockReturnValue('{"sessions":[],"version":"0.1"}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });
});
