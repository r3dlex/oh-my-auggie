import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAutoUpdateDisabled,
  isNewerVersion,
  maybeCheckAndPromptUpdate,
  shouldCheckForLatest,
  shouldPromptForUpdate,
} from '../../../../../cli/update.mjs';

describe('cli/update', () => {
  const originalEnv = {
    OMA_AUTO_UPDATE: process.env.OMA_AUTO_UPDATE,
    OMA_DISABLE_AUTO_UPDATE: process.env.OMA_DISABLE_AUTO_UPDATE,
  };

  beforeEach(() => {
    delete process.env.OMA_AUTO_UPDATE;
    delete process.env.OMA_DISABLE_AUTO_UPDATE;
  });

  afterEach(() => {
    if (originalEnv.OMA_AUTO_UPDATE === undefined) {
      delete process.env.OMA_AUTO_UPDATE;
    } else {
      process.env.OMA_AUTO_UPDATE = originalEnv.OMA_AUTO_UPDATE;
    }

    if (originalEnv.OMA_DISABLE_AUTO_UPDATE === undefined) {
      delete process.env.OMA_DISABLE_AUTO_UPDATE;
    } else {
      process.env.OMA_DISABLE_AUTO_UPDATE = originalEnv.OMA_DISABLE_AUTO_UPDATE;
    }
  });

  it('detects newer versions with strict semver compare', () => {
    expect(isNewerVersion('0.3.1', '0.3.2')).toBe(true);
    expect(isNewerVersion('0.3.2', '0.3.2')).toBe(false);
    expect(isNewerVersion('0.3.2', '0.3.1')).toBe(false);
    expect(isNewerVersion('v0.3.2', 'v0.4.0')).toBe(true);
    expect(isNewerVersion('not-semver', '0.4.0')).toBe(false);
  });

  it('treats known env flags as auto-update disable', () => {
    process.env.OMA_AUTO_UPDATE = '0';
    expect(isAutoUpdateDisabled()).toBe(true);

    process.env.OMA_AUTO_UPDATE = 'false';
    expect(isAutoUpdateDisabled()).toBe(true);

    delete process.env.OMA_AUTO_UPDATE;
    process.env.OMA_DISABLE_AUTO_UPDATE = 'true';
    expect(isAutoUpdateDisabled()).toBe(true);

    delete process.env.OMA_DISABLE_AUTO_UPDATE;
    expect(isAutoUpdateDisabled()).toBe(false);
  });

  it('applies TTL gating for checks and prompt cooldown', () => {
    const now = Date.parse('2026-04-17T10:00:00.000Z');

    expect(shouldCheckForLatest(null, now)).toBe(true);
    expect(shouldCheckForLatest({ lastChecked: 'invalid' }, now)).toBe(true);
    expect(
      shouldCheckForLatest({ lastChecked: '2026-04-17T09:30:00.000Z' }, now, 60 * 60 * 1000),
    ).toBe(false);

    expect(
      shouldPromptForUpdate(
        { updateAvailable: true, latestVersion: '0.4.0', lastPromptedVersion: '0.3.9' },
        now,
        24 * 60 * 60 * 1000,
      ),
    ).toBe(true);

    expect(
      shouldPromptForUpdate(
        {
          updateAvailable: true,
          latestVersion: '0.4.0',
          lastPromptedVersion: '0.4.0',
          lastPromptedAt: '2026-04-17T09:50:00.000Z',
        },
        now,
        24 * 60 * 60 * 1000,
      ),
    ).toBe(false);
  });

  it('prompts and installs when update is available in tty mode', async () => {
    const writes: Record<string, unknown>[] = [];
    const promptYesNo = vi.fn(async () => true);
    const installLatest = vi.fn(() => ({ ok: true, channel: '@r3dlex/oh-my-auggie@latest' }));

    const status = await maybeCheckAndPromptUpdate(
      {
        io: { stdin: { isTTY: true }, stdout: { isTTY: true } },
        omaDir: '/tmp/oma-test',
      },
      {
        now: () => Date.parse('2026-04-17T10:00:00.000Z'),
        readCurrentVersion: () => '0.3.1',
        readUpdateCache: () => ({
          lastChecked: '2026-04-17T07:00:00.000Z',
          latestVersion: '0.3.1',
          updateAvailable: false,
        }),
        writeUpdateCache: (_omaDir: string, cache: Record<string, unknown>) => {
          writes.push(cache);
        },
        fetchLatestVersion: async () => ({ latestVersion: '0.3.2', source: 'github-release' }),
        promptYesNo,
        installLatest,
        log: vi.fn(),
      },
    );

    expect(status).toBe('updated');
    expect(promptYesNo).toHaveBeenCalledTimes(1);
    expect(installLatest).toHaveBeenCalledTimes(1);
    expect(writes.length).toBeGreaterThanOrEqual(3);
    const finalWrite = writes[writes.length - 1];
    expect(finalWrite.updateAvailable).toBe(false);
    expect(finalWrite.currentVersion).toBe('0.3.2');
  });

  it('records prompt metadata and skips install when user declines', async () => {
    const writes: Record<string, unknown>[] = [];
    const installLatest = vi.fn(() => ({ ok: true, channel: '@r3dlex/oh-my-auggie@latest' }));

    const status = await maybeCheckAndPromptUpdate(
      {
        io: { stdin: { isTTY: true }, stdout: { isTTY: true } },
        omaDir: '/tmp/oma-test',
      },
      {
        now: () => Date.parse('2026-04-17T10:00:00.000Z'),
        readCurrentVersion: () => '0.3.1',
        readUpdateCache: () => ({
          lastChecked: '2026-04-17T07:00:00.000Z',
          latestVersion: '0.3.1',
          updateAvailable: false,
        }),
        writeUpdateCache: (_omaDir: string, cache: Record<string, unknown>) => {
          writes.push(cache);
        },
        fetchLatestVersion: async () => ({ latestVersion: '0.3.2', source: 'github-release' }),
        promptYesNo: async () => false,
        installLatest,
        log: vi.fn(),
      },
    );

    expect(status).toBe('declined');
    expect(installLatest).not.toHaveBeenCalled();
    const lastWrite = writes[writes.length - 1];
    expect(lastWrite.lastPromptedVersion).toBe('0.3.2');
    expect(lastWrite.lastPromptedAt).toBe('2026-04-17T10:00:00.000Z');
  });

  it('does not prompt in non-tty mode', async () => {
    const promptYesNo = vi.fn(async () => true);
    const status = await maybeCheckAndPromptUpdate(
      {
        io: { stdin: { isTTY: false }, stdout: { isTTY: false } },
        omaDir: '/tmp/oma-test',
      },
      {
        readCurrentVersion: () => '0.3.1',
        readUpdateCache: () => null,
        writeUpdateCache: vi.fn(),
        fetchLatestVersion: async () => ({ latestVersion: '0.3.2', source: 'github-release' }),
        promptYesNo,
        installLatest: vi.fn(() => ({ ok: true, channel: '@r3dlex/oh-my-auggie@latest' })),
        log: vi.fn(),
      },
    );

    expect(status).toBe('non-tty');
    expect(promptYesNo).not.toHaveBeenCalled();
  });
});
