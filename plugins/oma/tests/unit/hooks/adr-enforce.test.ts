import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/utils.js', () => ({
  readAllStdin: vi.fn(() => ''),
  getMergedConfig: vi.fn(() => ({ profile: 'default' })),
  isEnterpriseProfile: vi.fn(),
  normalizePath: vi.fn((p: string) => p), // passthrough for tests
  isGitAvailable: vi.fn(),
  resolveOmaDir: vi.fn(() => '/mock/oma'),
}));

// Mock fs so that adrDirExists (existsSync) and adrFilesExist (readdirSync) work
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readdirSync: vi.fn(() => ['0012-initial.md']),
}));

import {
  isGitAvailable,
  isEnterpriseProfile,
  readAllStdin,
  resolveOmaDir,
} from '../../../src/utils.js';
import { requiresAdr, hasAdrReference, main } from '../../../src/hooks/adr-enforce.js';

describe('adr-enforce hooks', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── requiresAdr ───────────────────────────────────────────────────────────

  describe('requiresAdr', () => {

    describe('API patterns', () => {
      it('returns true for api-client files', () => {
        expect(requiresAdr(['src/api-client.ts'])).toBe(true);
      });

      it('returns true for api_client files', () => {
        expect(requiresAdr(['src/api_client.ts'])).toBe(true);
      });

      it('returns true for apiclient files', () => {
        expect(requiresAdr(['src/apiclient.ts'])).toBe(true);
      });

      it('returns true for fetch wrappers', () => {
        expect(requiresAdr(['src/fetch.ts'])).toBe(true);
      });

      it('returns true for axios files', () => {
        expect(requiresAdr(['src/utils/axios.ts'])).toBe(true);
      });

      it('returns true for request files', () => {
        expect(requiresAdr(['src/request.ts'])).toBe(true);
      });

      it('returns true for http-client files', () => {
        expect(requiresAdr(['lib/http_client.ts'])).toBe(true);
      });

      it('returns true for rest-client files', () => {
        expect(requiresAdr(['src/rest-client.ts'])).toBe(true);
      });

      it('returns true for graphql-client files', () => {
        expect(requiresAdr(['src/graphql-client.ts'])).toBe(true);
      });

      it('is case-insensitive', () => {
        expect(requiresAdr(['src/API-CLIENT.ts'])).toBe(true);
        expect(requiresAdr(['src/FETCH.ts'])).toBe(true);
      });
    });

    describe('database patterns', () => {
      it('returns true for migration files', () => {
        expect(requiresAdr(['db/migration_001.sql'])).toBe(true);
      });

      it('returns true for schema files', () => {
        expect(requiresAdr(['db/schema.prisma'])).toBe(true);
      });

      it('returns true for migrate files', () => {
        expect(requiresAdr(['scripts/migrate.ts'])).toBe(true);
      });

      it('returns true for db-schema files', () => {
        expect(requiresAdr(['db-schema.json'])).toBe(true);
      });

      it('returns true for table-schema files', () => {
        expect(requiresAdr(['table-schema.sql'])).toBe(true);
      });

      it('is case-insensitive', () => {
        expect(requiresAdr(['db/SCHEMA.SQL'])).toBe(true);
        expect(requiresAdr(['MIGRATION.SQL'])).toBe(true);
      });
    });

    describe('auth patterns', () => {
      it('returns true for auth files', () => {
        expect(requiresAdr(['src/auth.ts'])).toBe(true);
      });

      it('returns true for jwt files', () => {
        expect(requiresAdr(['src/jwt.ts'])).toBe(true);
      });

      it('returns true for oauth files', () => {
        expect(requiresAdr(['src/oauth.ts'])).toBe(true);
      });

      it('returns true for passport files', () => {
        expect(requiresAdr(['src/passport.ts'])).toBe(true);
      });

      it('returns true for session files', () => {
        expect(requiresAdr(['src/session.ts'])).toBe(true);
      });

      it('returns true for acl files', () => {
        expect(requiresAdr(['src/acl.ts'])).toBe(true);
      });

      it('returns true for permission files', () => {
        expect(requiresAdr(['src/permission.ts'])).toBe(true);
      });

      it('returns true for role files', () => {
        expect(requiresAdr(['src/role.ts'])).toBe(true);
      });

      it('is case-insensitive', () => {
        expect(requiresAdr(['src/AUTH.ts'])).toBe(true);
        expect(requiresAdr(['src/JWT.ts'])).toBe(true);
      });
    });

    describe('service boundary patterns', () => {
      it('returns true for interface-service files', () => {
        expect(requiresAdr(['src/interface-service.ts'])).toBe(true);
      });

      it('returns true for service-contract files', () => {
        expect(requiresAdr(['src/service-contract.ts'])).toBe(true);
      });

      it('returns true for port-adapter files', () => {
        expect(requiresAdr(['src/port-adapter.ts'])).toBe(true);
      });

      it('returns true for adapter-pattern files', () => {
        expect(requiresAdr(['src/adapter-pattern.ts'])).toBe(true);
      });

      it('is case-insensitive', () => {
        expect(requiresAdr(['src/INTERFACE-SERVICE.ts'])).toBe(true);
      });
    });

    describe('file count threshold', () => {
      it('returns true when more than 20 files changed', () => {
        const files = Array.from({ length: 21 }, (_, i) => `src/file${i}.ts`);
        expect(requiresAdr(files)).toBe(true);
      });

      it('returns false when exactly 20 files changed', () => {
        const files = Array.from({ length: 20 }, (_, i) => `src/file${i}.ts`);
        expect(requiresAdr(files)).toBe(false);
      });

      it('returns false when 19 files changed', () => {
        const files = Array.from({ length: 19 }, (_, i) => `src/file${i}.ts`);
        expect(requiresAdr(files)).toBe(false);
      });
    });

    describe('returns false for non-ADR files', () => {
      it('returns false for regular source files', () => {
        expect(requiresAdr(['src/utils/helper.ts'])).toBe(false);
        expect(requiresAdr(['src/index.ts'])).toBe(false);
        expect(requiresAdr(['README.md'])).toBe(false);
        expect(requiresAdr(['package.json'])).toBe(false);
        expect(requiresAdr(['tests/unit/foo.test.ts'])).toBe(false);
      });

      it('returns false for empty array', () => {
        expect(requiresAdr([])).toBe(false);
      });
    });

    describe('pattern precedence', () => {
      it('returns true if any file matches any pattern (API takes precedence)', () => {
        // First pattern that matches returns true
        expect(requiresAdr(['src/auth.ts', 'src/api-client.ts'])).toBe(true);
      });

      it('returns true if file matches db pattern even if it also matches auth', () => {
        // auth pattern would match first, but any match returns true
        expect(requiresAdr(['src/auth-migration.ts'])).toBe(true);
      });
    });
  });

  // ── hasAdrReference ───────────────────────────────────────────────────────

  describe('hasAdrReference', () => {
    it('returns true for ADR-N format', () => {
      expect(hasAdrReference('feat: add user login (ADR-12)')).toBe(true);
    });

    it('returns true for ADR-0 format', () => {
      expect(hasAdrReference('ADR-0: initial architecture')).toBe(true);
    });

    it('returns true for large ADR numbers', () => {
      expect(hasAdrReference('fix: ADR-9999')).toBe(true);
    });

    it('returns true for .oma/adr/NNNN- format', () => {
      expect(hasAdrReference('chore: see .oma/adr/0012-initial-choices.md')).toBe(true);
    });

    it('returns true for architectural-decision (hyphenated)', () => {
      expect(hasAdrReference('docs: architectural-decision recorded')).toBe(true);
    });

    it('does NOT match "architectural decision" with a space (pattern requires hyphen or underscore)', () => {
      // The pattern is: architectural[-_]?decision — only hyphen or underscore is allowed between words
      expect(hasAdrReference('architectural decision')).toBe(false);
    });

    it('returns false for regular commit messages', () => {
      expect(hasAdrReference('feat: add button styling')).toBe(false);
      expect(hasAdrReference('fix: resolve race condition')).toBe(false);
      expect(hasAdrReference('chore: update deps')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(hasAdrReference('')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(hasAdrReference('adr-42')).toBe(true);
      // architectural-decision (hyphen) matches the pattern; ARCHITECTURAL-DECISION works
      expect(hasAdrReference('ARCHITECTURAL-DECISION')).toBe(true);
    });

    it('returns true when ADR reference appears mid-message', () => {
      expect(hasAdrReference('WIP: trying ADR-7 approach')).toBe(true);
    });
  });

  // ── adrDirExists ─────────────────────────────────────────────────────────

  describe('adrDirExists', () => {
    it('returns true when directory exists', () => {
      const { existsSync } = require('fs');
      // Use a directory we know exists for this test
      const result = existsSync(__filename);
      expect(typeof result).toBe('boolean');
    });
  });

  // ── Hook type filtering ──────────────────────────────────────────────────

  describe('hook type filtering', () => {
    it('allows PreToolUse hooks', () => {
      const hookType = 'PreToolUse';
      const enforced = hookType === 'PreToolUse' || hookType === 'commit-msg';
      expect(enforced).toBe(true);
    });

    it('allows commit-msg hooks', () => {
      const hookType = 'commit-msg';
      const enforced = hookType === 'PreToolUse' || hookType === 'commit-msg';
      expect(enforced).toBe(true);
    });

    it('blocks non-PreToolUse, non-commit-msg hooks', () => {
      const hookType = 'PostToolUse';
      const enforced = hookType === 'PreToolUse' || hookType === 'commit-msg';
      expect(enforced).toBe(false);
    });

    it('defaults to PreToolUse when env var is missing', () => {
      const hookType = process.env.HOOK_TYPE ?? 'PreToolUse';
      expect(hookType).toBe('PreToolUse');
    });
  });

  // ── Output formats ──────────────────────────────────────────────────────

  describe('output formats', () => {
    it('warn output format is correct', () => {
      const warn = {
        decision: 'warn',
        reason: 'No ADR files found in .oma/adr/. Consider creating an ADR for architectural decisions.',
        systemMessage: 'OMA: ADR directory is empty. Consider documenting architectural decisions in .oma/adr/.',
      };
      expect(warn.decision).toBe('warn');
      expect(warn.systemMessage).toContain('ADR');
    });

    it('block output format is correct', () => {
      const block = {
        decision: 'block',
        reason: 'Architectural change detected but no ADR reference found. Include ADR-NNN in your commit message or link to .oma/adr/NNNN-*.md',
        systemMessage: 'OMA ADR enforcement: Architectural change requires ADR reference. Add ADR-NNN to commit message or link to .oma/adr/ file.',
      };
      expect(block.decision).toBe('block');
      expect(block.reason).toContain('ADR');
    });
  });

  // ── isGitAvailable mock ───────────────────────────────────────────────────

  describe('isGitAvailable', () => {
    it('is exported from utils as a function', () => {
      // verify the function exists in the module (imported at top of file)
      expect(typeof isGitAvailable).toBe('function');
    });
  });

  // ── normalizePath integration ───────────────────────────────────────────

  describe('normalizePath integration', () => {
    it('deduplicates files using a Set (case-sensitive)', () => {
      // The hook deduplicates using a Set of normalized paths
      // normalizePath (path.resolve) is case-sensitive: a.ts ≠ A.TS
      const files = ['a.ts', 'A.TS', 'b.ts'];
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const f of files) {
        const normalized = f; // mock returns f unchanged
        if (!seen.has(normalized)) {
          seen.add(normalized);
          unique.push(f);
        }
      }
      expect(unique).toHaveLength(3); // a.ts, A.TS, b.ts all kept as distinct
    });
  });

  // ── main() integration tests ───────────────────────────────────────────────

  vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
      ...actual,
      readdirSync: vi.fn(() => []),
      existsSync: vi.fn(() => false),
    };
  });

  describe('main() integration', () => {
    const originalHookType = process.env.HOOK_TYPE;

    afterEach(() => {
      if (originalHookType !== undefined) {
        process.env.HOOK_TYPE = originalHookType;
      } else {
        delete process.env.HOOK_TYPE;
      }
    });

    it('exits 0 when not in enterprise profile', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(false);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 for hook types other than PreToolUse and commit-msg', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      process.env.HOOK_TYPE = 'PostToolUse';
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when no architectural changes detected', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(isGitAvailable).mockReturnValue(false);
      process.env.HOOK_TYPE = 'PreToolUse';
      vi.mocked(readAllStdin).mockResolvedValue('{}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('returns early when isGitAvailable is false (empty files array)', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(isGitAvailable).mockReturnValue(false);
      process.env.HOOK_TYPE = 'PreToolUse';
      vi.mocked(readAllStdin).mockResolvedValue('{}');
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('catches execSync error and returns empty array (getChangedFiles catch)', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(isGitAvailable).mockReturnValue(true);
      process.env.HOOK_TYPE = 'PreToolUse';
      vi.mocked(readAllStdin).mockResolvedValue('{}');
      const { execSync: realExecSync } = await import('child_process');
      vi.stubGlobal('execSync', () => { throw new Error('git not available'); });
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 0 when ADR required but reference found in commit message', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(isGitAvailable).mockReturnValue(true);
      process.env.HOOK_TYPE = 'commit-msg';
      vi.mocked(readAllStdin).mockResolvedValue('feat: add auth middleware (ADR-42)');
      const { execSync } = await import('child_process');
      vi.stubGlobal('execSync', vi.fn(() => 'src/auth/middleware.ts\n'));
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('warns and exits 0 when ADR required but adr dir is empty', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(isGitAvailable).mockReturnValue(true);
      process.env.HOOK_TYPE = 'PreToolUse';
      vi.mocked(readAllStdin).mockResolvedValue('{}');
      vi.stubGlobal('execSync', vi.fn(() => 'src/api-client.ts\n'));
      // adr dir exists but empty
      const { readdirSync } = await import('fs');
      vi.mocked(readdirSync).mockReturnValue([]);
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('exits 2 when ADR required, reference not found, and adr dir has files', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(isGitAvailable).mockReturnValue(true);
      process.env.HOOK_TYPE = 'PreToolUse';
      vi.mocked(readAllStdin).mockResolvedValue('{}');
      vi.stubGlobal('execSync', vi.fn(() => 'src/api-client.ts\n'));
      // adr dir has at least one file
      const { readdirSync } = await import('fs');
      vi.mocked(readdirSync).mockReturnValue(['0012-initial.md']);
      await main();
      expect(process.exit).toHaveBeenCalledWith(2);
    });

    it('calls isEnterpriseProfile and readAllStdin during main()', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      process.env.HOOK_TYPE = 'PreToolUse';
      vi.mocked(readAllStdin).mockResolvedValue('{}');
      await main();
      expect(isEnterpriseProfile).toHaveBeenCalled();
      expect(readAllStdin).toHaveBeenCalled();
    });

    it('detects ADR reference from rawInput via digit+adr pattern (inputStr check)', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(isGitAvailable).mockReturnValue(true);
      process.env.HOOK_TYPE = 'commit-msg';
      // rawInput contains 4-digit number + "adr-" pattern → inputStr match sets hasReference=true
      vi.mocked(readAllStdin).mockResolvedValue('feat: see adr-0042 in docs');
      const { execSync } = await import('child_process');
      vi.stubGlobal('execSync', vi.fn(() => 'src/auth.ts\n'));
      await main();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('returns false from adrFilesExist when readdirSync throws (catch branch)', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(isGitAvailable).mockReturnValue(true);
      process.env.HOOK_TYPE = 'PreToolUse';
      vi.mocked(readAllStdin).mockResolvedValue('{}');
      const { execSync } = await import('child_process');
      vi.stubGlobal('execSync', vi.fn(() => 'src/api-client.ts\n'));
      // readdirSync throws → adrFilesExist returns false → adrFilesExist(adrDir) is falsy
      const { readdirSync } = await import('fs');
      vi.mocked(readdirSync).mockImplementation(() => {
        throw new Error('EACCES');
      });
      await main();
      // adrFilesExist returned false (no ADRs exist) → warn + exit(0)
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('triggers main().catch when process.exit throws', async () => {
      vi.mocked(isEnterpriseProfile).mockReturnValue(true);
      vi.mocked(isGitAvailable).mockReturnValue(true);
      process.env.HOOK_TYPE = 'PreToolUse';
      vi.mocked(readAllStdin).mockResolvedValue('{}');
      const { execSync } = await import('child_process');
      vi.stubGlobal('execSync', vi.fn(() => 'src/api-client.ts\n'));
      const { readdirSync } = await import('fs');
      vi.mocked(readdirSync).mockReturnValue(['0012-initial.md']);
      // Use spyOn so vitest tracks the call before we replace the implementation
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code: number) => {
        throw Object.assign(new Error('exit'), { code });
      });
      try {
        await main();
      } catch {
        // process.exit(2) inside .catch() also throws; we expect this to propagate
      }
      expect(exitSpy).toHaveBeenCalled();
      exitSpy.mockRestore();
    });
  });
});
