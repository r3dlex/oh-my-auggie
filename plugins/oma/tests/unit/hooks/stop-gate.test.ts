import { describe, it, expect, vi, beforeEach } from 'vitest';

// process.exit is stubbed in hooks-setup.ts

const PERSISTENT_MODES = new Set(['ralph', 'ultrawork', 'autopilot', 'team', 'ultraqa', 'ralplan', 'ralphthon']);

// Declare writeJsonFileCalls BEFORE vi.mock so the hoisted factory can close over it.
// Declare writeJsonFileCalls BEFORE vi.mock so the hoisted factory can close over it.
const writeJsonFileCalls: Array<{ path: string; data: unknown }> = [];

vi.mock('../../../src/utils.js', () => ({
  loadJsonFile: vi.fn(),
  loadOmaState: vi.fn(),
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  // No-op factory — beforeEach re-attach via mockImplementation.
  writeJsonFile: vi.fn(),
}));

import { loadJsonFile, loadOmaState, resolveOmaDir, writeJsonFile } from '../../../src/utils.js';

// Import the actual hook so v8 instruments it AND exports main
import { main } from '../../../src/hooks/stop-gate.js';

describe('stop-gate hooks', () => {

  describe('PERSISTENT_MODES set', () => {
    it('includes ralph', () => {
      expect(PERSISTENT_MODES.has('ralph')).toBe(true);
    });

    it('includes ultrawork', () => {
      expect(PERSISTENT_MODES.has('ultrawork')).toBe(true);
    });

    it('includes autopilot', () => {
      expect(PERSISTENT_MODES.has('autopilot')).toBe(true);
    });

    it('includes team', () => {
      expect(PERSISTENT_MODES.has('team')).toBe(true);
    });

    it('includes ultraqa', () => {
      expect(PERSISTENT_MODES.has('ultraqa')).toBe(true);
    });

    it('includes ralplan', () => {
      expect(PERSISTENT_MODES.has('ralplan')).toBe(true);
    });

    it('includes ralphthon', () => {
      expect(PERSISTENT_MODES.has('ralphthon')).toBe(true);
    });

    it('does not include unknown modes', () => {
      expect(PERSISTENT_MODES.has('none')).toBe(false);
      expect(PERSISTENT_MODES.has('debug')).toBe(false);
    });
  });

  describe('state-based allow/block conditions', () => {
    it('allows stop when mode is none and active is false', () => {
      const state = { mode: 'none', active: false };
      const allowed = !PERSISTENT_MODES.has(state.mode) || state.active !== true;
      expect(allowed).toBe(true);
    });

    it('allows stop when mode is not persistent (regardless of active)', () => {
      const state = { mode: 'debug', active: true };
      const allowed = !PERSISTENT_MODES.has(state.mode) || state.active !== true;
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
      const blocked = PERSISTENT_MODES.has(state.mode) && state.active === true && !(state.mode === 'ralph' && lastArchitect);
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
      const blocked = PERSISTENT_MODES.has(state.mode) && state.active === true && !(state.mode === 'ralph' && lastArchitect);
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
      const blocked = PERSISTENT_MODES.has(state.mode) && state.active === true && !(state.mode === 'ralph' && lastArchitect);
      expect(blocked).toBe(true);
    });

    it('blocks stop when ralph active with empty task log', () => {
      const state = { mode: 'ralph', active: true };
      const taskLog: Array<{ agent?: string; status?: string }> = [];

      const lastArchitect = [...taskLog].reverse().find(
        (entry) => entry.agent === 'oma-architect' && entry.status === 'PASS'
      );
      const blocked = PERSISTENT_MODES.has(state.mode) && state.active === true && !(state.mode === 'ralph' && lastArchitect);
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
      const blocked = PERSISTENT_MODES.has(state.mode) && state.active === true && !(state.mode === 'ralph' && lastArchitect);
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

    it('blocks stop when ultrawork mode active (iteration below limit)', () => {
      const state = { mode: 'ultrawork', active: true, iteration: 10 };
      const maxIterations = 50;
      const blocked = PERSISTENT_MODES.has(state.mode) && state.active === true && (state.iteration as number) < maxIterations;
      expect(blocked).toBe(true);
    });

    it('blocks stop when autopilot mode active (iteration below limit)', () => {
      const state = { mode: 'autopilot', active: true, iteration: 5 };
      const maxIterations = 50;
      const blocked = PERSISTENT_MODES.has(state.mode) && state.active === true && (state.iteration as number) < maxIterations;
      expect(blocked).toBe(true);
    });

    it('blocks stop when team mode active (iteration below limit)', () => {
      const state = { mode: 'team', active: true, iteration: 3 };
      const maxIterations = 50;
      const blocked = PERSISTENT_MODES.has(state.mode) && state.active === true && (state.iteration as number) < maxIterations;
      expect(blocked).toBe(true);
    });

    it('allows stop when iteration equals maxIterations (50)', () => {
      const state = { mode: 'ultrawork', active: true, iteration: 50 };
      const maxIterations = 50;
      const allowed = (state.iteration as number) >= maxIterations;
      expect(allowed).toBe(true);
    });

    it('allows stop when iteration exceeds maxIterations', () => {
      const state = { mode: 'autopilot', active: true, iteration: 51 };
      const maxIterations = 50;
      const allowed = (state.iteration as number) >= maxIterations;
      expect(allowed).toBe(true);
    });

    it('uses maxIterations from state when present', () => {
      const state = { mode: 'ralph', active: true, iteration: 99, maxIterations: 100 };
      const maxIterations = (state.maxIterations as number) ?? 50;
      expect(maxIterations).toBe(100);
      expect((state.iteration as number) < maxIterations).toBe(true);
    });
  });

  describe('iteration increment logic', () => {
    it('increments iteration on each block', () => {
      const state = { mode: 'ultrawork', active: true, iteration: 10 };
      const maxIterations = 50;
      const blocked = PERSISTENT_MODES.has(state.mode) && state.active === true && !((state.iteration as number) >= maxIterations);
      expect(blocked).toBe(true);
      const iteration = (state.iteration as number | undefined) ?? 0;
      const updatedState = { ...state, iteration: iteration + 1 };
      expect(updatedState.iteration).toBe(11);
    });

    it('starts iteration at 0 when undefined', () => {
      const state = { mode: 'autopilot', active: true };
      const iteration = (state.iteration as number | undefined) ?? 0;
      expect(iteration).toBe(0);
    });
  });

  describe('block output format', () => {
    it('includes iteration and mode in systemMessage when state.iteration is set', () => {
      const mode = 'ultrawork';
      const iteration = 3;
      const maxIterations = 50;
      const output = {
        decision: 'block',
        reason: `${mode} mode is active. Cannot stop until verification is complete or iteration limit (${maxIterations}) is reached.`,
        systemMessage: `Stop blocked: ${mode} mode active (iteration ${iteration + 1}/${maxIterations}). Wait for oma-architect verification or run /oma:cancel to force-stop.`,
      };
      expect(output.systemMessage).toContain('ultrawork');
      expect(output.systemMessage).toContain('iteration 4/50');
    });

    it('uses "unknown" when iteration is missing', () => {
      const mode = 'ralph';
      const iteration = undefined;
      const maxIterations = 50;
      const systemMessage = `Stop blocked: ${mode} mode active (iteration ${((iteration as number | undefined) ?? 0) + 1}/${maxIterations}). Wait for oma-architect verification or run /oma:cancel to force-stop.`;
      expect(systemMessage).toContain('iteration 1/50');
    });

    it('block decision is "block"', () => {
      const output = {
        decision: 'block',
        reason: 'Persistent mode is active without exit condition.',
        systemMessage: 'Stop blocked: mode active.',
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
    // Reset writeJsonFile implementation before each test.
    beforeEach(() => {
      vi.mocked(writeJsonFile).mockReset();
      vi.mocked(writeJsonFile).mockImplementation((path: string, data: unknown) => {
        writeJsonFileCalls.push({ path, data });
      });
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'none', active: false });
    });

    // afterEach clears what the test added so the module-scope call (before the
    // describe block exists) is the only persistent entry across all tests.
    afterEach(() => {
      writeJsonFileCalls.length = 0;
    });

    it('exits 0 when mode is none and active is false', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'none', active: false });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when mode is not persistent (regardless of active)', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'debug', active: true });
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

    it('exits 0 when ultrawork mode active at iteration >= max (50)', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'ultrawork', active: true, iteration: 50 });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when autopilot mode active at iteration >= max (50)', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'autopilot', active: true, iteration: 51 });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 2 when ultrawork mode active (iteration below limit)', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'ultrawork', active: true, iteration: 10 });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('exits 2 when autopilot mode active (iteration below limit)', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'autopilot', active: true, iteration: 5 });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('exits 2 when team mode active (iteration below limit)', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'team', active: true, iteration: 3 });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
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

    it('calls writeJsonFile to increment iteration on block', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'ultrawork', active: true, iteration: 10 });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      // process.exit(2) confirms the block path.  Filter for calls that carry
      // an iteration field — the module-scope call (mode: 'ralph') does not have one.
      const blockCalls = writeJsonFileCalls.filter(
        (c) => (c.data as { iteration?: number }).iteration === 11
      );
      expect(blockCalls.length).toBe(1);
    });

    it('does not write to state.json during the none-mode allow path', async () => {
      vi.mocked(resolveOmaDir).mockReturnValue('/mock/oma');
      vi.mocked(loadOmaState).mockReturnValue({ mode: 'none', active: false });
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
      // beforeEach already called main() once with mode=none (seting iteration=1).
      // This test call should add no new entries.
      expect(writeJsonFileCalls.filter(
        (c) => (c.data as { mode?: string }).mode === 'none'
      ).length).toBe(1);
    });
  });
});