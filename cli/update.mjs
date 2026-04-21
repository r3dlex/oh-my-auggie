// cli/update.mjs — non-fatal OMA auto-update checks for interactive CLI sessions

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createInterface } from 'readline/promises';
import { atomicWrite, readJsonSafe, resolveOmaDir } from './utils.mjs';

const UPDATE_CACHE_FILE = 'update-check.json';
const RELEASES_API_URL = 'https://api.github.com/repos/r3dlex/oh-my-auggie/releases/latest';
const GITHUB_PACKAGE_NAME = '@r3dlex/oh-my-auggie';
const NPM_PACKAGE_NAME = 'oh-my-auggie';
const DEFAULT_CHECK_TTL_MS = 60 * 60 * 1000; // 1h
const DEFAULT_PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

function parseSemver(version) {
  if (typeof version !== 'string') return null;
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isNewerVersion(current, latest) {
  const c = parseSemver(current);
  const l = parseSemver(latest);
  if (!c || !l) return false;
  if (l[0] !== c[0]) return l[0] > c[0];
  if (l[1] !== c[1]) return l[1] > c[1];
  return l[2] > c[2];
}

export function isAutoUpdateDisabled(env = process.env) {
  const auto = String(env.OMA_AUTO_UPDATE ?? '').trim().toLowerCase();
  if (auto && ['0', 'false', 'off', 'no'].includes(auto)) return true;

  const disable = String(env.OMA_DISABLE_AUTO_UPDATE ?? '').trim().toLowerCase();
  return Boolean(disable && ['1', 'true', 'on', 'yes'].includes(disable));
}

export function shouldCheckForLatest(cache, nowMs, ttlMs = DEFAULT_CHECK_TTL_MS) {
  if (!cache?.lastChecked) return true;
  const last = Date.parse(cache.lastChecked);
  if (!Number.isFinite(last)) return true;
  return (nowMs - last) >= ttlMs;
}

export function shouldPromptForUpdate(cache, nowMs, cooldownMs = DEFAULT_PROMPT_COOLDOWN_MS) {
  if (!cache?.updateAvailable || !cache?.latestVersion) return false;
  if (cache.lastPromptedVersion !== cache.latestVersion) return true;
  if (!cache.lastPromptedAt) return true;
  const lastPrompted = Date.parse(cache.lastPromptedAt);
  if (!Number.isFinite(lastPrompted)) return true;
  return (nowMs - lastPrompted) >= cooldownMs;
}

function getRepoPackageJsonPath() {
  const cliDir = dirname(fileURLToPath(import.meta.url));
  return join(cliDir, '..', 'package.json');
}

function readCurrentVersion() {
  try {
    const pkg = JSON.parse(readFileSync(getRepoPackageJsonPath(), 'utf8'));
    if (typeof pkg.version === 'string' && pkg.version.trim()) {
      return pkg.version.trim();
    }
  } catch {
    // non-fatal
  }
  return null;
}

function resolveCachePath(omaDir) {
  const baseDir = omaDir || resolveOmaDir();
  return join(baseDir, UPDATE_CACHE_FILE);
}

function readUpdateCache(omaDir) {
  const cachePath = resolveCachePath(omaDir);
  const cache = readJsonSafe(cachePath, null);
  if (!cache || typeof cache !== 'object') return null;
  return cache;
}

function writeUpdateCache(omaDir, cache) {
  const cachePath = resolveCachePath(omaDir);
  atomicWrite(cachePath, cache);
}

async function fetchJson(url, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'oma-auto-update-check' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLatestVersion() {
  const release = await fetchJson(RELEASES_API_URL);
  const fromRelease = typeof release?.tag_name === 'string' ? release.tag_name.replace(/^v/, '') : '';
  if (fromRelease) {
    return { latestVersion: fromRelease, source: 'github-release' };
  }

  const scoped = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(GITHUB_PACKAGE_NAME)}/latest`);
  const fromScoped = typeof scoped?.version === 'string' ? scoped.version : '';
  if (fromScoped) {
    return { latestVersion: fromScoped, source: 'npm-registry-scoped' };
  }

  const unscoped = await fetchJson(`https://registry.npmjs.org/${NPM_PACKAGE_NAME}/latest`);
  const fromNpm = typeof unscoped?.version === 'string' ? unscoped.version : '';
  if (fromNpm) {
    return { latestVersion: fromNpm, source: 'npm-registry' };
  }

  return { latestVersion: null, source: null };
}

async function promptYesNo(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim().toLowerCase();
    return answer === '' || answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

function runInstallCommand(commandArgs) {
  const result = spawnSync('npm', commandArgs, {
    stdio: 'inherit',
    encoding: 'utf8',
    timeout: 120000,
    windowsHide: true,
  });

  if (result.error) {
    return { ok: false, stderr: result.error.message };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      stderr: (result.stderr || '').trim() || `npm exited ${result.status}`,
    };
  }

  return { ok: true, stderr: '' };
}

function installLatest() {
  const channels = [
    { args: ['install', '-g', `${GITHUB_PACKAGE_NAME}@latest`], label: `${GITHUB_PACKAGE_NAME}@latest` },
    { args: ['install', '-g', `${NPM_PACKAGE_NAME}@latest`], label: `${NPM_PACKAGE_NAME}@latest` },
  ];

  for (const channel of channels) {
    const result = runInstallCommand(channel.args);
    if (result.ok) {
      return { ok: true, channel: channel.label };
    }
  }

  return { ok: false, channel: channels[channels.length - 1].label };
}

const defaultDependencies = {
  readCurrentVersion,
  readUpdateCache,
  writeUpdateCache,
  fetchLatestVersion,
  promptYesNo,
  installLatest,
  now: () => Date.now(),
  log: (...args) => console.log(...args),
};

/**
 * Non-fatal automatic update prompt for interactive wrappers (`oma`, `super-oma`).
 * Returns a status string for observability and tests.
 */
export async function maybeCheckAndPromptUpdate(options = {}, dependencies = {}) {
  const deps = { ...defaultDependencies, ...dependencies };
  const io = options.io || process;
  const checkTtlMs = options.checkTtlMs ?? DEFAULT_CHECK_TTL_MS;
  const promptCooldownMs = options.promptCooldownMs ?? DEFAULT_PROMPT_COOLDOWN_MS;

  try {
    if (isAutoUpdateDisabled(process.env)) return 'disabled';
    if (!io?.stdin?.isTTY || !io?.stdout?.isTTY) return 'non-tty';

    const nowMs = deps.now();
    const nowIso = new Date(nowMs).toISOString();
    const currentVersion = await deps.readCurrentVersion();
    if (!currentVersion) return 'no-current-version';

    const cache = deps.readUpdateCache(options.omaDir);
    let next = { ...(cache && typeof cache === 'object' ? cache : {}) };

    if (shouldCheckForLatest(next, nowMs, checkTtlMs)) {
      const fetched = await deps.fetchLatestVersion();
      if (fetched?.latestVersion) {
        next.latestVersion = fetched.latestVersion;
      }
      if (fetched?.source) {
        next.source = fetched.source;
      }

      next.currentVersion = currentVersion;
      next.lastChecked = nowIso;
      next.updateAvailable = Boolean(next.latestVersion && isNewerVersion(currentVersion, next.latestVersion));
      deps.writeUpdateCache(options.omaDir, next);
    } else if (next.latestVersion) {
      next.currentVersion = currentVersion;
      next.updateAvailable = isNewerVersion(currentVersion, next.latestVersion);
    }

    if (!next.latestVersion || !next.updateAvailable) return 'up-to-date';
    if (!shouldPromptForUpdate(next, nowMs, promptCooldownMs)) return 'prompt-cooledown';

    const approved = await deps.promptYesNo(
      `[oma] Update available: v${currentVersion} → v${next.latestVersion}. Install now? [Y/n] `,
    );

    next.lastPromptedAt = nowIso;
    next.lastPromptedVersion = next.latestVersion;
    deps.writeUpdateCache(options.omaDir, next);

    if (!approved) return 'declined';

    deps.log('[oma] Installing update (GitHub Packages with npm fallback)…');
    const installResult = deps.installLatest();

    if (installResult.ok) {
      next.currentVersion = next.latestVersion;
      next.updateAvailable = false;
      next.lastInstalledAt = nowIso;
      deps.writeUpdateCache(options.omaDir, next);
      deps.log(`[oma] Updated to v${next.latestVersion} via ${installResult.channel}. Restart your shell to use the new binary.`);
      return 'updated';
    }

    deps.log(`[oma] Auto-update failed. Run /oma:update for manual update (last attempted channel: ${installResult.channel}).`);
    return 'install-failed';
  } catch {
    return 'error';
  }
}

export const __updateInternals = {
  DEFAULT_CHECK_TTL_MS,
  DEFAULT_PROMPT_COOLDOWN_MS,
};
