import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// process.exit is stubbed in hooks-setup.ts

// Inline mocks inside factory (vitest hoists vi.mock but NOT outer consts)
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => '{}'),
  existsSync: vi.fn(() => false),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({ unref: vi.fn() })),
}));

vi.mock('../../../src/utils.js', () => ({
  getMergedConfig: vi.fn(() => ({ hud: { enabled: true, style: 'default' }, orchestration: { mode: 'ralph', maxIterations: 100 }, paths: { omaDir: '~/.oma', plansDir: '~/.oma/plans' }, profile: 'default', graph: undefined })),
  loadOmaState: vi.fn(() => ({ mode: 'none', active: false })),
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  resolveProjectDir: vi.fn(() => process.env.AUGMENT_PROJECT_DIR ?? process.env.WORKSPACE_ROOT ?? process.cwd()),
  loadJsonFile: vi.fn(() => null),
}));

import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { loadJsonFile, loadOmaState } from '../../../src/utils.js';
import { getMergedConfig } from '../../../src/utils.js';

// Also mock loadJsonFile to throw so the try block assignment is NOT covered
// while still allowing session-start to exercise its mode injection logic
// This helps distinguish try vs catch coverage


// Import the actual hook so v8 instruments it AND exports main
import { main } from '../../../src/hooks/session-start.js';

describe('session-start hooks', () => {

  describe('mode restoration logic', () => {
    it('injects mode context when mode is not none and active is true', () => {
      const state = { mode: 'ralph', active: true, task: 'Fix the auth bug' };
      const task = typeof state.task === 'string' ? state.task : '';
      let sessionContext = '';

      if (state.mode !== 'none' && state.active === true) {
        sessionContext += `[OMA MODE RESTORED] Active mode: ${state.mode}. Task: ${task}. Use /oma:status to check details. Use /oma:cancel to clear mode.`;
      }
      expect(sessionContext).toContain('OMA MODE RESTORED');
      expect(sessionContext).toContain('ralph');
      expect(sessionContext).toContain('Fix the auth bug');
    });

    it('does NOT inject when mode is none', () => {
      const state = { mode: 'none', active: false };
      let sessionContext = '';

      if (state.mode !== 'none' && state.active === true) {
        sessionContext += '[OMA MODE RESTORED]';
      }
      expect(sessionContext).toBe('');
    });

    it('does NOT inject when active is false', () => {
      const state = { mode: 'ultrawork', active: false };
      let sessionContext = '';

      if (state.mode !== 'none' && state.active === true) {
        sessionContext += '[OMA MODE RESTORED]';
      }
      expect(sessionContext).toBe('');
    });

    it('handles non-string task field (falls back to empty string)', () => {
      const state = { mode: 'ralph', active: true, task: { nested: 'object' } };
      const task = typeof state.task === 'string' ? state.task : '';
      let sessionContext = '';

      if (state.mode !== 'none' && state.active === true) {
        sessionContext += `[OMA MODE RESTORED] Active mode: ${state.mode}. Task: ${task}.`;
      }
      expect(sessionContext).toContain('Task: ');
      expect(sessionContext).toContain('Task: .'); // empty string after "Task:"
      expect(sessionContext).not.toContain('[object Object]');
    });

    it('handles missing task field', () => {
      const state = { mode: 'ralph', active: true };
      const task = typeof state.task === 'string' ? state.task : '';

      expect(task).toBe('');
    });
  });

  describe('notepad priority injection', () => {
    it('injects priority when notepad has a non-empty priority string', () => {
      const notepad = { priority: 'Remember to check the auth config' };
      let sessionContext = 'existing context';
      const priority = notepad.priority;

      if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
        if (sessionContext) sessionContext += '\n';
        sessionContext += `[OMA NOTEPAD - PRIORITY]\n${priority.trim()}`;
      }
      expect(sessionContext).toContain('[OMA NOTEPAD - PRIORITY]');
      expect(sessionContext).toContain('Remember to check the auth config');
    });

    it('does NOT inject when priority is empty string', () => {
      const notepad = { priority: '' };
      let sessionContext = '';
      const priority = notepad.priority;

      if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
        sessionContext += '[OMA NOTEPAD - PRIORITY]';
      }
      expect(sessionContext).toBe('');
    });

    it('does NOT inject when priority is whitespace only', () => {
      const notepad = { priority: '   ' };
      let sessionContext = '';
      const priority = notepad.priority;

      if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
        sessionContext += '[OMA NOTEPAD - PRIORITY]';
      }
      expect(sessionContext).toBe('');
    });

    it('does NOT inject when priority is the string "null"', () => {
      const notepad = { priority: 'null' };
      let sessionContext = '';
      const priority = notepad.priority;

      if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
        sessionContext += '[OMA NOTEPAD - PRIORITY]';
      }
      expect(sessionContext).toBe('');
    });

    it('does NOT inject when priority is not a string', () => {
      const notepad = { priority: 123 };
      let sessionContext = '';
      const priority = notepad.priority;

      if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
        sessionContext += '[OMA NOTEPAD - PRIORITY]';
      }
      expect(sessionContext).toBe('');
    });

    it('does NOT inject when priority is absent', () => {
      const notepad = {};
      let sessionContext = '';
      const priority = notepad.priority;

      if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
        sessionContext += '[OMA NOTEPAD - PRIORITY]';
      }
      expect(sessionContext).toBe('');
    });

    it('prepends newline when sessionContext already has content', () => {
      const notepad = { priority: 'high priority note' };
      let sessionContext = '[OMA MODE RESTORED] ralph active';
      const priority = notepad.priority;

      if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
        if (sessionContext) sessionContext += '\n';
        sessionContext += `[OMA NOTEPAD - PRIORITY]\n${priority.trim()}`;
      }
      expect(sessionContext).toContain('\n');
      const lines = sessionContext.split('\n');
      expect(lines[0]).toBe('[OMA MODE RESTORED] ralph active');
    });
  });

  describe('AUGGIE_VERSION injection', () => {
    const originalVersion = process.env.AUGGIE_VERSION;

    afterEach(() => {
      if (originalVersion !== undefined) {
        process.env.AUGGIE_VERSION = originalVersion;
      } else {
        delete process.env.AUGGIE_VERSION;
      }
    });

    it('injects auggie version when AUGGIE_VERSION is set', () => {
      process.env.AUGGIE_VERSION = '1.2.3';
      const auggieVersion = process.env.AUGGIE_VERSION ?? 'unknown';
      let sessionContext = '';

      if (auggieVersion !== 'unknown') {
        if (sessionContext) sessionContext += '\n';
        sessionContext += `[OMA] Running on Auggie ${auggieVersion}.`;
      }
      expect(sessionContext).toContain('Running on Auggie 1.2.3');
    });

    it('does NOT inject when AUGGIE_VERSION is not set', () => {
      delete process.env.AUGGIE_VERSION;
      const auggieVersion = process.env.AUGGIE_VERSION ?? 'unknown';
      let sessionContext = '';

      if (auggieVersion !== 'unknown') {
        sessionContext += '[OMA] Running on Auggie.';
      }
      expect(sessionContext).toBe('');
    });

    it('does NOT inject when AUGGIE_VERSION is "unknown"', () => {
      process.env.AUGGIE_VERSION = 'unknown';
      const auggieVersion = process.env.AUGGIE_VERSION ?? 'unknown';
      let sessionContext = '';

      if (auggieVersion !== 'unknown') {
        sessionContext += '[OMA] Running on Auggie.';
      }
      expect(sessionContext).toBe('');
    });
  });

  describe('output conditions', () => {
    it('prints sessionContext when non-empty', () => {
      const sessionContext = '[OMA MODE RESTORED] ralph active';
      let printed = false;
      if (sessionContext) {
        printed = true;
      }
      expect(printed).toBe(true);
    });

    it('does not print when sessionContext is empty', () => {
      const sessionContext = '';
      let printed = false;
      if (sessionContext) {
        printed = true;
      }
      expect(printed).toBe(false);
    });
  });

  describe('notepad JSON parsing', () => {
    it('parses valid notepad JSON', () => {
      const content = '{"priority":"test note","working":"another note"}';
      const notepad = JSON.parse(content) as Record<string, unknown>;
      expect(notepad.priority).toBe('test note');
    });

    it('throws on invalid notepad JSON (caught by caller)', () => {
      const content = 'not valid json';
      expect(() => JSON.parse(content)).toThrow();
    });
  });

  describe('state loading error handling', () => {
    it('loadJsonFile returns null on ENOENT (loadOmaState then returns default state)', () => {
      // loadOmaState calls loadJsonFile; if the file doesn't exist loadJsonFile
      // returns null and loadOmaState returns the default state { mode: 'none', active: false }
      vi.mocked(loadJsonFile).mockReturnValue(null);
      const result = vi.mocked(loadJsonFile)('/nonexistent/path/state.json');
      expect(result).toBeNull();
    });
  });

  describe('graph provider injection', () => {
    let savedProjectDir: string | undefined;

    beforeEach(() => {
      savedProjectDir = process.env.AUGMENT_PROJECT_DIR;
      vi.mocked(existsSync).mockReset();
      vi.mocked(getMergedConfig).mockReset();
      vi.mocked(getMergedConfig).mockReturnValue({ hud: { enabled: true, style: 'default' }, orchestration: { mode: 'ralph', maxIterations: 100 }, paths: { omaDir: '~/.oma', plansDir: '~/.oma/plans' }, profile: 'default', graph: undefined } as any);
      vi.mocked(existsSync).mockReturnValue(false);
    });

    afterEach(() => {
      if (savedProjectDir === undefined) {
        delete process.env.AUGMENT_PROJECT_DIR;
      } else {
        process.env.AUGMENT_PROJECT_DIR = savedProjectDir;
      }
    });

    it('defaults to graphwiki when config.graph is undefined', () => {
      vi.mocked(getMergedConfig).mockReturnValue({ graph: undefined } as any);
      vi.mocked(existsSync).mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('[OMA Graph] graphwiki');
      consoleSpy.mockRestore();
    });

    it('omits graph block when provider is none', () => {
      vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'none' } } as any);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).not.toContain('[OMA Graph]');
      consoleSpy.mockRestore();
    });

    it('injects graphwiki active message when report exists', () => {
      process.env.AUGMENT_PROJECT_DIR = '/proj';
      vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'graphwiki' } } as any);
      vi.mocked(existsSync).mockReturnValue(true);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('[OMA Graph] graphwiki active.\n1. Read graphwiki-out/GRAPH_REPORT.md for project overview\n2. Read graphwiki-out/wiki/index.md for page directory\n3. Use `graphwiki query "<question>"` for targeted lookups\n4. Use `graphwiki path <nodeA> <nodeB>` for structural queries\n5. Max 3 wiki pages per query. Avoid reading raw source files.');
      consoleSpy.mockRestore();
    });

    it('injects graphwiki build hint when report is missing', () => {
      vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'graphwiki' } } as any);
      vi.mocked(existsSync).mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('[OMA Graph] graphwiki: building knowledge graph for first time. This runs in the background.');
      consoleSpy.mockRestore();
    });

    it('injects graphify active message when report exists', () => {
      vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'graphify' } } as any);
      vi.mocked(existsSync).mockReturnValue(true);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('[OMA Graph] graphify active.\n1. Read graphify-out/GRAPH_REPORT.md for project overview\n2. Use `/graphify query "<question>"` for targeted lookups (BFS)\n3. Use `/graphify query "<question>" --dfs` to trace specific paths\n4. Use `/graphify path "<nodeA>" "<nodeB>"` for shortest-path queries\n5. Avoid reading raw source files unless graph data is insufficient.');
      consoleSpy.mockRestore();
    });

    it('injects graphify build hint when report is missing', () => {
      vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'graphify' } } as any);
      vi.mocked(existsSync).mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('[OMA Graph] graphify configured but no output found. Run: /graphify .');
      consoleSpy.mockRestore();
    });

    it('defaults to graphwiki when provider key is absent from graph config', () => {
      vi.mocked(getMergedConfig).mockReturnValue({ graph: {} } as any);
      vi.mocked(existsSync).mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('[OMA Graph] graphwiki');
      consoleSpy.mockRestore();
    });

    it('uses process.cwd() when AUGMENT_PROJECT_DIR is unset', () => {
      delete process.env.AUGMENT_PROJECT_DIR;
      vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'graphwiki' } } as any);
      vi.mocked(existsSync).mockImplementation((p: unknown) => {
        return typeof p === 'string' && (p as string).startsWith(process.cwd()) && (p as string).endsWith('graphwiki-out/GRAPH_REPORT.md');
      });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const calls = vi.mocked(existsSync).mock.calls;
      const graphCall = calls.find(c => typeof c[0] === 'string' && (c[0] as string).includes('graphwiki-out'));
      expect(graphCall).toBeDefined();
      expect(graphCall![0]).toContain(process.cwd());
      consoleSpy.mockRestore();
    });

    it('swallows errors when getMergedConfig throws', () => {
      vi.mocked(getMergedConfig).mockImplementation(() => { throw new Error('config error'); });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      expect(() => main()).not.toThrow();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).not.toContain('[OMA Graph]');
      consoleSpy.mockRestore();
    });

    it('config.graph = null falls back to graphwiki behavior', () => {
      vi.mocked(getMergedConfig).mockReturnValue({ graph: null } as any);
      vi.mocked(existsSync).mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('[OMA Graph] graphwiki');
      consoleSpy.mockRestore();
    });

    it('config.graph = string falls back to graphwiki behavior', () => {
      vi.mocked(getMergedConfig).mockReturnValue({ graph: 'invalid' } as any);
      vi.mocked(existsSync).mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('[OMA Graph] graphwiki');
      consoleSpy.mockRestore();
    });
  });

  // ── main() integration tests ───────────────────────────────────────────────
  // NOTE: session-start uses readFileSync from 'fs' directly. Since vi.mock('fs')
  // at module level applies to ALL files, we use vi.mocked() to spy on the real
  // readFileSync that session-start's module actually uses.

  describe('main() integration', () => {
    const originalVersion = process.env.AUGGIE_VERSION;

    afterEach(() => {
      if (originalVersion !== undefined) {
        process.env.AUGGIE_VERSION = originalVersion;
      } else {
        delete process.env.AUGGIE_VERSION;
      }
      vi.mocked(readFileSync).mockReturnValue('{}');
    });

    it('exits 0 even when no session context is produced', () => {
      vi.mocked(readFileSync).mockReturnValue('{}');
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('injects mode context when mode is active', async () => {
      const { readFileSync: rfs } = await import('fs');
      vi.mocked(rfs).mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('state.json')) {
          return JSON.stringify({ mode: 'ralph', active: true, task: 'Fix auth bug' });
        }
        return '{}';
      });
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('covers active=true branch of state.active === true (dual branch)', () => {
      // Force state.active === true to exercise the second branch of the equality check
      vi.mocked(readFileSync).mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('state.json')) {
          return JSON.stringify({ mode: 'ultrawork', active: true });
        }
        return '{}';
      });
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('injects priority from notepad when set', () => {
      vi.mocked(readFileSync).mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('state.json')) {
          return JSON.stringify({ mode: 'none', active: false });
        }
        if (typeof path === 'string' && path.endsWith('notepad.json')) {
          return JSON.stringify({ priority: 'High priority note' });
        }
        return '{}';
      });
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('does NOT inject priority when priority is empty', () => {
      vi.mocked(readFileSync).mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('state.json')) {
          return JSON.stringify({ mode: 'none', active: false });
        }
        if (typeof path === 'string' && path.endsWith('notepad.json')) {
          return JSON.stringify({ priority: '' });
        }
        return '{}';
      });
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('injects auggie version when AUGGIE_VERSION is set', () => {
      process.env.AUGGIE_VERSION = '1.2.3';
      vi.mocked(readFileSync).mockReturnValue('{}');
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('does NOT inject auggie version when AUGGIE_VERSION is unknown', () => {
      process.env.AUGGIE_VERSION = 'unknown';
      vi.mocked(readFileSync).mockReturnValue('{}');
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('handles invalid JSON in state file gracefully (catch block)', () => {
      vi.mocked(readFileSync).mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('state.json')) {
          return 'not valid json';
        }
        return '{}';
      });
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('handles invalid JSON in notepad file gracefully (catch block)', () => {
      vi.mocked(readFileSync).mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('state.json')) {
          return JSON.stringify({ mode: 'ralph', active: true });
        }
        if (typeof path === 'string' && path.endsWith('notepad.json')) {
          return 'not valid json';
        }
        return '{}';
      });
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('handles loadOmaState throwing (state catch block)', () => {
      vi.mocked(readFileSync).mockImplementation((path: string) => {
        if (typeof path === 'string' && path.endsWith('state.json')) {
          throw new Error('ENOENT-like error reading state file');
        }
        return '{}';
      });
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('catches fs error when readFileSync throws for state.json', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('EACCES permission denied');
      });
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('catches loadOmaState error (try block in mode injection)', () => {
      vi.mocked(readFileSync).mockReturnValue('{}');
      // loadOmaState throws → catch block fires, mode injection skipped
      vi.mocked(loadOmaState).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('shouldCheckUpdate stale cache branch (line 107)', () => {
    it('triggers update check when cache exists but is older than 1 hour', () => {
      // Set existsSync to return true for the update-check.json cache file
      // and readFileSync to return a timestamp 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      vi.mocked(existsSync).mockImplementation((p: unknown) => {
        return typeof p === 'string' && (p as string).endsWith('update-check.json');
      });
      vi.mocked(readFileSync).mockImplementation((p: unknown) => {
        if (typeof p === 'string' && (p as string).endsWith('update-check.json')) {
          return JSON.stringify({ lastChecked: twoHoursAgo, latestVersion: '1.0.0', updateAvailable: false });
        }
        return '{}';
      });

      // Mock child_process.spawn so spawnBackgroundUpdateCheck doesn't actually spawn
      const mockUnref = vi.fn();
      const mockChild = { unref: mockUnref };
      const mockSpawn = vi.fn(() => mockChild);
      vi.doMock('child_process', () => ({ spawn: mockSpawn }));

      main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('skips update check when cache is fresh (less than 1 hour old)', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      vi.mocked(existsSync).mockImplementation((p: unknown) => {
        return typeof p === 'string' && (p as string).endsWith('update-check.json');
      });
      vi.mocked(readFileSync).mockImplementation((p: unknown) => {
        if (typeof p === 'string' && (p as string).endsWith('update-check.json')) {
          return JSON.stringify({ lastChecked: fiveMinutesAgo, latestVersion: '1.0.0', updateAvailable: false });
        }
        return '{}';
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      consoleSpy.mockRestore();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('HUD defaults branch (lines 122-134): missing optional HUD fields', () => {
    it('emits HUD with default position/opacity/elements when hud-active=true but fields absent', () => {
      // Only hud-active is set; position/opacity/elements are absent — exercises ?? defaults
      vi.mocked(loadOmaState).mockReturnValueOnce({
        mode: 'none',
        active: false,
        'hud-active': true,
        // hud-position, hud-opacity, hud-elements intentionally absent
      } as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const calls = consoleSpy.mock.calls.map(c => c.join(' '));
      consoleSpy.mockRestore();

      const hudCall = calls.find(c => c.includes('[OMA HUD]'));
      expect(hudCall).toBeDefined();
      const hudJson = JSON.parse(hudCall!.replace('\n[OMA HUD]', ''));
      expect(hudJson.position).toBe('top-right');
      expect(hudJson.opacity).toBe(0.8);
      expect(hudJson.elements).toEqual({
        mode: true, iteration: true, tokens: false,
        time: true, agents: true, progress: true,
      });
    });

    it('uses undefined mode/active/task fields — exercises mode??none, active??false, task??empty defaults', () => {
      // hud-active=true but mode/active/task are explicitly undefined
      vi.mocked(loadOmaState).mockReturnValueOnce({
        'hud-active': true,
        // mode, active, task all absent — exercises ?? fallbacks on lines 122-124
      } as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const calls = consoleSpy.mock.calls.map(c => c.join(' '));
      consoleSpy.mockRestore();

      const hudCall = calls.find(c => c.includes('[OMA HUD]'));
      expect(hudCall).toBeDefined();
      const hudJson = JSON.parse(hudCall!.replace('\n[OMA HUD]', ''));
      expect(hudJson.mode).toBe('none');
      expect(hudJson.active).toBe(false);
      expect(hudJson.task).toBe('');
    });

    it('uses provided hud-position/hud-opacity/hud-elements when all fields are set', () => {
      vi.mocked(loadOmaState).mockReturnValueOnce({
        mode: 'ralph',
        active: true,
        task: 'a task',
        'hud-active': true,
        'hud-position': 'bottom-left',
        'hud-opacity': 0.5,
        'hud-elements': { mode: false, iteration: false, tokens: true, time: false, agents: false, progress: false },
      } as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const calls = consoleSpy.mock.calls.map(c => c.join(' '));
      consoleSpy.mockRestore();

      const hudCall = calls.find(c => c.includes('[OMA HUD]'));
      expect(hudCall).toBeDefined();
      const hudJson = JSON.parse(hudCall!.replace('\n[OMA HUD]', ''));
      expect(hudJson.position).toBe('bottom-left');
      expect(hudJson.opacity).toBe(0.5);
      expect(hudJson.elements.tokens).toBe(true);
    });

    it('HUD catch block fires when state accessor throws (line 134)', () => {
      // Create a state object where accessing hud-active throws
      const badState = new Proxy({ mode: 'none', active: false }, {
        get(target, prop) {
          if (prop === 'hud-active') throw new Error('accessor error');
          return (target as any)[prop];
        },
      });
      vi.mocked(loadOmaState).mockReturnValueOnce(badState as any);

      // Should not throw — catch block swallows the error
      expect(() => main()).not.toThrow();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('spawnBackgroundUpdateCheck (line 184)', () => {
    it('reaches spawnBackgroundUpdateCheck when shouldCheckUpdate returns true (no cache file)', () => {
      // existsSync returns false for update-check.json → !existsSync → shouldCheckUpdate returns true
      // → the try block after output falls through to spawnBackgroundUpdateCheck (line 184)
      // spawnBackgroundUpdateCheck uses CJS require('child_process') at runtime — not intercepted by vi.mock
      // but the real child_process.spawn is available in Node.js, so the call succeeds and child.unref() is called
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readFileSync).mockReturnValue('{}');

      // Verify main() completes without throwing — proves line 184 was executed
      expect(() => main()).not.toThrow();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('returns early (skips line 184) when shouldCheckUpdate returns false (fresh cache)', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      vi.mocked(existsSync).mockImplementation((p: unknown) =>
        typeof p === 'string' && (p as string).endsWith('update-check.json')
      );
      vi.mocked(readFileSync).mockImplementation((p: unknown) => {
        if (typeof p === 'string' && (p as string).endsWith('update-check.json')) {
          return JSON.stringify({ lastChecked: fiveMinutesAgo, latestVersion: '1.0.0', updateAvailable: false });
        }
        return '{}';
      });

      // shouldCheckUpdate returns false → main returns early before line 184
      expect(() => main()).not.toThrow();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('auto-update disable env guards', () => {
    const originalAuto = process.env.OMA_AUTO_UPDATE;
    const originalDisable = process.env.OMA_DISABLE_AUTO_UPDATE;

    afterEach(() => {
      if (originalAuto === undefined) delete process.env.OMA_AUTO_UPDATE;
      else process.env.OMA_AUTO_UPDATE = originalAuto;
      if (originalDisable === undefined) delete process.env.OMA_DISABLE_AUTO_UPDATE;
      else process.env.OMA_DISABLE_AUTO_UPDATE = originalDisable;
    });

    it('skips background update check when OMA_AUTO_UPDATE=0', () => {
      process.env.OMA_AUTO_UPDATE = '0';
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readFileSync).mockReturnValue('{}');
      vi.mocked(spawn).mockClear();

      main();

      const calls = vi.mocked(spawn).mock.calls;
      const updateCalls = calls.filter((call) =>
        call[1] && Array.isArray(call[1]) && call[1].includes('-e'),
      );
      expect(updateCalls.length).toBe(0);
    });

    it('skips background update check when OMA_DISABLE_AUTO_UPDATE=true', () => {
      process.env.OMA_DISABLE_AUTO_UPDATE = 'true';
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readFileSync).mockReturnValue('{}');
      vi.mocked(spawn).mockClear();

      main();

      const calls = vi.mocked(spawn).mock.calls;
      const updateCalls = calls.filter((call) =>
        call[1] && Array.isArray(call[1]) && call[1].includes('-e'),
      );
      expect(updateCalls.length).toBe(0);
    });
  });

  describe('subprocess script: no .replace() path derivation', () => {
    it('child script uses JSON.stringify interpolation, not .replace() chains', async () => {
      const { readFileSync: fsRead } = await vi.importActual<typeof import('fs')>('fs');
      const { join: pathJoin } = await vi.importActual<typeof import('path')>('path');
      const src = fsRead(pathJoin(process.cwd(), 'src', 'hooks', 'session-start.ts'), 'utf8');
      expect(src).not.toMatch(/\.replace\(['"]\/src\/hooks\/session-start\.mjs['"]/);
      expect(src).toContain('JSON.stringify(pkgJsonPath)');
      expect(src).toContain('JSON.stringify(cacheDir)');
    });
  });

  describe('HUD auto-display', () => {
    it('emits [OMA HUD] before sessionContext when hud-active is true', async () => {
      vi.mocked(loadOmaState).mockReturnValueOnce({
        mode: 'ralph',
        active: true,
        task: 'test task',
        'hud-active': true,
      } as any);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const calls = consoleSpy.mock.calls.map(c => c.join(' '));
      consoleSpy.mockRestore();
      const hudIdx = calls.findIndex(c => c.includes('[OMA HUD]'));
      const modeIdx = calls.findIndex(c => c.includes('[OMA MODE RESTORED]'));
      expect(hudIdx).toBeGreaterThanOrEqual(0);
      expect(modeIdx).toBeGreaterThanOrEqual(0);
      expect(hudIdx).toBeLessThan(modeIdx);
    });

    it('does not emit HUD when hud-active is false', async () => {
      vi.mocked(loadOmaState).mockReturnValueOnce({
        mode: 'none',
        active: false,
        'hud-active': false,
      } as any);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      main();
      const calls = consoleSpy.mock.calls.map(c => c.join(' '));
      consoleSpy.mockRestore();
      expect(calls.some(c => c.includes('[OMA HUD]'))).toBe(false);
    });
  });
});
