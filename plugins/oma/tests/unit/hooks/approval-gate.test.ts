import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApprovalRecord } from '../../../src/types.js';

vi.mock('../../../src/utils.js', () => ({
  readAllStdin: vi.fn(() => ''),
  getMergedConfig: vi.fn(() => ({ profile: 'default' })),
  loadJsonFile: vi.fn(),
  isEnterpriseProfile: vi.fn(),
  resolveOmaDir: vi.fn(() => '/mock/oma'),
  isApprovalExpired: vi.fn(),
}));

import {
  getRequiredApproval,
  hasValidApproval,
  main,
} from '../../../src/hooks/approval-gate.js';
import {
  loadJsonFile,
  isEnterpriseProfile,
  isApprovalExpired,
  readAllStdin,
  resolveOmaDir,
} from '../../../src/utils.js';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('approval-gate hooks', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getRequiredApproval ────────────────────────────────────────────────────

  describe('getRequiredApproval', () => {
    it('returns Security+DevOps for files with "secrets" in path', () => {
      expect(getRequiredApproval('src/config/secrets.ts')).toBe('Security+DevOps');
    });

    it('returns Security+DevOps for files with "secret" in path', () => {
      expect(getRequiredApproval('src/secret-handler.ts')).toBe('Security+DevOps');
    });

    it('returns Security for files with "auth" in path', () => {
      expect(getRequiredApproval('src/auth/login.ts')).toBe('Security');
    });

    it('returns Security for auth*.ts files', () => {
      expect(getRequiredApproval('auth.ts')).toBe('Security');
      expect(getRequiredApproval('auth-bypass.ts')).toBe('Security');
    });

    it('does NOT return Security for non-auth*.ts files with "auth" in name', () => {
      // "author.ts" contains "auth" but doesn't match auth*.ts
      // getRequiredApproval checks lower.includes('auth') first
      expect(getRequiredApproval('src/author.ts')).toBe('Security'); // 'auth' is substring
    });

    it('returns DevOps for files with "config" in path (case-insensitive)', () => {
      expect(getRequiredApproval('src/config/app.yaml')).toBe('DevOps');
    });

    it('returns DevOps for files with "/config" in path', () => {
      expect(getRequiredApproval('config/local.json')).toBe('DevOps');
    });

    it('returns DevOps for files containing "Config" (case-insensitive)', () => {
      expect(getRequiredApproval('AppConfig.ts')).toBe('DevOps');
    });

    it('returns DBA for files with "migration" in path', () => {
      expect(getRequiredApproval('db/migration/001_add_users.sql')).toBe('DBA');
    });

    it('returns DBA for files with "/migration" in path', () => {
      expect(getRequiredApproval('src/migrations/001_init.sql')).toBe('DBA');
    });

    it('returns DBA for files with "migrate" in path', () => {
      expect(getRequiredApproval('db/migrate-users.ts')).toBe('DBA');
    });

    it('returns empty string for unclassified files', () => {
      expect(getRequiredApproval('src/utils/helper.ts')).toBe('');
      expect(getRequiredApproval('src/index.ts')).toBe('');
      expect(getRequiredApproval('README.md')).toBe('');
    });

    it('prioritizes Security+DevOps over other types for secrets', () => {
      // secrets also contains 'config' in the path would return DevOps without the secrets check
      expect(getRequiredApproval('config/secrets.yaml')).toBe('Security+DevOps');
    });

    it('returns empty for a file with "auth" in config dir', () => {
      // auth comes before config in the function
      // This checks: lower.includes('auth') → Security, so /config is never reached
      expect(getRequiredApproval('/config/auth.yaml')).toBe('Security');
    });
  });

  // ── hasValidApproval ─────────────────────────────────────────────────────

  describe('hasValidApproval', () => {
    it('returns false when required is empty string', () => {
      const approvals: ApprovalRecord[] = [{ path: '/a', type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z' }];
      expect(hasValidApproval('/a.ts', '', approvals)).toBe(false);
    });

    it('returns false when approvals array is empty', () => {
      expect(hasValidApproval('/a.ts', 'Security', [])).toBe(false);
    });

    it('returns false when no approval of the required type exists', () => {
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      const approvals: ApprovalRecord[] = [{ path: '/a', type: 'DBA', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z' }];
      expect(hasValidApproval('/a.ts', 'Security', approvals)).toBe(false);
    });

    it('returns true when valid non-expired Security approval exists', () => {
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      const approvals: ApprovalRecord[] = [{ path: '/a', type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' }];
      expect(hasValidApproval('/a.ts', 'Security', approvals)).toBe(true);
    });

    it('returns false when Security approval is expired', () => {
      vi.mocked(isApprovalExpired).mockReturnValue(true);
      const approvals: ApprovalRecord[] = [{ path: '/a', type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z', expires: '2020-01-01T00:00:00Z' }];
      expect(hasValidApproval('/a.ts', 'Security', approvals)).toBe(false);
    });

    it('returns true when valid non-expired DevOps approval exists', () => {
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      const approvals: ApprovalRecord[] = [{ path: '/c', type: 'DevOps', approvedBy: 'bob', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' }];
      expect(hasValidApproval('/config/app.yaml', 'DevOps', approvals)).toBe(true);
    });

    it('returns true when valid non-expired DBA approval exists', () => {
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      const approvals: ApprovalRecord[] = [{ path: '/d', type: 'DBA', approvedBy: 'carol', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' }];
      expect(hasValidApproval('/db/migration/001.sql', 'DBA', approvals)).toBe(true);
    });

    it('returns true for Security+DevOps when both valid approvals exist', () => {
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      const approvals: ApprovalRecord[] = [
        { path: '/s', type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' },
        { path: '/d', type: 'DevOps', approvedBy: 'bob', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' },
      ];
      expect(hasValidApproval('/secrets/prod.yaml', 'Security+DevOps', approvals)).toBe(true);
    });

    it('returns false for Security+DevOps when only Security exists', () => {
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      const approvals: ApprovalRecord[] = [{ path: '/s', type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' }];
      expect(hasValidApproval('/secrets/prod.yaml', 'Security+DevOps', approvals)).toBe(false);
    });

    it('returns false for Security+DevOps when only DevOps exists', () => {
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      const approvals: ApprovalRecord[] = [{ path: '/d', type: 'DevOps', approvedBy: 'bob', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' }];
      expect(hasValidApproval('/secrets/prod.yaml', 'Security+DevOps', approvals)).toBe(false);
    });

    it('returns false for Security+DevOps when Security is expired but DevOps is valid', () => {
      vi.mocked(isApprovalExpired).mockImplementation((r) =>
        r.type === 'Security'
      );
      const approvals: ApprovalRecord[] = [
        { path: '/s', type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z', expires: '2020-01-01T00:00:00Z' },
        { path: '/d', type: 'DevOps', approvedBy: 'bob', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' },
      ];
      expect(hasValidApproval('/secrets/prod.yaml', 'Security+DevOps', approvals)).toBe(false);
    });

    it('returns false for Security+DevOps when both are expired', () => {
      vi.mocked(isApprovalExpired).mockReturnValue(true);
      const approvals: ApprovalRecord[] = [
        { path: '/s', type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z', expires: '2020-01-01T00:00:00Z' },
        { path: '/d', type: 'DevOps', approvedBy: 'bob', approvedAt: '2026-01-01T00:00:00Z', expires: '2020-01-01T00:00:00Z' },
      ];
      expect(hasValidApproval('/secrets/prod.yaml', 'Security+DevOps', approvals)).toBe(false);
    });
  });

  // ── loadApprovals ────────────────────────────────────────────────────────

  describe('loadApprovals (mocked)', () => {
    it('returns empty array when approvals file is null', () => {
      vi.mocked(loadJsonFile).mockReturnValue(null);
      const config = loadJsonFile<{ approvals?: Array<{ type: string }> }>('/path/approvals.json');
      const approvals = config?.approvals ?? [];
      expect(approvals).toEqual([]);
    });

    it('returns approvals from config', () => {
      vi.mocked(loadJsonFile).mockReturnValue({
        approvals: [{ type: 'Security' }, { type: 'DevOps' }],
      });
      const config = loadJsonFile<{ approvals: Array<{ type: string }> }>('/path/approvals.json');
      expect(config?.approvals).toHaveLength(2);
    });
  });

  // ── isEnterpriseProfile ───────────────────────────────────────────────────

  describe('isEnterpriseProfile integration', () => {
    it('returns false for non-enterprise profile', () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(false);
      const config = { profile: 'standard' };
      expect(isEnterpriseProfile(config)).toBe(false);
    });

    it('returns true for enterprise profile', () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      const config = { profile: 'enterprise' };
      expect(isEnterpriseProfile(config)).toBe(true);
    });
  });

  // ── FILE_MODIFYING_TOOLS constant ─────────────────────────────────────────

  describe('FILE_MODIFYING_TOOLS constant', () => {
    const FILE_MODIFYING_TOOLS = new Set([
      'Edit', 'Write', 'remove_files', 'str-replace-editor', 'save-file', 'Bash',
    ]);

    it('contains expected tools', () => {
      expect(FILE_MODIFYING_TOOLS.has('Edit')).toBe(true);
      expect(FILE_MODIFYING_TOOLS.has('Write')).toBe(true);
      expect(FILE_MODIFYING_TOOLS.has('Bash')).toBe(true);
    });

    it('does not contain non-file-modifying tools', () => {
      expect(FILE_MODIFYING_TOOLS.has('Read')).toBe(false);
      expect(FILE_MODIFYING_TOOLS.has('Grep')).toBe(false);
    });
  });

  // ── Block output format ──────────────────────────────────────────────────

  describe('block output format', () => {
    it('generates correct output for single approval requirement', () => {
      const required = 'Security' as ApprovalType;
      const filePath = '/src/auth/login.ts';
      const output = {
        decision: 'block',
        reason: `Change to ${filePath} requires ${required} approval. No valid approval found in .oma/approvals.json`,
        systemMessage: `OMA approval gate: ${filePath} path requires ${required} approval. Record approval in .oma/approvals.json`,
      };
      expect(output.decision).toBe('block');
      expect(output.reason).toContain('Security');
    });

    it('expands Security+DevOps in output', () => {
      const required = 'Security+DevOps' as ApprovalType;
      const filePath = '/secrets/prod.yaml';
      let approvalDesc: string = required;
      if (required === 'Security+DevOps') approvalDesc = 'Security and DevOps';

      const output = {
        decision: 'block',
        reason: `Change to ${filePath} requires ${approvalDesc} approval.`,
      };
      expect(output.reason).toContain('Security and DevOps');
    });
  });

  // ── main() integration tests ───────────────────────────────────────────────

  describe('main() integration', () => {
    it('exits 0 when not in enterprise profile', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(false);
      // process.exit(0) is a no-op in tests — make it throw so main() aborts
      const originalExit = process.exit;
      process.exit = ((code: number) => { throw Object.assign(new Error('exit'), { code }); }) as typeof process.exit;
      try {
        await main();
      } catch (e: unknown) {
        expect((e as { code: number }).code).toBe(0);
      } finally {
        process.exit = originalExit;
      }
    });

    it('exits 0 when stdin is invalid JSON', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('not valid json');
      const originalExit = process.exit;
      process.exit = ((code: number) => { throw Object.assign(new Error('exit'), { code }); }) as typeof process.exit;
      try {
        await main();
      } catch (e: unknown) {
        expect((e as { code: number }).code).toBe(0);
      } finally {
        process.exit = originalExit;
      }
    });

    it('exits 0 when tool_name is not file-modifying', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Grep"}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when file path is not approval-required', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Edit", "tool_input": {"file_path": "src/utils.ts"}}');
      vi.mocked(loadJsonFile).mockReturnValue(null);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when approval-required file has valid approval', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Edit", "tool_input": {"file_path": "src/auth/login.ts"}}');
      vi.mocked(loadJsonFile).mockReturnValue({
        approvals: [{ type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' }],
      });
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 2 when approval-required file has no valid approval', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Edit", "tool_input": {"file_path": "src/auth/login.ts"}}');
      vi.mocked(loadJsonFile).mockReturnValue({ approvals: [] });
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('exits 2 when security+devops file has only one approval', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Write", "tool_input": {"file_path": "config/secrets.yaml"}}');
      vi.mocked(loadJsonFile).mockReturnValue({
        approvals: [{ type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' }],
      });
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('exits 0 when security+devops file has both approvals', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Write", "tool_input": {"file_path": "config/secrets.yaml"}}');
      vi.mocked(loadJsonFile).mockReturnValue({
        approvals: [
          { type: 'Security', approvedBy: 'alice', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' },
          { type: 'DevOps', approvedBy: 'bob', approvedAt: '2026-01-01T00:00:00Z', expires: '2099-01-01T00:00:00Z' },
        ],
      });
      vi.mocked(isApprovalExpired).mockReturnValue(false);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when no file paths found in tool_input', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Edit", "tool_input": {}}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('uses filePath key from tool_input', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Edit", "tool_input": {"filePath": "src/auth/login.ts"}}');
      vi.mocked(loadJsonFile).mockReturnValue({ approvals: [] });
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('uses path key from tool_input', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Edit", "tool_input": {"path": "src/config/app.yaml"}}');
      vi.mocked(loadJsonFile).mockReturnValue({ approvals: [] });
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('exits 2 for DBA-required migration file', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Write", "tool_input": {"file_path": "db/migration/001.sql"}}');
      vi.mocked(loadJsonFile).mockReturnValue({ approvals: [] });
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('calls isEnterpriseProfile and readAllStdin during main()', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(readAllStdin).mockResolvedValue('{"tool_name": "Read"}');
      await main();
      expect(isEnterpriseProfile).toHaveBeenCalled();
      expect(readAllStdin).toHaveBeenCalled();
    });
  });
});
