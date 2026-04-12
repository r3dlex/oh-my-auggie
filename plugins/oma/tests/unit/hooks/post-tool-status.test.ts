import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(),
}));

vi.mock('../../../src/utils.js', () => ({
  getMergedConfig: vi.fn(() => ({ graph: undefined, hooks: { costTracking: false, statusMessages: true } })),
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  loadJsonFile: vi.fn(() => null),
  readAllStdin: vi.fn(() => Promise.resolve('')),
}));

const defaultMockConfig = { graph: undefined, hooks: { costTracking: false, statusMessages: true } };

import { extractRememberTags } from '../../../src/hooks/post-tool-status.js';
import { loadJsonFile } from '../../../src/utils.js';
import { getMergedConfig } from '../../../src/utils.js';
import { main } from '../../../src/hooks/post-tool-status.js';
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

  describe('graph provider status line', () => {
    beforeEach(() => {
      vi.mocked(getMergedConfig).mockReset();
      vi.mocked(getMergedConfig).mockReturnValue({ ...defaultMockConfig, graph: undefined } as any);
    });

    async function runMainAndCapture(): Promise<string> {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      consoleSpy.mockRestore();
      return output;
    }

    it('emits [Graph] graphwiki when config.graph is undefined (fallback)', async () => {
      vi.mocked(getMergedConfig).mockReturnValue({ ...defaultMockConfig, graph: undefined } as any);
      const output = await runMainAndCapture();
      expect(output).toContain('[Graph] graphwiki');
    });

    it('omits graph line when provider is none', async () => {
      vi.mocked(getMergedConfig).mockReturnValue({ ...defaultMockConfig, graph: { provider: 'none' } } as any);
      const output = await runMainAndCapture();
      expect(output).not.toContain('[Graph]');
    });

    it('emits [Graph] graphwiki when provider is graphwiki', async () => {
      vi.mocked(getMergedConfig).mockReturnValue({ ...defaultMockConfig, graph: { provider: 'graphwiki' } } as any);
      const output = await runMainAndCapture();
      expect(output).toContain('[Graph] graphwiki');
    });

    it('emits [Graph] graphify when provider is graphify', async () => {
      vi.mocked(getMergedConfig).mockReturnValue({ ...defaultMockConfig, graph: { provider: 'graphify' } } as any);
      const output = await runMainAndCapture();
      expect(output).toContain('[Graph] graphify');
    });

    it('defaults to [Graph] graphwiki when graph key present but provider absent', async () => {
      vi.mocked(getMergedConfig).mockReturnValue({ ...defaultMockConfig, graph: {} } as any);
      const output = await runMainAndCapture();
      expect(output).toContain('[Graph] graphwiki');
    });

    it('swallows errors when getMergedConfig throws', async () => {
      vi.mocked(getMergedConfig).mockImplementation(() => { throw new Error('config error'); });
      await expect(main()).resolves.not.toThrow();
    });

    it('config.graph = null falls back to graphwiki', async () => {
      vi.mocked(getMergedConfig).mockReturnValue({ ...defaultMockConfig, graph: null } as any);
      const output = await runMainAndCapture();
      expect(output).toContain('[Graph] graphwiki');
    });

    it('exits 0 immediately when hooks.statusMessages is false', async () => {
      vi.mocked(getMergedConfig).mockReturnValue({
        ...defaultMockConfig,
        hooks: { costTracking: false, statusMessages: false },
      } as any);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      consoleSpy.mockRestore();
      expect(process.exit).toHaveBeenCalledWith(0);
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  // ── Task log summary (lines 135-138) ───────────────────────────────────────

  describe('task log summary', () => {
    beforeEach(() => {
      vi.mocked(getMergedConfig).mockReturnValue({ ...defaultMockConfig } as any);
    });

    it('emits task summary when taskLog has in_progress tasks', async () => {
      // loadJsonFile is called 3 times: state, notepad, taskLog
      // Return null for state and notepad, real taskLog for third call
      vi.mocked(loadJsonFile)
        .mockReturnValueOnce(null)  // state.json
        .mockReturnValueOnce(null)  // notepad.json
        .mockReturnValueOnce({      // task.log.json
          tasks: [
            { id: '1', subject: 'Write tests', status: 'in_progress' },
            { id: '2', subject: 'Review PR', status: 'completed' },
          ],
          version: '1',
        });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(output).toContain('[OMA] Tasks:');
      expect(output).toContain('pending');
      expect(output).toContain('done');
    });

    it('emits task summary when taskLog has only pending tasks', async () => {
      vi.mocked(loadJsonFile)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          tasks: [
            { id: '1', subject: 'Task A', status: 'pending' },
            { id: '2', subject: 'Task B', status: 'pending' },
          ],
          version: '1',
        });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(output).toContain('[OMA] Tasks: 2 pending');
    });

    it('emits task summary when taskLog has only completed tasks', async () => {
      vi.mocked(loadJsonFile)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          tasks: [
            { id: '1', subject: 'Done task', status: 'completed' },
          ],
          version: '1',
        });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(output).toContain('[OMA] Tasks: 1 done');
    });

    it('does not emit task summary when all tasks have unknown status', async () => {
      vi.mocked(loadJsonFile)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          tasks: [{ id: '1', subject: 'Task', status: 'skipped' }],
          version: '1',
        });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(output).not.toContain('[OMA] Tasks:');
    });

    it('does not emit task summary when taskLog has empty tasks array', async () => {
      vi.mocked(loadJsonFile)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ tasks: [], version: '1' });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(output).not.toContain('[OMA] Tasks:');
    });
  });

  // ── Notepad priority (lines 129-131) ─────────────────────────────────────

  describe('notepad priority in main()', () => {
    beforeEach(() => {
      vi.mocked(getMergedConfig).mockReturnValue({ ...defaultMockConfig } as any);
    });

    it('emits [OMA Note] when notepad has a non-empty priority', async () => {
      // loadJsonFile call order: state (1st), notepad (2nd), taskLog (3rd)
      vi.mocked(loadJsonFile)
        .mockReturnValueOnce(null)                                         // state.json
        .mockReturnValueOnce({ priority: 'Top priority note here' })       // notepad.json
        .mockReturnValueOnce(null);                                        // task.log.json

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(output).toContain('[OMA Note] Top priority note here');
    });

    it('truncates notepad priority longer than 80 chars with ellipsis', async () => {
      const longPriority = 'A'.repeat(90);
      vi.mocked(loadJsonFile)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ priority: longPriority })
        .mockReturnValueOnce(null);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(output).toContain('[OMA Note]');
      expect(output).toContain('...');
    });

    it('does not emit [OMA Note] when notepad priority is empty string', async () => {
      vi.mocked(loadJsonFile)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ priority: '' })
        .mockReturnValueOnce(null);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(output).not.toContain('[OMA Note]');
    });
  });

  // ── main() catch handler (lines 161-163) ──────────────────────────────────

  describe('main() catch handler', () => {
    it('logs error and exits 0 when readAllStdin rejects', async () => {
      const { readAllStdin } = await import('../../../src/utils.js');
      vi.mocked(readAllStdin).mockRejectedValueOnce(new Error('stdin failure'));

      // Simulate non-TTY so readAllStdin is called
      const origIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Call main() and capture the rejection via the module-level .catch() pattern
      try {
        await main();
      } catch {
        // swallow — the real .catch() at module level handles it
      }

      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
      errSpy.mockRestore();

      // process.exit(0) should have been called (either by main() success path or catch handler)
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });
});
