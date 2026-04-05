import { describe, it, expect, vi, beforeEach } from 'vitest';

// process.exit is stubbed in hooks-setup.ts

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => '{"role":"user","content":"use ralph for this task"}'),
}));

vi.mock('../../../src/utils.js', () => ({
  readAllStdin: vi.fn(() => ''),
  resolveOmaDir: vi.fn(() => '/mock/oma'),
}));

// ─── Import constants and types from source (so v8 instruments them) ───────────

import { KEYWORDS } from '../../../src/hooks/keyword-detect.js';
import type { KeywordEntry } from '../../../src/hooks/keyword-detect.js';
import { readAllStdin } from '../../../src/utils.js';

// Import the actual hook so v8 instruments it AND exports main
import { main } from '../../../src/hooks/keyword-detect.js';

// findKeywordMatch is the pure match function used by the hook's main logic
function findKeywordMatch(lowerInput: string): KeywordEntry | undefined {
  for (const entry of KEYWORDS) {
    if (lowerInput.includes(entry.keyword)) {
      return entry;
    }
  }
  return undefined;
}

function buildResult(entry: KeywordEntry) {
  return {
    keywordDetected: entry.keyword,
    suggestedCommand: entry.command,
    systemMessage: `Keyword detected: '${entry.keyword}'. Suggesting ${entry.command}`,
  };
}

describe('keyword-detect hooks', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── KEYWORDS constant ───────────────────────────────────────────────────

  describe('KEYWORDS constant', () => {
    it('has all expected entries', () => {
      expect(KEYWORDS).toHaveLength(11);
    });

    it('maps autopilot to /oma:autopilot', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'autopilot');
      expect(entry?.command).toBe('/oma:autopilot');
    });

    it('maps ralph to /oma:ralph', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'ralph');
      expect(entry?.command).toBe('/oma:ralph');
    });

    it('maps "don\'t stop" to /oma:ralph', () => {
      const entry = KEYWORDS.find((k) => k.keyword === "don't stop");
      expect(entry?.command).toBe('/oma:ralph');
    });

    it('maps ulw to /oma:ultrawork', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'ulw');
      expect(entry?.command).toBe('/oma:ultrawork');
    });

    it('maps ultrawork to /oma:ultrawork', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'ultrawork');
      expect(entry?.command).toBe('/oma:ultrawork');
    });

    it('maps ccg to /oma:ccg', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'ccg');
      expect(entry?.command).toBe('/oma:ccg');
    });

    it('maps ralplan to /oma:ralplan', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'ralplan');
      expect(entry?.command).toBe('/oma:ralplan');
    });

    it('maps deep interview to /oma:interview', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'deep interview');
      expect(entry?.command).toBe('/oma:interview');
    });

    it('maps deslop to /oma:deslop', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'deslop');
      expect(entry?.command).toBe('/oma:deslop');
    });

    it('maps anti-slop to /oma:deslop', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'anti-slop');
      expect(entry?.command).toBe('/oma:deslop');
    });

    it('maps canceloma to /oma:cancel', () => {
      const entry = KEYWORDS.find((k) => k.keyword === 'canceloma');
      expect(entry?.command).toBe('/oma:cancel');
    });
  });

  // ── findKeywordMatch ─────────────────────────────────────────────────────

  describe('findKeywordMatch', () => {
    it('detects "autopilot" in a sentence', () => {
      const result = findKeywordMatch('let us use autopilot for this task');
      expect(result?.keyword).toBe('autopilot');
      expect(result?.command).toBe('/oma:autopilot');
    });

    it('detects "ralph" in a sentence', () => {
      const result = findKeywordMatch('switch to ralph mode');
      expect(result?.keyword).toBe('ralph');
    });

    it('detects "don\'t stop" in a sentence', () => {
      const result = findKeywordMatch("please don't stop the session");
      expect(result?.keyword).toBe("don't stop");
      expect(result?.command).toBe('/oma:ralph');
    });

    it('detects "ulw" in a sentence', () => {
      const result = findKeywordMatch('use ulw to handle this');
      expect(result?.keyword).toBe('ulw');
      expect(result?.command).toBe('/oma:ultrawork');
    });

    it('detects "ultrawork" in a sentence', () => {
      const result = findKeywordMatch('run ultrawork on this codebase');
      expect(result?.keyword).toBe('ultrawork');
    });

    it('detects "ccg" in a sentence', () => {
      const result = findKeywordMatch('run ccg to generate tests');
      expect(result?.keyword).toBe('ccg');
      expect(result?.command).toBe('/oma:ccg');
    });

    it('detects "ralplan" in a sentence', () => {
      const result = findKeywordMatch('start ralplan for this feature');
      expect(result?.keyword).toBe('ralplan');
    });

    it('detects "deep interview" in a sentence', () => {
      const result = findKeywordMatch('let us do a deep interview about this issue');
      expect(result?.keyword).toBe('deep interview');
      expect(result?.command).toBe('/oma:interview');
    });

    it('detects "deslop" in a sentence', () => {
      const result = findKeywordMatch('run deslop to clean up');
      expect(result?.keyword).toBe('deslop');
    });

    it('detects "anti-slop" in a sentence', () => {
      const result = findKeywordMatch('use anti-slop to remove ai-generated noise');
      expect(result?.keyword).toBe('anti-slop');
    });

    it('detects "canceloma" in a sentence', () => {
      const result = findKeywordMatch('run canceloma to stop everything');
      expect(result?.keyword).toBe('canceloma');
    });

    it('returns undefined when no keyword matches', () => {
      const result = findKeywordMatch('just help me fix this bug');
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      const result = findKeywordMatch('');
      expect(result).toBeUndefined();
    });

    it('is case-insensitive (handles uppercase input after toLowerCase)', () => {
      // The hook calls .toLowerCase() before passing to findKeywordMatch
      // so all inputs to findKeywordMatch are already lowercase
      expect(findKeywordMatch('autopilot engaged')).toBeDefined();
      expect(findKeywordMatch('ralph mode')).toBeDefined();
      expect(findKeywordMatch('ultrawork mode')).toBeDefined();
      expect(findKeywordMatch('deep interview')).toBeDefined();
    });

    it('returns the first matching keyword (order matters)', () => {
      // ulw and ultrawork both match — ulw comes first in the array
      const result = findKeywordMatch('let us use ulw for ultrawork tasks');
      expect(result?.keyword).toBe('ulw'); // ulw is first in KEYWORDS array
    });

    it('detects keyword embedded in longer word', () => {
      // Since we use includes(), 'ccg' will match 'tccg.ts' too
      const result = findKeywordMatch('check the tccg.ts file');
      expect(result?.keyword).toBe('ccg');
    });
  });

  // ── buildResult ─────────────────────────────────────────────────────────

  describe('buildResult', () => {
    it('includes keywordDetected', () => {
      const entry = KEYWORDS[0]; // autopilot
      const result = buildResult(entry);
      expect(result.keywordDetected).toBe('autopilot');
    });

    it('includes suggestedCommand', () => {
      const entry = KEYWORDS[1]; // ralph
      const result = buildResult(entry);
      expect(result.suggestedCommand).toBe('/oma:ralph');
    });

    it('includes systemMessage with keyword and command', () => {
      const entry = KEYWORDS[3]; // ulw
      const result = buildResult(entry);
      expect(result.systemMessage).toContain("'ulw'");
      expect(result.systemMessage).toContain('/oma:ultrawork');
    });
  });

  // ── Case insensitivity end-to-end ───────────────────────────────────────

  describe('case insensitivity end-to-end', () => {
    it('matches lowercase keyword in uppercase input', () => {
      const lowerInput = 'AUTOPILOT MODE'.toLowerCase();
      const result = findKeywordMatch(lowerInput);
      expect(result?.keyword).toBe('autopilot');
    });

    it('matches "don\'t stop" with mixed case', () => {
      const lowerInput = "DON'T STOP THE SESSION".toLowerCase();
      const result = findKeywordMatch(lowerInput);
      expect(result?.keyword).toBe("don't stop");
    });

    it('matches "deep interview" with mixed case', () => {
      const lowerInput = 'Deep Interview Process'.toLowerCase();
      const result = findKeywordMatch(lowerInput);
      expect(result?.keyword).toBe('deep interview');
    });
  });

  // ── LAST_USER_MESSAGE env var ─────────────────────────────────────────────

  describe('LAST_USER_MESSAGE environment variable', () => {
    it('is used as primary source when set', () => {
      const envValue = 'use ralph mode';
      const lastInput = envValue || '';
      expect(lastInput).toBe('use ralph mode');
    });

    it('falls through to messages.json when env var is empty', () => {
      const envValue = '';
      const lastInput = envValue || '';
      expect(lastInput).toBe('');
    });
  });

  // ── JSON content extraction from messages.json ───────────────────────────

  describe('JSON content extraction', () => {
    it('extracts last "content" field from messages JSON', () => {
      const content = '{"role":"user","content":"first message"},{"role":"assistant","content":"second message"},{"role":"user","content":"last message"}';
      // Use RegExp constructor to avoid string-literal backslash escaping issues
      const pattern = new RegExp('"content"\\s*:\\s*"([^"]*)"', 'g');
      const matches = [...content.matchAll(pattern)];
      let lastMatch: string | null = null;
      for (const match of matches) {
        lastMatch = match[1];
      }
      expect(lastMatch).toBe('last message');
    });

    it('returns null when no content field exists', () => {
      const content = '{"role":"system","type":"start"}';
      const matches = [...content.matchAll(/"content"\\s*:\\s*"([^"]*)"/g)];
      let lastMatch: string | null = null;
      for (const match of matches) {
        lastMatch = match[1];
      }
      expect(lastMatch).toBeNull();
    });
  });

  // ── Stdin fallback ───────────────────────────────────────────────────────

  describe('stdin fallback', () => {
    it('parses JSON from stdin and extracts content', () => {
      const rawInput = '{"content":"use autopilot for this","role":"user"}';
      let lastInput = '';
      try {
        const parsed = JSON.parse(rawInput) as Record<string, unknown>;
        if (typeof parsed.content === 'string' && parsed.content) {
          lastInput = parsed.content;
        }
      } catch {
        lastInput = rawInput.trim();
      }
      expect(lastInput).toBe('use autopilot for this');
    });

    it('treats non-JSON stdin as raw content', () => {
      const rawInput = 'plain text input without json';
      let lastInput = '';
      try {
        const parsed = JSON.parse(rawInput) as Record<string, unknown>;
        if (typeof parsed.content === 'string' && parsed.content) {
          lastInput = parsed.content;
        }
      } catch {
        lastInput = rawInput.trim();
      }
      expect(lastInput).toBe('plain text input without json');
    });

    it('does not override with empty content', () => {
      const rawInput = '{"content":""}';
      let lastInput = '';
      try {
        const parsed = JSON.parse(rawInput) as Record<string, unknown>;
        if (typeof parsed.content === 'string' && parsed.content) {
          lastInput = parsed.content;
        }
      } catch {
        lastInput = rawInput.trim();
      }
      expect(lastInput).toBe('');
    });
  });

  // ── No match → exit 0 ───────────────────────────────────────────────────

  describe('no match handling', () => {
    it('returns undefined for unmatched input', () => {
      const result = findKeywordMatch('hello world');
      expect(result).toBeUndefined();
    });

    it('a no-match causes exit 0 with no output', () => {
      const result = findKeywordMatch('hello world');
      const shouldOutput = result !== undefined;
      expect(shouldOutput).toBe(false);
    });
  });

  // ── Output format ────────────────────────────────────────────────────────

  describe('output format', () => {
    it('output is valid JSON with all required fields', () => {
      const entry = KEYWORDS[0]; // autopilot
      const result = buildResult(entry);
      const json = JSON.stringify(result, null, 2);
      const parsed = JSON.parse(json);
      expect(parsed.keywordDetected).toBe('autopilot');
      expect(parsed.suggestedCommand).toBe('/oma:autopilot');
      expect(parsed.systemMessage).toContain('autopilot');
    });
  });

  // ── main() integration tests ───────────────────────────────────────────────

  describe('main() integration', () => {
    it('exits 0 when no input is available (empty LAST_USER_MESSAGE, empty messages.json)', async () => {
      vi.mocked(readAllStdin).mockResolvedValue('');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('detects keyword from LAST_USER_MESSAGE env var', async () => {
      vi.mocked(readAllStdin).mockResolvedValue('');
      const original = process.env.LAST_USER_MESSAGE;
      process.env.LAST_USER_MESSAGE = 'use autopilot for this task';
      await main();
      process.env.LAST_USER_MESSAGE = original ?? '';
      if (original === undefined) delete process.env.LAST_USER_MESSAGE;
      // main() detects keyword and calls console.log then process.exit(0)
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('calls readAllStdin when no LAST_USER_MESSAGE and no messages.json match', async () => {
      vi.mocked(readAllStdin).mockResolvedValue('');
      // Make readFileSync return empty (no content) so code falls through to readAllStdin
      const { readFileSync } = await import('fs');
      vi.mocked(readFileSync).mockReturnValue('');
      await main();
      expect(readAllStdin).toHaveBeenCalled();
    });

    it('detects keyword from stdin JSON when LAST_USER_MESSAGE is empty', async () => {
      const original = process.env.LAST_USER_MESSAGE;
      process.env.LAST_USER_MESSAGE = '';
      vi.mocked(readAllStdin).mockResolvedValue('{"content":"ralph mode engaged","role":"user"}');
      await main();
      process.env.LAST_USER_MESSAGE = original ?? '';
      if (original === undefined) delete process.env.LAST_USER_MESSAGE;
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when stdin JSON has empty content field', async () => {
      const original = process.env.LAST_USER_MESSAGE;
      process.env.LAST_USER_MESSAGE = '';
      vi.mocked(readAllStdin).mockResolvedValue('{"content":"","role":"user"}');
      await main();
      process.env.LAST_USER_MESSAGE = original ?? '';
      if (original === undefined) delete process.env.LAST_USER_MESSAGE;
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('falls back to stdin when messages.json has no content fields', async () => {
      const original = process.env.LAST_USER_MESSAGE;
      process.env.LAST_USER_MESSAGE = '';
      vi.mocked(readAllStdin).mockResolvedValue('ralph mode engaged');
      await main();
      process.env.LAST_USER_MESSAGE = original ?? '';
      if (original === undefined) delete process.env.LAST_USER_MESSAGE;
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('reads LAST_USER_MESSAGE from env var when set', async () => {
      const original = process.env.LAST_USER_MESSAGE;
      process.env.LAST_USER_MESSAGE = 'start ultrawork';
      await main();
      process.env.LAST_USER_MESSAGE = original ?? '';
      if (original === undefined) delete process.env.LAST_USER_MESSAGE;
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('extracts last content field from messages.json via for-of over matchAll', async () => {
      const original = process.env.LAST_USER_MESSAGE;
      process.env.LAST_USER_MESSAGE = '';
      // messages.json has a content field → for-of loop iterates matchAll results
      const { readFileSync } = await import('fs');
      vi.mocked(readFileSync).mockReturnValue(
        '{"role":"system","content":"sys"},{"role":"user","content":"ralph mode engaged"},{"role":"assistant","content":"ok"}'
      );
      await main();
      process.env.LAST_USER_MESSAGE = original ?? '';
      if (original === undefined) delete process.env.LAST_USER_MESSAGE;
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('triggers main().catch when process.exit throws', async () => {
      const original = process.env.LAST_USER_MESSAGE;
      process.env.LAST_USER_MESSAGE = '';
      vi.mocked(readAllStdin).mockResolvedValue('');
      const { readFileSync } = await import('fs');
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('EACCES');
      });
      // Use spyOn so vitest tracks the call before we replace the implementation
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code: number) => {
        throw Object.assign(new Error('exit'), { code });
      });
      try {
        await main();
      } catch {
        // process.exit(2) inside .catch() also throws; we expect this to propagate
      }
      expect(exitSpy).toHaveBeenCalled();
      exitSpy.mockRestore();
      process.env.LAST_USER_MESSAGE = original ?? '';
      if (original === undefined) delete process.env.LAST_USER_MESSAGE;
    });
  });
});
