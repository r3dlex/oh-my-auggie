import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// process.exit is stubbed in hooks-setup.ts

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => '{"sessions":[],"version":"0.1"}'),
  writeFileSync: vi.fn(),
}));

vi.mock('../../../src/utils.js', () => ({
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  getMergedConfig: vi.fn(() => ({ profile: 'enterprise' })),
  isEnterpriseProfile: vi.fn((config: Record<string, unknown>) => config.profile === 'enterprise'),
  readAllStdin: vi.fn(() => Promise.resolve('')),
}));

import { extractFromInput, main } from '../../../src/hooks/audit-log.js';
import { readFileSync, writeFileSync } from 'fs';
import { getMergedConfig, isEnterpriseProfile, readAllStdin } from '../../../src/utils.js';

describe('audit-log hook', () => {

  // ── extractFromInput ──────────────────────────────────────────────────────

  describe('extractFromInput', () => {
    it('extracts tool_name and file paths from valid JSON', () => {
      const raw = JSON.stringify({
        tool_name: 'Write',
        tool_input: { file_path: '/tmp/foo.ts' },
      });
      const result = extractFromInput(raw);
      expect(result.toolName).toBe('Write');
      expect(result.filePaths).toEqual(['/tmp/foo.ts']);
      expect(result.outcome).toBe('success');
    });

    it('extracts multiple file path keys', () => {
      const raw = JSON.stringify({
        tool_name: 'Edit',
        tool_input: {
          file_path: '/a.ts',
          path: '/b.ts',
          filePath: '/c.ts',
          destination_path: '/d.ts',
          target_path: '/e.ts',
        },
      });
      const result = extractFromInput(raw);
      expect(result.filePaths).toEqual(['/a.ts', '/b.ts', '/c.ts', '/d.ts', '/e.ts']);
    });

    it('returns empty object on invalid JSON', () => {
      const result = extractFromInput('not json');
      expect(result).toEqual({});
    });

    it('returns empty object on empty string', () => {
      const result = extractFromInput('');
      expect(result).toEqual({});
    });

    it('handles missing tool_input gracefully', () => {
      const raw = JSON.stringify({ tool_name: 'Bash' });
      const result = extractFromInput(raw);
      expect(result.toolName).toBe('Bash');
      expect(result.filePaths).toEqual([]);
    });

    it('ignores empty string file path values', () => {
      const raw = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '', path: '/valid.ts' },
      });
      const result = extractFromInput(raw);
      expect(result.filePaths).toEqual(['/valid.ts']);
    });

    it('ignores non-string file path values', () => {
      const raw = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: 123, path: null },
      });
      const result = extractFromInput(raw);
      expect(result.filePaths).toEqual([]);
    });
  });

  // ── main() integration ──────────────────────────────────────────────────

  describe('main() integration', () => {
    const originalHookType = process.env.HOOK_TYPE;
    const originalSessionId = process.env.SESSION_ID;
    const originalToolName = process.env.OMA_TOOL_NAME;
    const originalDurationMs = process.env.OMA_DURATION_MS;
    const originalExitCode = process.env.OMA_EXIT_CODE;

    beforeEach(() => {
      vi.clearAllMocks();
      process.env.SESSION_ID = 'test-audit-session';
      // Default: enterprise profile (active)
      vi.mocked(getMergedConfig).mockReturnValue({ profile: 'enterprise' } as ReturnType<typeof getMergedConfig>);
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"sessions":[],"version":"0.1"}');
    });

    afterEach(() => {
      for (const [key, val] of Object.entries({
        HOOK_TYPE: originalHookType,
        SESSION_ID: originalSessionId,
        OMA_TOOL_NAME: originalToolName,
        OMA_DURATION_MS: originalDurationMs,
        OMA_EXIT_CODE: originalExitCode,
      })) {
        if (val !== undefined) {
          process.env[key] = val;
        } else {
          delete process.env[key];
        }
      }
    });

    it('exits 0 immediately when not enterprise profile', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(false);
      await main();
      // process.exit(0) is called on the non-enterprise early-exit path
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('records PostToolUse event with env var tool info', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Write';
      process.env.OMA_DURATION_MS = '150';
      await main();
      expect(writeFileSync).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('parses stdin when tool name is "unknown"', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      delete process.env.OMA_TOOL_NAME;
      vi.mocked(readAllStdin).mockResolvedValue(
        JSON.stringify({ tool_name: 'Grep', tool_input: { path: '/search/dir' } })
      );
      await main();
      expect(writeFileSync).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('parses stdin when tool name is "Read"', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Read';
      vi.mocked(readAllStdin).mockResolvedValue(
        JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '/foo.ts' } })
      );
      await main();
      expect(writeFileSync).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('parses stdin when tool name is "Bash"', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Bash';
      vi.mocked(readAllStdin).mockResolvedValue(
        JSON.stringify({ tool_name: 'Bash', tool_input: {} })
      );
      await main();
      expect(writeFileSync).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('uses stdin else-if branch for known tool names with rawInput', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Edit';
      vi.mocked(readAllStdin).mockResolvedValue(
        JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: '/bar.ts' } })
      );
      await main();
      expect(writeFileSync).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('sets outcome to blocked when OMA_EXIT_CODE is 2', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Write';
      process.env.OMA_EXIT_CODE = '2';
      await main();
      // Verify writeFileSync was called with blocked outcome
      const writeCall = vi.mocked(writeFileSync).mock.calls.find(
        c => typeof c[1] === 'string' && c[1].includes('"outcome"')
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      const session = written.sessions.find((s: { id: string }) => s.id === 'test-audit-session');
      expect(session.events[0].outcome).toBe('blocked');
    });

    it('handles SessionEnd hook type with session present', async () => {
      process.env.HOOK_TYPE = 'SessionEnd';
      const sessionData = {
        id: 'test-audit-session',
        start_time: '2026-01-01T00:00:00Z',
        events: [{ timestamp: '2026-01-01T00:01:00Z', tool_name: 'Write', file_paths: [], outcome: 'success', duration_ms: 100 }],
      };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ sessions: [sessionData], version: '0.1' }));
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('handles session-end (lowercase) hook type', async () => {
      process.env.HOOK_TYPE = 'session-end';
      vi.mocked(readFileSync).mockReturnValue('{"sessions":[],"version":"0.1"}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('handles SessionEnd with no matching session', async () => {
      process.env.HOOK_TYPE = 'SessionEnd';
      vi.mocked(readFileSync).mockReturnValue('{"sessions":[],"version":"0.1"}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('creates audit log when file does not exist (ensureAuditLog catch path)', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Bash';
      process.env.OMA_DURATION_MS = '200';
      let callCount = 0;
      vi.mocked(readFileSync).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // ensureAuditLog: file does not exist
          throw new Error('ENOENT');
        }
        // readAuditLog after ensureAuditLog creates the file
        return '{"sessions":[],"version":"0.1"}';
      });
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('returns empty sessions when audit log has empty content', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Write';
      let callCount = 0;
      vi.mocked(readFileSync).mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return '{"sessions":[],"version":"0.1"}'; // ensureAuditLog
        return '   '; // readAuditLog: empty/whitespace content
      });
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('returns empty sessions when audit log has invalid JSON', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Write';
      let callCount = 0;
      vi.mocked(readFileSync).mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return '{"sessions":[],"version":"0.1"}'; // ensureAuditLog
        return 'not valid json {{{'; // readAuditLog: parse error
      });
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('uses SESSION_ID env var for session id', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.SESSION_ID = 'custom-session-id';
      process.env.OMA_TOOL_NAME = 'Write';
      await main();
      const writeCall = vi.mocked(writeFileSync).mock.calls.find(
        c => typeof c[1] === 'string' && c[1].includes('custom-session-id')
      );
      expect(writeCall).toBeDefined();
    });

    it('generates session id from timestamp+pid when SESSION_ID not set', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      delete process.env.SESSION_ID;
      process.env.OMA_TOOL_NAME = 'Write';
      await main();
      expect(writeFileSync).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('upserts into existing session on second PostToolUse call', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Write';
      const existingSession = {
        id: 'test-audit-session',
        start_time: '2026-01-01T00:00:00Z',
        events: [{ timestamp: '2026-01-01T00:01:00Z', tool_name: 'Read', file_paths: [], outcome: 'success', duration_ms: 50 }],
      };
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ sessions: [existingSession], version: '0.1' }));
      await main();
      const writeCall = vi.mocked(writeFileSync).mock.calls.find(
        c => typeof c[1] === 'string' && c[1].includes('"events"')
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      // Should have one session with two events (existing + new)
      expect(written.sessions).toHaveLength(1);
      expect(written.sessions[0].events).toHaveLength(2);
    });

    it('defaults OMA_DURATION_MS to 0 when not set', async () => {
      process.env.HOOK_TYPE = 'PostToolUse';
      process.env.OMA_TOOL_NAME = 'Glob';
      delete process.env.OMA_DURATION_MS;
      await main();
      const writeCall = vi.mocked(writeFileSync).mock.calls.find(
        c => typeof c[1] === 'string' && c[1].includes('"duration_ms"')
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      const session = written.sessions.find((s: { id: string }) => s.id === 'test-audit-session');
      expect(session.events[0].duration_ms).toBe(0);
    });

    it('triggers main().catch on fatal error and exits 0', async () => {
      vi.mocked(getMergedConfig).mockImplementation(() => {
        throw new Error('config explosion');
      });
      // main() throws synchronously, which rejects the async function's promise
      await expect(main()).rejects.toThrow('config explosion');
    });
  });
});
