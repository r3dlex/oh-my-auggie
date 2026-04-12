import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock state ────────────────────────────────────────────────────────────────
const existsSyncMock = vi.fn();
const readFileSyncMock = vi.fn();
const writeFileSyncMock = vi.fn();
const spawnMock = vi.fn();

vi.mock('fs', () => ({
  existsSync: (...args: unknown[]) => existsSyncMock(...args),
  readFileSync: (...args: unknown[]) => readFileSyncMock(...args),
  writeFileSync: (...args: unknown[]) => writeFileSyncMock(...args),
}));

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

vi.mock('../../../src/utils.js', () => ({
  getMergedConfig: vi.fn(() => ({ graph: { provider: 'graphwiki' } })),
  readAllStdin: vi.fn(() => Promise.resolve('')),
  resolveProjectDir: vi.fn(() => '/mock/project'),
  resolveOmaDir: vi.fn(() => '/mock/project/.oma'),
}));

import { getMergedConfig, readAllStdin } from '../../../src/utils.js';
import { main } from '../../../src/hooks/graph-auto-rebuild.js';

// ─── beforeEach / afterEach ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'graphwiki' } } as any);
  existsSyncMock.mockReturnValue(true);
  readFileSyncMock.mockImplementation(() => { throw new Error('no file'); });
  writeFileSyncMock.mockReturnValue(undefined);
  vi.mocked(readAllStdin).mockResolvedValue('');
  spawnMock.mockReturnValue({ unref: vi.fn() });
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
});

afterEach(() => {
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
});

// ─── Test cases ────────────────────────────────────────────────────────────────

describe('graph-auto-rebuild', () => {

  it('exits 0 (no-op) when provider is not graphwiki', async () => {
    vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'graphify' } } as any);
    await main();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits 0 when getMergedConfig throws', async () => {
    vi.mocked(getMergedConfig).mockImplementation(() => { throw new Error('config error'); });
    await main();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits 0 when graphwiki-out/GRAPH_REPORT.md does not exist', async () => {
    existsSyncMock.mockReturnValue(false);
    await main();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits 0 when stdin is TTY (no input)', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    await main();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits 0 when stdin is empty (non-TTY but no data)', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    vi.mocked(readAllStdin).mockResolvedValue('');
    await main();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits 0 when stdin has invalid JSON', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    vi.mocked(readAllStdin).mockResolvedValue('not json {{{');
    await main();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits 0 when tool is not a file-modifying tool (Read)', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    vi.mocked(readAllStdin).mockResolvedValue(JSON.stringify({ tool_name: 'Read', tool_input: {} }));
    await main();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits 0 when within cooldown window', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    vi.mocked(readAllStdin).mockResolvedValue(JSON.stringify({ tool_name: 'Edit', tool_input: {} }));
    // Return a recent timestamp (within 30s cooldown)
    readFileSyncMock.mockReturnValue(JSON.stringify({ lastRebuild: new Date().toISOString() }));
    await main();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('spawns rebuild when all conditions met and cooldown has passed', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    vi.mocked(readAllStdin).mockResolvedValue(JSON.stringify({ tool_name: 'Edit', tool_input: {} }));
    // Return a stale timestamp (>30s ago)
    const staleDate = new Date(Date.now() - 60_000).toISOString();
    readFileSyncMock.mockReturnValue(JSON.stringify({ lastRebuild: staleDate }));
    await main();
    expect(spawnMock).toHaveBeenCalledWith(
      'graphwiki', ['build', '.', '--update'],
      expect.objectContaining({ cwd: '/mock/project', detached: true, stdio: 'ignore' })
    );
    expect(writeFileSyncMock).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('spawns rebuild on Write tool when cooldown file is missing (first time)', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    vi.mocked(readAllStdin).mockResolvedValue(JSON.stringify({ tool_name: 'Write', tool_input: {} }));
    // readFileSync throws = no cooldown file
    readFileSyncMock.mockImplementation(() => { throw new Error('ENOENT'); });
    await main();
    expect(spawnMock).toHaveBeenCalledWith(
      'graphwiki', ['build', '.', '--update'],
      expect.objectContaining({ cwd: '/mock/project', detached: true })
    );
    expect(process.exit).toHaveBeenCalledWith(0);
  });

});
