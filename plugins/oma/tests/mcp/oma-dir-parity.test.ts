import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
// Shared .mjs contract (consumed by plugins/oma/mcp/state-server.mjs — outside the tsc build)
import { resolveOmaDir as resolveOmaDirMjs } from '../../mcp/oma-dir.mjs';
// TypeScript surface (src/utils.ts) — must agree with the .mjs contract
import { resolveOmaDir as resolveOmaDirTs } from '../../src/utils.js';

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'oma-parity-test-'));
}

describe('resolveOmaDir parity: mcp/oma-dir.mjs vs src/utils.ts (ADR-0006)', () => {
  const savedOmaDir = process.env.OMA_DIR;
  const savedProjectDir = process.env.AUGMENT_PROJECT_DIR;
  const savedWorkspaceRoot = process.env.WORKSPACE_ROOT;
  const cleanups: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks(); // undo process.cwd spies
    if (savedOmaDir === undefined) delete process.env.OMA_DIR; else process.env.OMA_DIR = savedOmaDir;
    if (savedProjectDir === undefined) delete process.env.AUGMENT_PROJECT_DIR; else process.env.AUGMENT_PROJECT_DIR = savedProjectDir;
    if (savedWorkspaceRoot === undefined) delete process.env.WORKSPACE_ROOT; else process.env.WORKSPACE_ROOT = savedWorkspaceRoot;
    for (const dir of cleanups.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  /** Runs both resolvers under the current env/cwd and asserts identical results. */
  function expectParity(expected: string): void {
    const mjs = resolveOmaDirMjs();
    const ts = resolveOmaDirTs();
    expect(mjs).toBe(expected);
    expect(ts).toBe(expected);
    expect(resolve(mjs)).toBe(resolve(ts));
  }

  it('OMA_DIR set wins and is created when absent', () => {
    const base = tmpDir();
    cleanups.push(base);
    const target = join(base, 'nested', 'oma-state');
    process.env.OMA_DIR = target;
    expectParity(resolve(target));
    expect(existsSync(target)).toBe(true); // mkdir side effect, both sides
  });

  it('OMA_DIR unset x AUGMENT_PROJECT_DIR set -> <project>/.oma', () => {
    const base = tmpDir();
    cleanups.push(base);
    delete process.env.OMA_DIR;
    process.env.AUGMENT_PROJECT_DIR = base;
    expectParity(join(base, '.oma'));
  });

  it('OMA_DIR unset x WORKSPACE_ROOT set -> <workspaceRoot>/.oma', () => {
    const base = tmpDir();
    cleanups.push(base);
    delete process.env.OMA_DIR;
    delete process.env.AUGMENT_PROJECT_DIR;
    process.env.WORKSPACE_ROOT = base;
    expectParity(join(base, '.oma'));
  });

  it('all env unset x walk-up ancestor has .oma -> nearest ancestor .oma', () => {
    const base = tmpDir();
    cleanups.push(base);
    const deep = join(base, 'a', 'b');
    mkdirSync(join(base, '.oma'), { recursive: true });
    mkdirSync(deep, { recursive: true });
    delete process.env.OMA_DIR;
    delete process.env.AUGMENT_PROJECT_DIR;
    delete process.env.WORKSPACE_ROOT;
    vi.spyOn(process, 'cwd').mockReturnValue(deep);
    expectParity(join(base, '.oma'));
  });

  it('all env unset x no .oma anywhere upward -> $HOME/.oma', () => {
    const base = tmpDir();
    cleanups.push(base);
    delete process.env.OMA_DIR;
    delete process.env.AUGMENT_PROJECT_DIR;
    delete process.env.WORKSPACE_ROOT;
    vi.spyOn(process, 'cwd').mockReturnValue(base); // tmpdir ancestry has no .oma
    expectParity(join(process.env.HOME || '/tmp', '.oma'));
  });
});