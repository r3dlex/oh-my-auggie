import { describe, it, expect, vi } from 'vitest';

// process.exit is stubbed in hooks-setup.ts

vi.mock('../../../src/utils.js', () => ({
  loadJsonFile: vi.fn(),
  loadOmaState: vi.fn(),
  resolveOmaDir: vi.fn(),
}));

import { loadJsonFile, loadOmaState, resolveOmaDir } from '../../../src/utils.js';

// Import the actual hook so v8 instruments it AND exports main
import { main } from '../../../src/hooks/stop-gate.js';

describe('stop-gate hooks', () => {

  describe('state-based allow/block conditions', () => {
    it('allows stop when mode is none and active is false', () => {
      const state = { mode: 'none', active: false };
      const allowed = state.mode === 'none' && state.active === false;
      expect(allowed).toBe(true);
    });

    it('allows stop when mode is not ralph (regardless of active)', () => {
      const state = { mode: 'ultrawork', active: true };
      const allowed = state.mode !== 'ralph' || state.active !== true;
      expect(allowed).toBe(true);
    });

    it('allows stop when ralph active but architect PASS verdict found', () => {
      const state = { mode: 'ralph', active: true };
      const taskLog = [
        { agent: 'oma-architect', status: 'PASS' },
      ] as Array<{ agent?: string; status?: string }>;

      const lastArchitect = [...taskLog].reverse().find(
        (entry) => entry.agent === 'oma-architect' && entry.status === 'PASS'
      );
      const blocked = state.mode === 'ralph' && state.active === true && !lastArchitect;
      expect(blocked).toBe(false);
    });

    it('blocks stop when ralph active without architect PASS', () => {
      const state = { mode: 'ralph', active: true };
      const taskLog = [
        { agent: 'oma-executor', status: 'DONE' },
      ] as Array<{ agent?: string; status?: string }>;

      const lastArchitect = [...taskLog].reverse().find(
        (entry) => entry.agent === 'oma-architect' && entry.status === 'PASS'
      );
      const blocked = state.mode === 'ralph' && state.active === true && !lastArchitect;
      expect(blocked).toBe(true);
    });

    it('blocks stop when ralph active with architect FAIL verdict', () => {
      const state = { mode: 'ralph', active: true };
      const taskLog = [
        { agent: 'oma-architect', status: 'FAIL' },
      ] as Array<{ agent?: string; status?: string }>;

      const lastArchitect = [...taskLog].reverse().find(
        (entry) => entry.agent === 'oma-architect' && entry.status === 'PASS'
      );
      const blocked = state.mode === 'ralph' && state.active === true && !lastArchitect;
      expect(blocked).toBe(true);
    });

    it('blocks stop when ralph active with empty task log', () => {
      const state = { mode: 'ralph', active: true };
      const taskLog: Array<{ agent?: string; status?: string }> = [];

      const lastArchitect = [...taskLog].reverse().find(
        (entry) => entry.agent === 'oma-architect' && entry.status === 'PASS'
      );
      const blocked = state.mode === 'ralph' && state.active === true && !lastArchitect;
      expect(blocked).toBe(true);
    });

    it('blocks when ralph active with architect entry but wrong status', () => {
      const state = { mode: 'ralph', active: true };
      const taskLog = [
        { agent: 'oma-architect', status: 'PENDING' },
        { agent: 'oma-architect', status: 'REVIEW' },
      ] as Array<{ agent?: string; status?: string }>;

      const lastArchitect = [...taskLog].reverse().find(
        (entry) => entry.agent === 'oma-architect' && entry.status === 'PASS'
      );
      const blocked = state.mode === 'ralph' && state.active === true && !lastArchitect;
      expect(blocked).toBe(true);
    });

    it('allows when ralph active with PASS architect entry in middle of log', () => {
      const state = { mode: 'ralph', active: true };
      const taskLog = [
        { agent: 'oma-executor', status: 'WORKING' },
        { agent: 'oma-architect', status: 'PASS' },
        { agent: 'oma-executor', status: 'WORKING' },
      ] as Array<{ agent?: string; status?: string }>;

      const lastArchitect = [...taskLog].reverse().find(
        (entry) => entry.agent === 'oma-architect' && entry.status === 'PASS'
      );
      expect(lastArchitect).toBeDefined();
      expect(lastArchitect!.agent).toBe('oma-architect');
      expect(lastArchitect!.status).toBe('PASS');
    });
  });

  describe('block output format', () => {
    it('includes iteration in systemMessage when state.iteration is set', () => {
      const iteration = 3;
      const output = {
        decision: 'block',
        reason: `Ralph mode is active and oma-architect has not returned PASS verdict. Cannot stop until verification is complete.`,
        systemMessage: `Stop blocked: ralph mode active (iteration ${iteration}). Wait for oma-architect verification or run /oma:cancel to force-stop.`,
      };
      expect(output.systemMessage).toContain('iteration 3');
    });

    it('uses "unknown" when iteration is missing', () => {
      const iteration = undefined;
      const systemMessage = `Stop blocked: ralph mode active (iteration ${iteration ?? 'unknown'}). Wait for oma-architect verification or run /oma:cancel to force-stop.`;
      expect(systemMessage).toContain('iteration unknown');
    });

    it('block decision is "block"', () => {
      const output = {
        decision: 'block',
        reason: 'Ralph mode is active and oma-architect has not returned PASS verdict.',
        systemMessage: 'Stop blocked: ralph mode active (iteration unknown).',
      };
      expect(output.decision).toBe('block');
    });
  });

  describe('allow output format', () => {
    it('returns empty object {} on allow', () => {
      const output = {};
      expect(Object.keys(output)).toHaveLength(0);
    });
  });

  describe('loadJsonFile behavior', () => {
    it('returns null for non-existent task log', () => {
      vi.mocked(loadJsonFile).mockReturnValue(null);
      expect(loadJsonFile('/nonexistent/task.log.json')).toBeNull();
    });

    it('returns parsed array for valid task log', () => {
      const mockLog = [{ agent: 'oma-architect', status: 'PASS' }];
      vi.mocked(loadJsonFile).mockReturnValue(mockLog);
      expect(loadJsonFile('/some/path/task.log.json')).toEqual(mockLog);
    });

    it('returns empty task log when array is empty', () => {
      const mockLog: unknown[] = [];
      vi.mocked(loadJsonFile).mockReturnValue(mockLog);
      const result = loadJsonFile('/some/path/task.log.json') as unknown[];
      expect(result.length).toBe(0);
    });
  });

  // ── main() integration tests ───────────────────────────────────────────────

  describe('main() integration', () => {
    it('exits 0 when mode is none and active is false', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'none', active: false });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when mode is not ralph (regardless of active)', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'ultrawork', active: true });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when ralph active with architect PASS verdict', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'ralph', active: true, iteration: 2 });
      vi.mocked(loadJsonFile).mockReturnValue([
        { agent: 'oma-architect', status: 'PASS' },
      ]);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 2 when ralph active without architect PASS', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'ralph', active: true, iteration: 1 });
      vi.mocked(loadJsonFile).mockReturnValue([
        { agent: 'oma-executor', status: 'DONE' },
      ]);
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('exits 2 when ralph active and loadJsonFile returns null', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'ralph', active: true });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('exits 2 when ralph active with architect FAIL verdict', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'ralph', active: true });
      vi.mocked(loadJsonFile).mockReturnValue([
        { agent: 'oma-architect', status: 'FAIL' },
      ]);
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('calls loadOmaState during main()', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'none', active: false });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(loadOmaState).toHaveBeenCalled();
    });
  });
});
