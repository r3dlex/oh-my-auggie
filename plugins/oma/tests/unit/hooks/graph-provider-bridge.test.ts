import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock state ────────────────────────────────────────────────────────────────
const existsSyncMock = vi.fn();
const spawnSyncMock = vi.fn();

vi.mock('fs', () => ({
  existsSync: (...args: unknown[]) => existsSyncMock(...args),
}));

vi.mock('child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSyncMock(...args),
}));

vi.mock('../../../src/utils.js', () => ({
  getMergedConfig: vi.fn(() => ({ graph: { provider: 'graphwiki' } })),
  readAllStdin: vi.fn(() => Promise.resolve('')),
}));

import { getMergedConfig, readAllStdin } from '../../../src/utils.js';
import { main } from '../../../src/hooks/graph-provider-bridge.js';

// ─── beforeEach / afterEach ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: config is graphwiki, report exists, stdin returns empty
  vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'graphwiki' } } as any);
  existsSyncMock.mockReturnValue(true);
  vi.mocked(readAllStdin).mockResolvedValue('');
  spawnSyncMock.mockReturnValue({ stdout: '', stderr: '', status: 0 });
  delete process.env.AUGMENT_PROJECT_DIR;
});

afterEach(() => {
  delete process.env.AUGMENT_PROJECT_DIR;
});

// ─── Test cases ────────────────────────────────────────────────────────────────

describe('graph-provider-bridge', () => {

  it('provider "none" → no output, exits silently', async () => {
    vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'none' } } as any);
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    expect(process.exit).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it('provider "graphify" → no output, exits silently', async () => {
    vi.mocked(getMergedConfig).mockReturnValue({ graph: { provider: 'graphify' } } as any);
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    expect(process.exit).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it('provider "graphwiki" + no GRAPH_REPORT.md → no output', async () => {
    existsSyncMock.mockReturnValue(false);
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    expect(process.exit).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it('provider "graphwiki" + report exists + Edit tool → no output (not in CONTEXT_TOOLS)', async () => {
    vi.mocked(readAllStdin).mockResolvedValue(
      JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: '/some/file.ts' } })
    );
    // Simulate non-TTY
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    expect(process.exit).toHaveBeenCalledWith(0);
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    consoleSpy.mockRestore();
  });

  it('provider "graphwiki" + report exists + Read tool + file path → outputs hookSpecificOutput JSON', async () => {
    vi.mocked(readAllStdin).mockResolvedValue(
      JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '/project/src/utils.ts' } })
    );
    spawnSyncMock.mockReturnValue({ stdout: '{"nodes":["utils"]}', stderr: '', status: 0 });
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    const jsonCall = consoleSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && (call[0] as string).startsWith('{')
    );
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('[GraphWiki] Context for utils');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('{"nodes":["utils"]}');
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    consoleSpy.mockRestore();
  });

  it('spawnSync returns empty stdout → no output', async () => {
    vi.mocked(readAllStdin).mockResolvedValue(
      JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '/project/src/index.ts' } })
    );
    spawnSyncMock.mockReturnValue({ stdout: '', stderr: '', status: 0 });
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    consoleSpy.mockRestore();
  });

  it('getMergedConfig throws → no output, exits silently', async () => {
    vi.mocked(getMergedConfig).mockImplementation(() => { throw new Error('config error'); });
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    expect(process.exit).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it('stdin provides invalid JSON → catch branch exits silently (lines 46-48)', async () => {
    vi.mocked(readAllStdin).mockResolvedValue('not valid json {{{');
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    expect(process.exit).toHaveBeenCalledWith(0);
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    consoleSpy.mockRestore();
  });

  it('tool_input has no file_path/path/pattern → filePath is "" → exits silently (line 44)', async () => {
    vi.mocked(readAllStdin).mockResolvedValue(
      JSON.stringify({ tool_name: 'Read', tool_input: { content: 'no path here' } })
    );
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    expect(process.exit).toHaveBeenCalledWith(0);
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    consoleSpy.mockRestore();
  });

  it('spawnSync throws → catch block exits silently (lines 73-74)', async () => {
    vi.mocked(readAllStdin).mockResolvedValue(
      JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '/project/src/utils.ts' } })
    );
    spawnSyncMock.mockImplementation(() => { throw new Error('spawn failed'); });
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    expect(process.exit).toHaveBeenCalledWith(0);
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    consoleSpy.mockRestore();
  });

  it('spawnSync output > 500 chars → context is sliced to 500 chars', async () => {
    vi.mocked(readAllStdin).mockResolvedValue(
      JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '/project/src/utils.ts' } })
    );
    const longOutput = 'x'.repeat(600);
    spawnSyncMock.mockReturnValue({ stdout: longOutput, stderr: '', status: 0 });
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    const jsonCall = consoleSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && (call[0] as string).startsWith('{')
    );
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.hookSpecificOutput.additionalContext).toContain('x'.repeat(500));
    expect(parsed.hookSpecificOutput.additionalContext).not.toContain('x'.repeat(501));
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    consoleSpy.mockRestore();
  });

  it('stdin is TTY → rawInput stays empty → exits silently', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    const consoleSpy = vi.spyOn(console, 'log').mockReturnValue();
    await main();
    expect(consoleSpy.mock.calls).toHaveLength(0);
    expect(process.exit).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

});
