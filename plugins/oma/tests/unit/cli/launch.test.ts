import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────

vi.mock('../../../src/cli/tmux.js', () => ({
  hasTmux: vi.fn(),
  runTmux: vi.fn(() => ({ status: 0, stdout: '', stderr: '' })),
}));

vi.mock('../../../src/cli/utils.js', () => ({
  resolveOmaDir: vi.fn(() => '/tmp/.oma'),
}));

// ── Tests ─────────────────────────────────────────────────────────────────

describe('launch.ts', () => {
  let launch: typeof import('../../../src/cli/launch.js');
  let tmux: typeof import('../../../src/cli/tmux.js');

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import after clearing mocks
    launch = await import('../../../src/cli/launch.js');
    tmux = await import('../../../src/cli/tmux.js');
  });

  describe('buildOmaSessionName', () => {
    it('returns session name with cwd basename and pid', () => {
      // process.cwd() returns something like /Users/user/project
      // We don't control cwd, but we test the format
      const name = launch.buildOmaSessionName();
      expect(name).toMatch(/^oma-.+-\d+$/);
      expect(name).toContain(String(process.pid));
    });
  });

  describe('buildHudCommand', () => {
    it('contains hud --watch with interval', () => {
      const cmd = launch.buildHudCommand({ omaDir: '/tmp/.oma', intervalMs: 2000 });
      expect(cmd).toContain('hud');
      expect(cmd).toContain('--watch');
      expect(cmd).toContain('--interval');
      expect(cmd).toContain('/tmp/.oma');
    });

    it('uses default interval when not specified', () => {
      const cmd = launch.buildHudCommand({ omaDir: '/tmp/.oma' });
      expect(cmd).toContain('2000');
    });
  });

  describe('isTmuxAvailable', () => {
    it('returns true when hasTmux returns true', () => {
      vi.mocked(tmux.hasTmux).mockReturnValue(true);
      expect(launch.isTmuxAvailable()).toBe(true);
    });

    it('returns false when hasTmux returns false', () => {
      vi.mocked(tmux.hasTmux).mockReturnValue(false);
      expect(launch.isTmuxAvailable()).toBe(false);
    });
  });

  describe('launchAuggie', () => {
    it('returns 1 when tmux is not available', async () => {
      vi.mocked(tmux.hasTmux).mockReturnValue(false);
      const exitCode = await launch.launchAuggie();
      expect(exitCode).toBe(1);
    });

    it('returns 1 when session creation fails', async () => {
      vi.mocked(tmux.hasTmux).mockReturnValue(true);
      vi.mocked(tmux.runTmux).mockImplementation((args: string[]) => {
        if (args[0] === 'new-session') {
          return { status: 1, stdout: '', stderr: 'error' };
        }
        return { status: 0, stdout: '', stderr: '' };
      });
      const exitCode = await launch.launchAuggie();
      expect(exitCode).toBe(1);
    });

    it('creates session, splits pane, sends auggie, attaches, and cleans up', async () => {
      vi.mocked(tmux.hasTmux).mockReturnValue(true);
      const calls: string[][] = [];
      vi.mocked(tmux.runTmux).mockImplementation((args: string[]) => {
        calls.push(args);
        return { status: 0, stdout: '', stderr: '' };
      });

      const exitCode = await launch.launchAuggie();

      expect(exitCode).toBe(0);
      // Should have called: new-session, split-window, send-keys, attach-session, kill-session
      expect(calls.length).toBeGreaterThanOrEqual(5);
      expect(calls[0][0]).toBe('new-session');
      expect(calls.some(c => c[0] === 'split-window')).toBe(true);
      expect(calls.some(c => c[0] === 'send-keys' && c.includes('auggie'))).toBe(true);
      expect(calls.some(c => c[0] === 'attach-session')).toBe(true);
      expect(calls.some(c => c[0] === 'kill-session')).toBe(true);
    });
  });
});
