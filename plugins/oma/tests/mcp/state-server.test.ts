import { describe, it, expect, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

// The real server, spawned as a subprocess — this test pins WHERE state lands,
// which no prior test did (the bats suite passed vacuously with OMA_DIR ignored).
const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER_PATH = join(PLUGIN_ROOT, 'mcp', 'state-server.mjs');
const INSTALL_OMA_DIR = join(PLUGIN_ROOT, '.oma'); // pre-fix derivation target: join(__dirname, '..', '.oma')

const REQUEST_TIMEOUT_MS = 15_000;

interface PendingEntry {
  resolve: (msg: Record<string, unknown>) => void;
  timer: ReturnType<typeof setTimeout>;
}

// Minimal line-delimited JSON-RPC client over the server's stdio transport.
class RpcClient {
  private pending = new Map<number, { resolve: (m: Record<string, unknown>) => void; timer: ReturnType<typeof setTimeout> }>();
  private nextId = 1;
  private stderrBuf = '';

  constructor(private readonly child: ReturnType<typeof spawn>) {
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      const id = msg.id as number | undefined;
      const entry = id !== null && id !== undefined ? this.pending.get(id) : undefined;
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(id as number);
      entry.resolve(msg);
    });
    child.stderr?.on('data', (d: Buffer) => {
      this.stderrBuf += d.toString();
    });
  }

  request(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    return new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.child.kill();
        rejectPromise(new Error(`timed out after ${REQUEST_TIMEOUT_MS}ms waiting for response to ${method}. stderr: ${this.stderrBuf}`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolvePromise, timer });
      this.child.stdin.write(payload + '\n');
    });
  }

  close(): void {
    this.child.stdin.end();
  }
}

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'oma-state-server-test-'));
}

// Spawns the real server with OMA_DIR set and cwd pointed OUTSIDE the plugin,
// so any cwd- or install-dir-dependent resolution shows up as a failure.
async function startServer(omaDir: string, cwd: string): Promise<RpcClient> {
  const child = spawn(process.execPath, [SERVER_PATH], {
    env: { ...process.env, OMA_DIR: omaDir },
    cwd,
  });
  return new RpcClient(child);
}

async function handshake(client: RpcClient): Promise<void> {
  const res = await client.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'oma-test', version: '0.0.0' } });
  expect(res.error).toBeUndefined();
  expect((res.result as { serverInfo?: { name?: string } })?.serverInfo?.name).toBe('oma-state-server');
}

describe('state-server.mjs honors the canonical .oma dir contract (ADR-0006)', () => {
  const cleanups: string[] = [];

  afterEach(() => {
    for (const dir of cleanups.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('lands state written via oma_mode_set under $OMA_DIR, not the plugin install dir', async () => {
    const omaDir = tmpDir();
    const foreignCwd = tmpDir(); // cwd outside the repo: state must NOT depend on it
    cleanups.push(omaDir, foreignCwd);

    // The install dir is gitignored runtime state; a pre-existing state.json there
    // is unrelated to this test, so only fail if this test CREATES it.
    const installStateFile = join(INSTALL_OMA_DIR, 'state.json');
    const installStateExisted = existsSync(installStateFile);

    const client = await startServer(omaDir, foreignCwd);
    try {
      await handshake(client);

      const res = await client.request('tools/call', { name: 'oma_mode_set', arguments: { mode: 'parity-probe', active: true } });
      expect(res.error).toBeUndefined();

      const stateFile = join(omaDir, 'state.json');
      expect(existsSync(stateFile)).toBe(true);
      const state = JSON.parse(readFileSync(stateFile, 'utf8')) as { mode?: string; active?: boolean };
      expect(state.mode).toBe('parity-probe');
      expect(state.active).toBe(true);

      if (!installStateExisted) {
        expect(existsSync(installStateFile)).toBe(false);
      }
    } finally {
      client.close();
    }
  });

  it('serves skills from the plugin install root regardless of cwd', async () => {
    const omaDir = tmpDir();
    const foreignCwd = tmpDir(); // cwd-relative 'plugins/oma/skills' does not exist here
    cleanups.push(omaDir, foreignCwd);

    const client = await startServer(omaDir, foreignCwd);
    try {
      await handshake(client);

      const listRes = await client.request('tools/call', { name: 'oma_skill_list', arguments: {} });
      expect(listRes.error).toBeUndefined();
      const { skills = [] } = (listRes.result ?? {}) as { skills?: Array<{ name: string }> };
      expect(skills.length).toBeGreaterThan(0);

      // inject the first listed skill: exercises the second cwd-relative path
      const injectRes = await client.request('tools/call', { name: 'oma_skill_inject', arguments: { skill: skills[0].name } });
      expect(injectRes.error).toBeUndefined();
      expect((injectRes.result as { ok?: boolean })?.ok).toBe(true);
      expect((injectRes.result as { content?: string })?.content).toBeTruthy();

      // and the listed paths must point into the plugin install root, not cwd
      for (const skill of skills) {
        const skillPath = (skill as unknown as { path: string }).path;
        expect(resolve(skillPath).startsWith(PLUGIN_ROOT)).toBe(true);
      }
    } finally {
      client.close();
    }
  });
});