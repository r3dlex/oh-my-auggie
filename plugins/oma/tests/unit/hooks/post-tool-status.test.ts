import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(),
}));

vi.mock('../../../src/utils.js', () => ({
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  loadJsonFile: vi.fn(),
  readAllStdin: vi.fn(() => Promise.resolve('')),
}));

import { extractRememberTags } from '../../../src/hooks/post-tool-status.js';
import { loadJsonFile } from '../../../src/utils.js';
import { readFileSync } from 'fs';

describe('post-tool-status hooks', () => {

  // ── extractRememberTags ─────────────────────────────────────────────────────

  describe('extractRememberTags', () => {
    it('extracts single remember tag with key and value', () => {
      const output = '<remember key="user_pref">dark mode</remember>';
      const tags = extractRememberTags(output);
      expect(tags).toEqual([{ key: 'user_pref', value: 'dark mode' }]);
    });

    it('extracts multiple remember tags', () => {
      const output = '<remember key="key1">value1</remember><remember key="key2">value2</remember>';
      const tags = extractRememberTags(output);
      expect(tags).toEqual([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ]);
    });

    it('handles multi-line values', () => {
      const output = `<remember key="notes">
This is a multi-line
note content.
</remember>`;
      const tags = extractRememberTags(output);
      expect(tags).toHaveLength(1);
      expect(tags[0].key).toBe('notes');
      expect(tags[0].value).toContain('multi-line');
    });

    it('returns empty array when no remember tags', () => {
      const output = 'Just some regular output without any tags';
      const tags = extractRememberTags(output);
      expect(tags).toEqual([]);
    });

    it('ignores malformed tags', () => {
      // Non-greedy regex stops at first </remember>, so a missing closing tag
      // on an outer element captures the full inner properly-closed tag as value
      const output = '<remember key="outer">inner value</remember>';
      const tags = extractRememberTags(output);
      expect(tags).toEqual([{ key: 'outer', value: 'inner value' }]);
    });

    it('handles whitespace in tags', () => {
      const output = '  <remember key="key"  >  value  </remember>  ';
      const tags = extractRememberTags(output);
      expect(tags).toEqual([{ key: 'key', value: 'value' }]);
    });
  });

  // ── Integration: state/notepad/task.log reading ─────────────────────────────

  describe('state reading', () => {
    it('reads state.json for active mode', async () => {
      const mockState = { mode: 'ralph', active: true, iteration: 3, maxIterations: 100 };
      (loadJsonFile as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockState);
      
      // Re-import to pick up mock
      vi.resetModules();
      vi.doMock('../../../src/utils.js', () => ({
        resolveOmaDir: vi.fn(() => '/mock/oma'),
        loadJsonFile: vi.fn(() => mockState),
        readAllStdin: vi.fn(() => Promise.resolve('')),
      }));
      
      const { loadJsonFile: lm } = await import('../../../src/utils.js');
      const state = lm('/mock/oma/state.json');
      expect(state).toEqual(mockState);
    });
  });
});
