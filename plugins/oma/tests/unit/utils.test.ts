import { describe, it, expect } from 'vitest';
import { loadJsonFile, isEnterpriseProfile, getFilePathsFromInput, normalizePath, isApprovalExpired } from '../../src/utils.js';
import { writeFileSync, unlinkSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';

// ─── helpers ────────────────────────────────────────────────────────────────

function tmpFile(content: string): { file: string; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'oma-utils-test-'));
  const file = join(dir, 'test.json');
  writeFileSync(file, content, 'utf8');
  return { file, dir };
}

// ─── loadJsonFile ───────────────────────────────────────────────────────────

describe('loadJsonFile', () => {
  it('parses a valid JSON file', () => {
    const { file, dir } = tmpFile('{"key":"value"}');
    try {
      const result = loadJsonFile<{ key: string }>(file);
      expect(result).toEqual({ key: 'value' });
    } finally {
      unlinkSync(file);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null when file does not exist (ENOENT)', () => {
    const result = loadJsonFile<unknown>('/nonexistent/path/to/file.json');
    expect(result).toBeNull();
  });

  it('throws on invalid JSON', () => {
    const { file, dir } = tmpFile('not json');
    try {
      expect(() => loadJsonFile<unknown>(file)).toThrow();
    } finally {
      unlinkSync(file);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── isEnterpriseProfile ────────────────────────────────────────────────────

describe('isEnterpriseProfile', () => {
  it('returns true when config.profile is enterprise', () => {
    expect(isEnterpriseProfile({ profile: 'enterprise' })).toBe(true);
  });

  it('returns false when config.profile is not enterprise', () => {
    expect(isEnterpriseProfile({ profile: 'standard' })).toBe(false);
  });

  it('returns false when profile is absent', () => {
    expect(isEnterpriseProfile({})).toBe(false);
  });
});

// ─── getFilePathsFromInput ───────────────────────────────────────────────────

describe('getFilePathsFromInput', () => {
  it('extracts file_path from tool_input', () => {
    const input = { tool_input: { file_path: '/src/index.ts' } };
    expect(getFilePathsFromInput(input)).toEqual(['/src/index.ts']);
  });

  it('extracts path from tool_input', () => {
    const input = { tool_input: { path: '/src/main.ts' } };
    expect(getFilePathsFromInput(input)).toEqual(['/src/main.ts']);
  });

  it('extracts filePath from tool_input', () => {
    const input = { tool_input: { filePath: '/src/app.ts' } };
    expect(getFilePathsFromInput(input)).toEqual(['/src/app.ts']);
  });

  it('extracts multiple fields in priority order', () => {
    const input = {
      tool_input: {
        file_path: '/a.ts',
        path: '/b.ts',
        filePath: '/c.ts',
      },
    };
    expect(getFilePathsFromInput(input)).toEqual(['/a.ts', '/b.ts', '/c.ts']);
  });

  it('skips empty string values', () => {
    const input = { tool_input: { file_path: '', path: '/b.ts' } };
    expect(getFilePathsFromInput(input)).toEqual(['/b.ts']);
  });

  it('returns empty array when no fields present', () => {
    expect(getFilePathsFromInput({ tool_input: {} })).toEqual([]);
    expect(getFilePathsFromInput({})).toEqual([]);
  });
});

// ─── normalizePath ──────────────────────────────────────────────────────────

describe('normalizePath', () => {
  it('converts a relative path to an absolute path', () => {
    const result = normalizePath('src/file.ts');
    expect(result).toBe(resolve('src/file.ts'));
  });

  it('resolves a Git Bash-style path on win32', () => {
    // normalizePath uses path.resolve which returns native format
    const result = normalizePath('/c/Users/test/file.ts');
    expect(result).toBe(resolve('/c/Users/test/file.ts'));
  });

  it('returns a POSIX path unchanged on linux', () => {
    const result = normalizePath('/mnt/c/Users/test/file.ts');
    expect(result).toBe('/mnt/c/Users/test/file.ts');
  });

  it('returns an absolute path unchanged', () => {
    const result = normalizePath('/absolute/path/to/file.ts');
    expect(result).toBe('/absolute/path/to/file.ts');
  });
});

// ─── isApprovalExpired ──────────────────────────────────────────────────────

describe('isApprovalExpired', () => {
  it('returns false when expires is absent (never expires)', () => {
    const record = { path: '/a', type: 'Security', approvedBy: 'alice', approvedAt: '2026-04-04T12:00:00Z' };
    expect(isApprovalExpired(record)).toBe(false);
  });

  it('returns false when expiry is in the future', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h from now
    const record = { path: '/a', type: 'Security', approvedBy: 'alice', approvedAt: '2026-04-04T12:00:00Z', expires: future };
    expect(isApprovalExpired(record)).toBe(false);
  });

  it('returns true when expiry is in the past (beyond clock-skew tolerance)', () => {
    const past = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10m ago (beyond 5m tolerance)
    const record = { path: '/a', type: 'DevOps', approvedBy: 'bob', approvedAt: '2026-04-04T12:00:00Z', expires: past };
    expect(isApprovalExpired(record)).toBe(true);
  });

  it('returns false when expiry is within the 5-minute clock-skew tolerance', () => {
    const justPast = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2m ago (within 5m tolerance)
    const record = { path: '/a', type: 'DBA', approvedBy: 'carol', approvedAt: '2026-04-04T12:00:00Z', expires: justPast };
    expect(isApprovalExpired(record)).toBe(false);
  });

  it('parses ISO 8601 expiry correctly', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const record = { path: '/b', type: 'Security+DevOps', approvedBy: 'dave', approvedAt: '2026-04-04T12:00:00Z', expires: future };
    expect(isApprovalExpired(record)).toBe(false);
  });
});
