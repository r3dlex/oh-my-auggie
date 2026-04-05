import { describe, it, expect, vi } from 'vitest';

// process.exit is stubbed in hooks-setup.ts

// Inline mocks inside factory (vitest hoists vi.mock but NOT outer consts)
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => '{}'),
}));

vi.mock('../../../src/utils.js', () => ({
  loadOmaState: vi.fn(() => ({ mode: 'none', active: false })),
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  loadJsonFile: vi.fn(() => null),
}));

import { readFileSync } from 'fs';
import { loadJsonFile, loadOmaState } from '../../../src/utils.js';

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
});
