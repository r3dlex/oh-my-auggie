import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, join, dirname } from 'path';
import { homedir } from 'os';
import { Readable } from 'stream';
import type { HookInput, OmaState, ApprovalRecord, OmaOs } from './types.js';

// ─── stdin ─────────────────────────────────────────────────────────────────

/**
 * Reads all of process.stdin and returns it as a string.
 * Normalizes CRLF (\r\n) to LF (\n) before JSON parsing.
 */
export async function readAllStdin(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      resolve(raw.replace(/\r\n/g, '\n'));
    });
    process.stdin.on('error', reject);
  });
}

// ─── file I/O ───────────────────────────────────────────────────────────────

/**
 * Loads and parses a JSON file. Returns null if the file does not exist.
 */
export function loadJsonFile<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Atomically writes a JSON file via a temp-file + rename.
 * On Windows, cross-filesystem rename throws EXDEV; falls back to non-atomic write.
 */
export function writeJsonFile(path: string, data: unknown): void {
  const tmp = path + '.tmp.' + Date.now() + '.json';
  try {
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    renameSync(tmp, path);
  } catch (err: unknown) {
    // Windows cross-filesystem rename fallback
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'EXDEV') {
      writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
    } else {
      throw err;
    }
  }
}

// ─── OMA state / config ─────────────────────────────────────────────────────

/**
 * Loads OMA state from <omaDir>/state.json.
 * Returns a default state if the file does not exist.
 */
export function loadOmaState(omaDir: string): OmaState {
  return loadJsonFile<OmaState>(join(omaDir, 'state.json')) ?? { mode: 'none', active: false };
}

/**
 * Loads OMA config from <omaDir>/config.json.
 * Returns an empty object if the file does not exist.
 */
export function loadConfig(omaDir: string): Record<string, unknown> {
  return loadJsonFile<Record<string, unknown>>(join(omaDir, 'config.json')) ?? {};
}

/**
 * Returns true when the active profile is 'enterprise'.
 */
export function isEnterpriseProfile(config: Record<string, unknown> | Config): boolean {
  return config.profile === 'enterprise';
}

// ─── path utilities ────────────────────────────────────────────────────────

/**
 * Resolves any path (relative, Git Bash /c/..., WSL /mnt/c/...) to an
 * absolute path in the Node.js process's native format.
 *
 * - WSL (process.platform === 'linux'): git diff returns POSIX paths;
 *   path.resolve() returns POSIX paths — no translation needed.
 * - Git Bash (process.platform === 'win32'): git diff returns /c/Users/...
 *   path.resolve() returns C:\Users\... — backslash paths work correctly
 *   on Git Bash for file operations.
 * - Linux/macOS: path.resolve() returns POSIX absolute paths — no special handling.
 *
 * Does NOT attempt to detect MSYS/CYGWIN prefixes and translate them.
 */
export function normalizePath(p: string): string {
  return resolve(p);
}

/**
 * Returns OMA_DIR from the environment, defaulting to '.oma'.
 */
export function resolveOmaDir(): string {
  return resolve(process.env.OMA_DIR ?? '.oma');
}

// ─── OS detection ─────────────────────────────────────────────────────────

/**
 * Detects the current operating system.
 * Returns:
 *   - 'macos' on Darwin (macOS)
 *   - 'linux' on Linux (including WSL linux kernel)
 *   - 'wsl' when running on Windows with WSL detected (WSL2 or WSL1)
 *
 * Pure Windows (non-WSL) is not supported — returns 'wsl' as a best-effort
 * since the CLI primarily runs over WSL on Windows.
 */
export function detectOs(): OmaOs {
  const platform = process.platform;

  if (platform === 'darwin') {
    return 'macos';
  }

  if (platform === 'linux') {
    // Detect WSL by checking /proc/version for "Microsoft" or "WSL"
    try {
      const version = readFileSync('/proc/version', 'utf8').toLowerCase();
      if (version.includes('microsoft') || version.includes('wsl')) {
        return 'wsl';
      }
    } catch {
      // /proc/version not accessible — plain Linux
    }
    return 'linux';
  }

  // process.platform === 'win32' — check if we're running under WSL
  if (platform === 'win32') {
    // WSL sets this env var when running Linux binaries under win32
    if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
      return 'wsl';
    }
    // Also check via running a small command
    try {
      const result = execSync('uname -r', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (result.toLowerCase().includes('microsoft')) {
        return 'wsl';
      }
    } catch {
      // Not WSL
    }
    // Pure Windows — fall back to wsl for compatibility
    return 'wsl';
  }

  // Default fallback
  return 'linux';
}

// ─── Git availability ───────────────────────────────────────────────────────

/**
 * Checks whether `git` is available in the current PATH.
 * Cross-platform: uses `command -v` on Unix, `where` on Windows.
 */
export function isGitAvailable(): boolean {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      execSync('where git', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } else {
      execSync('command -v git', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    }
    return true;
  } catch {
    return false;
  }
}

// ─── hook input helpers ─────────────────────────────────────────────────────

/**
 * Extracts file paths from a HookInput's tool_input fields.
 * Checks `file_path`, `path`, and `filePath` (case-sensitive).
 */
export function getFilePathsFromInput(input: HookInput): string[] {
  const toolInput = input.tool_input ?? {};
  const paths: string[] = [];
  for (const key of ['file_path', 'path', 'filePath']) {
    if (typeof toolInput[key] === 'string' && toolInput[key] !== '') {
      paths.push(toolInput[key] as string);
    }
  }
  return paths;
}

// ─── approval expiry ────────────────────────────────────────────────────────

const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns true if the approval record has expired.
 * Missing `expires` field means "never expires" (returns false).
 * Applies a 5-minute clock-skew tolerance to avoid false negatives due to
 * minor clock drift between machines.
 */
export function isApprovalExpired(record: ApprovalRecord): boolean {
  if (!record.expires) return false;
  const now = Date.now();
  const expiry = new Date(record.expires).getTime();
  return now > expiry + CLOCK_SKEW_TOLERANCE_MS;
}

// ─── Two-tiered config utilities ──────────────────────────────────────────────

import type { Config, HudConfig, OrchestrationConfig, PathsConfig } from './types.js';

/**
 * Expands ~ in a path to the user's home directory.
 * Works cross-platform: Unix (~) and Windows (~) both resolve via os.homedir().
 * e.g. "~/.oma" -> "/home/user/.oma" or "C:\Users\username\.oma"
 */
export function expandTilde(p: string): string {
  if (typeof p !== 'string') return p;
  if (p.startsWith('~/') || p === '~') {
    return resolve(homedir(), p.slice(2));
  }
  return p;
}

/**
 * Returns the global OMA config directory path (~/.oma).
 * Cross-platform: uses os.homedir() for Windows/Unix consistency.
 */
export function resolveGlobalOmaDir(): string {
  return expandTilde('~/.oma');
}

/**
 * Returns the local OMA config directory path (project-level .oma/).
 * Uses process.cwd() as the project root.
 */
export function resolveLocalOmaDir(): string {
  return expandTilde('.oma');
}

/**
 * Loads a JSON config file safely, returns null if absent or corrupt.
 */
export function loadJsonFileSafe(path: string): Record<string, unknown> | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Saves a JSON config file atomically.
 * Creates parent directories if absent.
 */
export function saveJsonFileSafe(path: string, data: unknown): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + '.tmp.' + Date.now();
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  try {
    renameSync(tmp, path);
  } catch (err: unknown) {
    // Windows cross-filesystem rename fallback
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'EXDEV') {
      writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
    } else {
      throw err;
    }
  }
}

/**
 * Deep-merges two config objects (shallow-top, deep-nested).
 * Handles undefined base values via `baseObj = base[key] ?? {}`.
 */
export function deepMerge(base: Record<string, unknown>, overlay: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(overlay ?? {})) {
    if (
      typeof overlay[key] === 'object' &&
      overlay[key] !== null &&
      !Array.isArray(overlay[key])
    ) {
      const baseObj = (base[key] ?? {}) as Record<string, unknown>;
      result[key] = { ...baseObj, ...(overlay[key] as Record<string, unknown>) };
    } else {
      result[key] = overlay[key];
    }
  }
  return result;
}

export const DEFAULT_CONFIG: Config = {
  version: '1.0',
  hud: { enabled: true, style: 'default' },
  orchestration: { mode: 'ralph', maxIterations: 100 },
  paths: { omaDir: '~/.oma', plansDir: '~/.oma/plans' },
  profile: 'default',
};

/**
 * Returns the fully merged OMA config.
 * Merge order: DEFAULT_CONFIG <- global config <- local config
 * `profile` is global-only: local cannot override it.
 */
export function getMergedConfig(): Config {
  const globalPath = resolveGlobalOmaDir();
  const localPath = resolveLocalOmaDir();

  const globalConfig = loadJsonFileSafe(join(globalPath, 'config.json')) ?? {};
  const localConfig = loadJsonFileSafe(join(localPath, 'config.json')) ?? {};

  let merged = deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, globalConfig) as unknown as Config;
  merged = deepMerge(merged as unknown as Record<string, unknown>, localConfig) as unknown as Config;

  // profile is global-only: local cannot override it
  if (globalConfig.profile !== undefined) {
    merged.profile = globalConfig.profile as 'default' | 'enterprise';
  }

  return merged;
}

/**
 * Reads a specific key from the merged config.
 * Supports dot notation: "hud.style" -> config.hud.style
 */
export function getConfigKey(key: string): unknown {
  const config = getMergedConfig();
  const parts = key.split('.');
  let value: unknown = config;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return value;
}

/**
 * Sets a specific key in a config file (global by default, local with --local flag).
 * Supports dot notation for nested keys.
 */
export function setConfigKey(key: string, value: unknown, scope: 'global' | 'local' = 'global'): Record<string, unknown> {
  const basePath = scope === 'global' ? resolveGlobalOmaDir() : resolveLocalOmaDir();
  const configPath = join(basePath, 'config.json');
  const config = loadJsonFileSafe(configPath) ?? { ...DEFAULT_CONFIG };

  const parts = key.split('.');
  let target: Record<string, unknown> = config;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in target)) target[parts[i]] = {};
    target = target[parts[i]] as Record<string, unknown>;
  }
  target[parts[parts.length - 1]] = value;

  saveJsonFileSafe(configPath, config);
  return config;
}

/**
 * Resets a config file to defaults (global or local scope).
 */
export function resetConfig(scope: 'global' | 'local' = 'global'): void {
  const basePath = scope === 'global' ? resolveGlobalOmaDir() : resolveLocalOmaDir();
  const configPath = join(basePath, 'config.json');
  if (existsSync(configPath)) {
    const fs = require('fs') as typeof import('fs');
    fs.unlinkSync(configPath);
  }
}
