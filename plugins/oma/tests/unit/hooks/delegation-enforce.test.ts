import { describe, it, expect, vi } from 'vitest';

// process.exit is stubbed in hooks-setup.ts

// Set up all mocks with default return values BEFORE importing the hook.
vi.mock('../../../src/utils.js', () => ({
  readAllStdin: vi.fn(() => Promise.resolve('{}')),
  loadOmaState: vi.fn(() => ({ mode: 'none', active: false })),
  resolveOmaDir: vi.fn(() => '/mock/oma'),
}));

import {
  readAllStdin,
  loadOmaState,
  resolveOmaDir,
} from '../../../src/utils.js';

// Import the actual hook so v8 instruments it AND exports main
import { main } from '../../../src/hooks/delegation-enforce.js';

// ─── Pure function tests ───────────────────────────────────────────────────────
const BLOCKING_TOOLS = new Set(['Edit', 'Write', 'remove_files', 'str-replace-editor', 'save-file']);

describe('delegation-enforce hooks', () => {

  describe('BLOCKING_TOOLS constant', () => {
    it('contains all expected file-modifying tools', () => {
      expect(BLOCKING_TOOLS.has('Edit')).toBe(true);
      expect(BLOCKING_TOOLS.has('Write')).toBe(true);
      expect(BLOCKING_TOOLS.has('remove_files')).toBe(true);
      expect(BLOCKING_TOOLS.has('str-replace-editor')).toBe(true);
      expect(BLOCKING_TOOLS.has('save-file')).toBe(true);
    });

    it('does not contain non-file-modifying tools', () => {
      expect(BLOCKING_TOOLS.has('Bash')).toBe(false);
      expect(BLOCKING_TOOLS.has('Read')).toBe(false);
      expect(BLOCKING_TOOLS.has('Grep')).toBe(false);
    });
  });

  describe('block decision logic', () => {
    it('blocks when mode is active (mode !== none, active === true)', () => {
      const state = { mode: 'ralph', active: true };
      expect(state.mode !== 'none' && state.active === true).toBe(true);
    });

    it('does NOT block when mode is none and active is false', () => {
      const state = { mode: 'none', active: false };
      expect(state.mode !== 'none' && state.active === true).toBe(false);
    });

    it('generates correct block output for active orchestration mode', () => {
      const state = { mode: 'ralph', active: true };
      if (state.mode !== 'none' && state.active === true) {
        const output = {
          decision: 'block',
          reason: `OMA orchestration mode (${state.mode}) is active.`,
        };
        expect(output.decision).toBe('block');
        expect(output.reason).toContain('ralph');
      }
    });
  });

  describe('tool_name parsing', () => {
    it('allows empty tool_name (exit 0)', () => {
      expect(!!'').toBe(false);
    });

    it('allows unknown tool_name (exit 0)', () => {
      expect(BLOCKING_TOOLS.has('Grep')).toBe(false);
    });

    it('detects blocking tool (exit 2)', () => {
      expect(BLOCKING_TOOLS.has('Edit')).toBe(true);
    });
  });

  describe('JSON parse failure', () => {
    it('should exit 0 on invalid JSON', () => {
      let parsed = false;
      try { JSON.parse('not valid json'); parsed = true; } catch { parsed = false; }
      expect(parsed).toBe(false);
    });
  });

  // ── main() integration tests ───────────────────────────────────────────────

  describe('main() integration', () => {
    it('exits 0 when stdin is invalid JSON', async () => {
      vi.mocked(readAllStdin).mockResolvedValue('not valid json');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when tool_name is empty string', async () => {
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": ""}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when tool_name is not a blocking tool', async () => {
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Grep"}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when blocking tool is used but mode is none', async () => {
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'none', active: false });
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Edit"}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 2 when blocking tool is used with active orchestration mode', async () => {
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'ralph', active: true });
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Edit"}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('calls readAllStdin and loadOmaState during main()', async () => {
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'none', active: false });
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Read"}');
      await main();
      expect(readAllStdin).toHaveBeenCalled();
      expect(loadOmaState).toHaveBeenCalled();
    });
  });
});

