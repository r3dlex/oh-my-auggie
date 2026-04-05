import { readFileSync, writeFileSync, renameSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, join } from 'path';
import { Readable } from 'stream';
import type { HookInput, OmaState, ApprovalRecord } from './types.js';

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
export function isEnterpriseProfile(config: Record<string, unknown>): boolean {
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
