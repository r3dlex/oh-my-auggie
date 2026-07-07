import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  loadJsonFile, isEnterpriseProfile, getFilePathsFromInput, normalizePath, isApprovalExpired,
  findOmaDir, resolveInOmaDir, atomicWrite, readJsonSafe,
  listWorkerDirs, nextWorkerId, isPidAlive, tailLines,
} from '../../src/utils.js';
import { writeFileSync, unlinkSync, rmSync, mkdirSync, existsSync, readFileSync, realpathSync } from 'fs';
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

// ─── CLI runtime utilities (merged from src/cli/utils.ts) ───────────────────

function tmpDir(): string {
  // realpathSync: on macOS tmpdir() is a /var -> /private/var symlink and
  // process.cwd() returns the resolved path, which would break cwd-based tests.
  return realpathSync(mkdtempSync(join(tmpdir(), 'oma-utils-test-')));
}

// ─── findOmaDir ─────────────────────────────────────────────────────────────

describe('findOmaDir', () => {
  const savedOmaDir = process.env.OMA_DIR;
  const cleanups: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks(); // undo process.cwd spies (process.chdir is unsupported in vitest workers)
    if (savedOmaDir === undefined) delete process.env.OMA_DIR;
    else process.env.OMA_DIR = savedOmaDir;
    for (const d of cleanups.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it('honors OMA_DIR and creates the directory', () => {
    const base = tmpDir();
    cleanups.push(base);
    const target = join(base, 'nested', 'oma-state');
    process.env.OMA_DIR = target;
    const result = findOmaDir();
    expect(result).toBe(resolve(target));
    expect(existsSync(target)).toBe(true);
  });

  it('walks upward from cwd to the nearest existing .oma', () => {
    delete process.env.OMA_DIR;
    const base = tmpDir();
    cleanups.push(base);
    const omaDir = join(base, '.oma');
    const deep = join(base, 'a', 'b');
    mkdirSync(omaDir, { recursive: true });
    mkdirSync(deep, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(deep);
    expect(findOmaDir()).toBe(omaDir);
  });

  it('falls back to $HOME/.oma when no .oma exists upward', () => {
    delete process.env.OMA_DIR;
    const base = tmpDir();
    cleanups.push(base);
    vi.spyOn(process, 'cwd').mockReturnValue(base); // tmpdir ancestry has no .oma
    expect(findOmaDir()).toBe(join(process.env.HOME || '/tmp', '.oma'));
  });
});

// ─── resolveInOmaDir ────────────────────────────────────────────────────────

describe('resolveInOmaDir', () => {
  const savedOmaDir = process.env.OMA_DIR;
  const cleanups: string[] = [];

  afterEach(() => {
    if (savedOmaDir === undefined) delete process.env.OMA_DIR;
    else process.env.OMA_DIR = savedOmaDir;
    for (const d of cleanups.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it('resolves relative to the OMA dir and creates the parent directory', () => {
    const base = tmpDir();
    cleanups.push(base);
    process.env.OMA_DIR = base;
    const result = resolveInOmaDir('team/worker-1/state.json');
    expect(result).toBe(join(base, 'team', 'worker-1', 'state.json'));
    expect(existsSync(join(base, 'team', 'worker-1'))).toBe(true);
  });
});

// ─── atomicWrite / readJsonSafe ─────────────────────────────────────────────

describe('atomicWrite', () => {
  it('writes pretty-printed JSON, creating parent directories', () => {
    const base = tmpDir();
    try {
      const file = join(base, 'deep', 'nested', 'out.json');
      atomicWrite(file, { a: 1 });
      expect(readFileSync(file, 'utf8')).toBe(JSON.stringify({ a: 1 }, null, 2));
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('replaces an existing file and leaves no temp files behind', () => {
    const base = tmpDir();
    try {
      const file = join(base, 'out.json');
      atomicWrite(file, { v: 1 });
      atomicWrite(file, { v: 2 });
      expect(readJsonSafe<{ v: number }>(file)).toEqual({ v: 2 });
      expect(tailLines(file, 100).some(l => l.includes('.tmp.'))).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('readJsonSafe', () => {
  it('parses a valid JSON file', () => {
    const { file, dir } = tmpFile('{"key":"value"}');
    try {
      expect(readJsonSafe<{ key: string }>(file)).toEqual({ key: 'value' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null by default when the file is absent', () => {
    expect(readJsonSafe('/nonexistent/path/to/file.json')).toBeNull();
  });

  it('returns the fallback when the file is absent or corrupt', () => {
    expect(readJsonSafe('/nonexistent/path/to/file.json', { d: true })).toEqual({ d: true });
    const { file, dir } = tmpFile('not json');
    try {
      expect(readJsonSafe(file, { d: true })).toEqual({ d: true });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── worker directory helpers ───────────────────────────────────────────────

describe('listWorkerDirs / nextWorkerId', () => {
  it('returns [] and id 1 for a missing team dir', () => {
    expect(listWorkerDirs('/nonexistent/team')).toEqual([]);
    expect(nextWorkerId('/nonexistent/team')).toBe(1);
  });

  it('lists worker-N dirs numerically sorted and ignores other entries', () => {
    const base = tmpDir();
    try {
      for (const name of ['worker-2', 'worker-10', 'worker-1', 'not-a-worker', 'worker-x']) {
        mkdirSync(join(base, name), { recursive: true });
      }
      expect(listWorkerDirs(base)).toEqual([
        join(base, 'worker-1'),
        join(base, 'worker-2'),
        join(base, 'worker-10'),
      ]);
      expect(nextWorkerId(base)).toBe(11);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

// ─── isPidAlive ─────────────────────────────────────────────────────────────

describe('isPidAlive', () => {
  it('returns true for the current process', () => {
    expect(isPidAlive(process.pid)).toBe(true);
  });

  it('returns false for an invalid pid', () => {
    expect(isPidAlive(2 ** 30)).toBe(false);
  });
});

// ─── tailLines ──────────────────────────────────────────────────────────────

describe('tailLines', () => {
  it('returns the last n non-empty lines', () => {
    const { file, dir } = tmpFile('one\ntwo\n\nthree\nfour\n');
    try {
      expect(tailLines(file, 3)).toEqual(['two', 'three', 'four']);
      expect(tailLines(file)).toEqual(['two', 'three', 'four']); // default n=3
      expect(tailLines(file, 10)).toEqual(['one', 'two', 'three', 'four']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns [] for a missing file', () => {
    expect(tailLines('/nonexistent/log.txt')).toEqual([]);
  });
});
