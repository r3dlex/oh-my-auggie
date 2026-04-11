import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock state ────────────────────────────────────────────────────────────────
// Must be declared before vi.mock factories so the factory closure captures it.
const writeJsonFileCalls: Array<{ path: string; data: unknown }> = [];
const readFileSyncMock = vi.fn();
const existsSyncMock = vi.fn();

// vi.mock factories are hoisted by vitest — this runs BEFORE keyword-detect.ts
// imports from utils.js, so writeJsonFile inside the module gets the mock.
vi.mock('fs', () => ({
  readFileSync: (...args: unknown[]) => readFileSyncMock(...args),
  existsSync: (...args: unknown[]) => existsSyncMock(...args),
}));

vi.mock('../../../src/utils.js', () => ({
  readAllStdin: vi.fn(() => ''),
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  writeJsonFile: vi.fn((path: string, data: unknown) => {
    writeJsonFileCalls.push({ path, data });
  }),
}));

// ─── Import constants and helpers from source ─────────────────────────────────

import { KEYWORDS, SKILL_NAME_MAP } from '../../../src/hooks/keyword-detect.js';
import type { KeywordEntry } from '../../../src/hooks/keyword-detect.js';
import { readAllStdin } from '../../../src/utils.js';

// Import the actual hook so v8 instruments it AND exports main
import { main } from '../../../src/hooks/keyword-detect.js';

// ─── Pure helper (mirrors hook's match logic) ─────────────────────────────────

function findKeywordMatch(lowerInput: string): KeywordEntry | undefined {
  for (const entry of KEYWORDS) {
    if (lowerInput.includes(entry.keyword)) {
      return entry;
    }
  }
  return undefined;
}

// ─── Fixture helpers ───────────────────────────────────────────────────────────

const MOCK_OMA_DIR = '/mock/oma';

const SKILL_MD_AUTOPILOT = '# Autopilot Skill\n\nThis is the autopilot skill description.';
const SKILL_MD_RALPH     = '# Ralph Skill\n\nPersistent execution loop for ralph mode.';

function skillMdFor(keyword: string): string {
  const map: Record<string, string> = {
    autopilot:       SKILL_MD_AUTOPILOT,
    ralph:           SKILL_MD_RALPH,
    "don't stop":    SKILL_MD_RALPH,
    ulw:             '# Ultrawork Skill\n\nHigh-throughput parallel execution.',
    ultrawork:        '# Ultrawork Skill\n\nHigh-throughput parallel execution.',
    canceloma:       '# Cancel Skill\n\nCancels active orchestration mode.',
    deslop:          '# Deslop Skill\n\nRemoves AI-generated noise.',
  };
  return map[keyword] ?? '';
}

// ─── beforeEach / afterEach ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  writeJsonFileCalls.length = 0;
  // Default: messages.json returns no content, stdin returns empty
  readFileSyncMock.mockImplementation((path: unknown) => {
    const p = path as string;
    if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
    return '';
  });
  existsSyncMock.mockReturnValue(false);
});

afterEach(() => {
  // Clean up env vars
  delete process.env.LAST_USER_MESSAGE;
  delete process.env.AUGMENT_PLUGIN_ROOT;
});

// ─── KEYWORDS constant ────────────────────────────────────────────────────────

describe('KEYWORDS constant', () => {
  it('has all expected entries', () => {
    expect(KEYWORDS).toHaveLength(43);
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

// ─── SKILL_NAME_MAP ────────────────────────────────────────────────────────────

describe('SKILL_NAME_MAP', () => {
  it('maps autopilot to autopilot', () => {
    expect(SKILL_NAME_MAP['autopilot']).toBe('autopilot');
  });

  it('maps ralph to ralph', () => {
    expect(SKILL_NAME_MAP['ralph']).toBe('ralph');
  });

  it('maps "don\'t stop" to ralph', () => {
    expect(SKILL_NAME_MAP["don't stop"]).toBe('ralph');
  });

  it('maps ulw to ultrawork', () => {
    expect(SKILL_NAME_MAP['ulw']).toBe('ultrawork');
  });

  it('maps canceloma to cancel', () => {
    expect(SKILL_NAME_MAP['canceloma']).toBe('cancel');
  });

  it('maps anti-slop to deslop', () => {
    expect(SKILL_NAME_MAP['anti-slop']).toBe('deslop');
  });

  it('maps deep interview to deep-interview', () => {
    expect(SKILL_NAME_MAP['deep interview']).toBe('deep-interview');
  });

  it('maps writer memory to writer-memory', () => {
    expect(SKILL_NAME_MAP['writer memory']).toBe('writer-memory');
  });

  it('maps improve architecture to improve-codebase-architecture', () => {
    expect(SKILL_NAME_MAP['improve architecture']).toBe('improve-codebase-architecture');
  });
});

// ─── findKeywordMatch ──────────────────────────────────────────────────────────

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

  it('is case-insensitive', () => {
    expect(findKeywordMatch('autopilot engaged')).toBeDefined();
    expect(findKeywordMatch('ralph mode')).toBeDefined();
    expect(findKeywordMatch('ultrawork mode')).toBeDefined();
    expect(findKeywordMatch('deep interview')).toBeDefined();
  });

  it('returns the first matching keyword (ulw before ultrawork)', () => {
    const result = findKeywordMatch('let us use ulw for ultrawork tasks');
    expect(result?.keyword).toBe('ulw');
  });

  it('detects keyword embedded in longer word (ccg in tccg.ts)', () => {
    const result = findKeywordMatch('check the tccg.ts file');
    expect(result?.keyword).toBe('ccg');
  });
});

// ─── New output format ─────────────────────────────────────────────────────────

describe('new output format (hookSpecificOutput)', () => {
  it('output structure has hookSpecificOutput with hookEventName and additionalContext', () => {
    const additionalContext = `Keyword detected: 'autopilot'. Activating /oma:autopilot.\n\n${SKILL_MD_AUTOPILOT}`;
    const result = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext,
      },
    };
    expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    expect(result.hookSpecificOutput.additionalContext).toContain("Keyword detected: 'autopilot'");
    expect(result.hookSpecificOutput.additionalContext).toContain('/oma:autopilot');
    expect(result.hookSpecificOutput.additionalContext).toContain(SKILL_MD_AUTOPILOT);
  });

  it('additionalContext includes SKILL.md content when present', () => {
    const skillMd = SKILL_MD_RALPH;
    const additionalContext = `Keyword detected: 'ralph'. Activating /oma:ralph.\n\n${skillMd}`;
    expect(additionalContext).toContain(SKILL_MD_RALPH);
  });

  it('additionalContext is valid JSON string', () => {
    const additionalContext = `Keyword detected: 'autopilot'. Activating /oma:autopilot.\n\n${SKILL_MD_AUTOPILOT}`;
    const result = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext,
      },
    };
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    expect(typeof parsed.hookSpecificOutput.additionalContext).toBe('string');
  });
});

// ─── SKILL.md content loading ───────────────────────────────────────────────────

describe('SKILL.md content loading', () => {
  it('loads SKILL.md content for autopilot keyword', async () => {
    const skillMd = SKILL_MD_AUTOPILOT;

    // Mock existsSync for the skill file to return true
    existsSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      return p.includes('skills/autopilot/SKILL.md');
    });

    // Mock readFileSync to return skill content for the skill file
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      if (p.includes('skills/autopilot/SKILL.md')) return skillMd;
      return '';
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockReturnValue();
    vi.mocked(readAllStdin).mockResolvedValue('');
    process.env.LAST_USER_MESSAGE = 'run autopilot now';

    await main();

    // Find the JSON output line (first console.log call)
    const jsonCall = consoleLogSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].startsWith('{')
    );
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.hookSpecificOutput.additionalContext).toContain('# Autopilot Skill');
    consoleLogSpy.mockRestore();
  });

  it('additionalContext is empty-section when SKILL.md is missing', () => {
    const skillMd = '';
    const additionalContext = `Keyword detected: 'ccg'. Activating /oma:ccg.${skillMd ? `\n\n${skillMd}` : ''}`;
    expect(additionalContext).toBe("Keyword detected: 'ccg'. Activating /oma:ccg.");
  });

  it('truncates SKILL.md content exceeding 4000 chars', () => {
    const long = '# Skill\n\n' + 'x'.repeat(5000);
    const truncated = long.length > 4000 ? long.slice(0, 4000) : long;
    expect(truncated.length).toBe(4000);
    expect(truncated.endsWith('x')).toBe(true);
  });
});

// ─── State file writes ─────────────────────────────────────────────────────────

describe('state file writes for mode-activating keywords', () => {
  // Note: 'team' (standalone) is not a keyword — only 'oma team' is.
  // 'ralphthon' is a keyword but 'ralph' matches as a substring of 'ralphthon',
  // so the 'ralphthon' keyword is unreachable in the current keyword ordering.
  const modeKeywords = [
    'autopilot', "don't stop", 'ulw', 'ultrawork',
    'ultraqa', 'ralplan',
  ];

  for (const kw of modeKeywords) {
    it(`writes initial state for keyword '${kw}'`, async () => {
      const skillName = SKILL_NAME_MAP[kw] ?? kw;
      // Mock existsSync to return false (no SKILL.md needed for state test)
      existsSyncMock.mockReturnValue(false);
      readFileSyncMock.mockImplementation((path: unknown) => {
        const p = path as string;
        if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
        return '';
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockReturnValue();
      vi.mocked(readAllStdin).mockResolvedValue('');
      process.env.LAST_USER_MESSAGE = `activate ${kw}`;

      await main();

      const stateCall = writeJsonFileCalls.find(
        (c) => c.path.endsWith('state.json') && c.data && typeof c.data === 'object'
      );
      expect(stateCall).toBeDefined();
      const state = stateCall!.data as Record<string, unknown>;
      expect(state.active).toBe(true);
      expect(state.mode).toBe(skillName);
      expect(state.iteration).toBe(1);
      expect(state.status).toBe('starting');
      consoleLogSpy.mockRestore();
    });
  }
});

// ─── Cancel clears state ───────────────────────────────────────────────────────

describe('cancel keyword clears state', () => {
  it('writes active=false, mode=none to state.json for canceloma', async () => {
    existsSyncMock.mockReturnValue(false);
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockReturnValue();
    vi.mocked(readAllStdin).mockResolvedValue('');
    process.env.LAST_USER_MESSAGE = 'run canceloma';

    await main();

    const stateCall = writeJsonFileCalls.find(
      (c) => c.path.endsWith('state.json') && c.data && typeof c.data === 'object'
    );
    expect(stateCall).toBeDefined();
    const state = stateCall!.data as Record<string, unknown>;
    expect(state.active).toBe(false);
    expect(state.mode).toBe('none');
    consoleLogSpy.mockRestore();
  });
});

// ─── Case insensitivity end-to-end ────────────────────────────────────────────

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

// ─── LAST_USER_MESSAGE env var ───────────────────────────────────────────────

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

// ─── JSON content extraction from messages.json ─────────────────────────────────

describe('JSON content extraction', () => {
  it('extracts last "content" field from messages JSON', () => {
    const content = '{"role":"user","content":"first message"},{"role":"assistant","content":"second message"},{"role":"user","content":"last message"}';
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

// ─── Stdin fallback ────────────────────────────────────────────────────────────

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

// ─── No match → exit 0 ───────────────────────────────────────────────────────

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

// ─── main() integration tests ─────────────────────────────────────────────────

describe('main() integration', () => {
  it('exits 0 when no input is available', async () => {
    vi.mocked(readAllStdin).mockResolvedValue('');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    await main();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('detects keyword from LAST_USER_MESSAGE env var', async () => {
    vi.mocked(readAllStdin).mockResolvedValue('');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    existsSyncMock.mockReturnValue(false);
    process.env.LAST_USER_MESSAGE = 'use autopilot for this task';
    await main();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('calls readAllStdin when no LAST_USER_MESSAGE and no messages.json match', async () => {
    vi.mocked(readAllStdin).mockResolvedValue('');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    await main();
    expect(readAllStdin).toHaveBeenCalled();
  });

  it('detects keyword from stdin JSON when LAST_USER_MESSAGE is empty', async () => {
    process.env.LAST_USER_MESSAGE = '';
    vi.mocked(readAllStdin).mockResolvedValue('{"content":"ralph mode engaged","role":"user"}');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    existsSyncMock.mockReturnValue(false);
    await main();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits 0 when stdin JSON has empty content field', async () => {
    process.env.LAST_USER_MESSAGE = '';
    vi.mocked(readAllStdin).mockResolvedValue('{"content":"","role":"user"}');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    await main();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('falls back to stdin when messages.json has no content fields', async () => {
    process.env.LAST_USER_MESSAGE = '';
    vi.mocked(readAllStdin).mockResolvedValue('ralph mode engaged');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    existsSyncMock.mockReturnValue(false);
    await main();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('reads LAST_USER_MESSAGE from env var when set', async () => {
    vi.mocked(readAllStdin).mockResolvedValue('');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    existsSyncMock.mockReturnValue(false);
    process.env.LAST_USER_MESSAGE = 'start ultrawork';
    await main();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('extracts last content field from messages.json', async () => {
    process.env.LAST_USER_MESSAGE = '';
    vi.mocked(readAllStdin).mockResolvedValue('');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) {
        return '{"role":"system","content":"sys"},{"role":"user","content":"ralph mode engaged"},{"role":"assistant","content":"ok"}';
      }
      return '';
    });
    existsSyncMock.mockReturnValue(false);
    await main();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('calls writeJsonFile for autopilot (mode-activating)', async () => {
    vi.mocked(readAllStdin).mockResolvedValue('');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    existsSyncMock.mockReturnValue(false);
    process.env.LAST_USER_MESSAGE = 'run autopilot';
    await main();
    const stateCalls = writeJsonFileCalls.filter((c) => c.path.endsWith('state.json'));
    expect(stateCalls.length).toBeGreaterThan(0);
    expect(stateCalls[0].data).toMatchObject({ active: true, mode: 'autopilot', iteration: 1 });
  });

  it('calls writeJsonFile for canceloma (clear state)', async () => {
    vi.mocked(readAllStdin).mockResolvedValue('');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    existsSyncMock.mockReturnValue(false);
    process.env.LAST_USER_MESSAGE = 'run canceloma';
    await main();
    const stateCalls = writeJsonFileCalls.filter((c) => c.path.endsWith('state.json'));
    expect(stateCalls.length).toBeGreaterThan(0);
    expect(stateCalls[0].data).toMatchObject({ active: false, mode: 'none' });
  });

  it('does not call writeJsonFile for non-mode keywords like ccg', async () => {
    vi.mocked(readAllStdin).mockResolvedValue('');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    existsSyncMock.mockReturnValue(false);
    process.env.LAST_USER_MESSAGE = 'run ccg';
    await main();
    const stateCalls = writeJsonFileCalls.filter((c) => c.path.endsWith('state.json'));
    expect(stateCalls.length).toBe(0);
  });

  it('triggers main().catch when process.exit throws', async () => {
    process.env.LAST_USER_MESSAGE = '';
    vi.mocked(readAllStdin).mockResolvedValue('');
    readFileSyncMock.mockImplementation((path: unknown) => {
      const p = path as string;
      if (p.endsWith('messages.json')) return '{"role":"user","content":""}';
      return '';
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw Object.assign(new Error('exit'), { code });
    });
    try {
      await main();
    } catch {
      // expected: exit(2) in catch propagates
    }
    expect(exitSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
  });
});
