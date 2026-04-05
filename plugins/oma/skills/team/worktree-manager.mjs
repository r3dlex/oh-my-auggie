// skills/team/worktree-manager.mjs
// Git worktree manager for team executor isolation.
//
// Each executor gets its own git worktree at:
//   {repoRoot}/.omc/worktrees/{team}/{executorId}
// Branch naming: oma-team/{teamName}/{executorId}
//
// The main worktree is the repo itself on main branch.
// Executor worktrees are isolated with their own branches.
// Worktrees are cleaned up after executor completion.

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

/** Standard .omc subdirectories */
export const OmcPaths = {
  ROOT: '.omc',
  WORKTREES: '.omc/worktrees',
  STATE: '.omc/state',
  TEAM_BRIDGE: '.omc/state/team-bridge',
} as const;

// ============================================================================
// Path Utilities
// ============================================================================

/** Sanitize a name to prevent path injection (alphanumeric, hyphen, underscore only). */
function sanitizeName(name) {
  return String(name).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Get the git worktree root for a directory (null if not in a git repo). */
function getWorktreeRoot(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    }).trim();
  } catch {
    return null;
  }
}

/** Get the worktree path for an executor. */
function getWorktreePath(repoRoot, teamName, executorId) {
  return join(repoRoot, OmcPaths.WORKTREES, sanitizeName(teamName), sanitizeName(executorId));
}

/** Get the branch name for an executor. */
function getBranchName(teamName, executorId) {
  return `oma-team/${sanitizeName(teamName)}/${sanitizeName(executorId)}`;
}

/** Get the worktree metadata path for a team. */
function getMetadataPath(repoRoot, teamName) {
  return join(repoRoot, OmcPaths.TEAM_BRIDGE, sanitizeName(teamName), 'worktrees.json');
}

/** Ensure a directory exists (recursive). */
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Validate that a resolved path is under repoRoot (no traversal escape). */
function validateResolvedPath(resolvedPath, repoRoot) {
  const normalizedResolved = resolvedPath.replace(/\\/g, '/');
  const normalizedRoot = repoRoot.replace(/\\/g, '/');
  if (!normalizedResolved.startsWith(normalizedRoot + '/')) {
    throw new Error(`Path escape attempt detected: ${resolvedPath} is not under ${repoRoot}`);
  }
}

/** Acquire a simple file lock (synchronous, best-effort). */
function withFileLock(lockPath, fn) {
  const lockDir = lockPath + '.lockd';
  let retries = 0;
  const maxRetries = 50;
  while (existsSync(lockDir) && retries < maxRetries) {
    retries++;
    // Spin-wait; fine for low-contention scenarios
  }
  try {
    ensureDir(lockDir);
    fn();
  } finally {
    try { rmSync(lockDir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

// ============================================================================
// Metadata Persistence
// ============================================================================

/**
 * @typedef {Object} ExecutorWorktreeInfo
 * @property {string} path
 * @property {string} branch
 * @property {string} executorId
 * @property {string} teamName
 * @property {string} createdAt
 */

/** Read worktree metadata for a team. */
function readMetadata(repoRoot, teamName) {
  const metaPath = getMetadataPath(repoRoot, teamName);
  if (!existsSync(metaPath)) return [];
  try {
    return JSON.parse(readFileSync(metaPath, 'utf-8'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[oma-worktree] warning: worktrees.json parse error: ${msg}`);
    return [];
  }
}

/** Write worktree metadata for a team. */
function writeMetadata(repoRoot, teamName, entries) {
  const metaPath = getMetadataPath(repoRoot, teamName);
  validateResolvedPath(metaPath, repoRoot);
  const dir = dirname(metaPath);
  ensureDir(dir);
  writeFileSync(metaPath, JSON.stringify(entries, null, 2), 'utf-8');
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a git worktree for a team executor.
 *
 * Path: {repoRoot}/.omc/worktrees/{teamName}/{executorId}
 * Branch: oma-team/{teamName}/{executorId}
 *
 * If the worktree already exists it is removed and recreated fresh.
 *
 * @param {string} executorId - Unique executor identifier (e.g. "executor-1")
 * @param {string} teamName - Team name (slug)
 * @param {string} [repoRoot] - Repository root (defaults to current worktree root)
 * @param {string} [baseBranch] - Base branch to branch from (defaults to "main")
 * @returns {Promise<ExecutorWorktreeInfo>}
 */
export async function createExecutorWorktree(executorId, teamName, repoRoot, baseBranch = 'main') {
  const root = repoRoot || getWorktreeRoot(process.cwd()) || process.cwd();
  const wtPath = getWorktreePath(root, teamName, executorId);
  const branch = getBranchName(teamName, executorId);

  validateResolvedPath(wtPath, root);

  // Prune stale worktrees
  try {
    execSync('git worktree prune', { cwd: root, stdio: 'pipe' });
  } catch { /* ignore */ }

  // Remove stale worktree if exists
  if (existsSync(wtPath)) {
    try {
      execSync(`git worktree remove --force "${wtPath}"`, { cwd: root, stdio: 'pipe' });
    } catch { /* ignore */ }
  }

  // Delete stale branch if exists
  try {
    execSync(`git branch -D "${branch}"`, { cwd: root, stdio: 'pipe' });
  } catch { /* branch doesn't exist, fine */ }

  // Ensure parent directory
  const wtDir = join(root, OmcPaths.WORKTREES, sanitizeName(teamName));
  ensureDir(wtDir);

  // Verify base branch exists locally or fetch it
  try {
    execSync(`git rev-parse --verify "${baseBranch}"`, { cwd: root, stdio: 'pipe' });
  } catch {
    try {
      execSync(`git fetch origin "${baseBranch}"`, { cwd: root, stdio: 'pipe' });
    } catch fetchErr) {
      console.warn(`[oma-worktree] could not fetch base branch "${baseBranch}", using current HEAD`);
    }
  }

  // Create worktree with new branch
  try {
    execSync(`git worktree add -b "${branch}" "${wtPath}" "${baseBranch}"`, {
      cwd: root,
      stdio: 'pipe',
    });
  } catch (addErr) {
    // Fallback: create worktree without specifying base branch (uses HEAD)
    try {
      execSync(`git worktree add -b "${branch}" "${wtPath}"`, {
        cwd: root,
        stdio: 'pipe',
      });
    } catch (fallbackErr) {
      const errMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(`Failed to create worktree: ${errMsg}`);
    }
  }

  const info = {
    path: wtPath,
    branch,
    executorId,
    teamName,
    createdAt: new Date().toISOString(),
  };

  // Update metadata (locked to prevent concurrent races)
  const lockPath = getMetadataPath(root, teamName) + '.lock';
  withFileLock(lockPath, () => {
    const existing = readMetadata(root, teamName);
    const updated = existing.filter(e => e.executorId !== executorId);
    updated.push(info);
    writeMetadata(root, teamName, updated);
  });

  return info;
}

/**
 * Remove an executor's worktree and branch.
 *
 * @param {string} executorId
 * @param {string} teamName
 * @param {string} [repoRoot]
 * @returns {Promise<void>}
 */
export async function removeExecutorWorktree(executorId, teamName, repoRoot) {
  const root = repoRoot || getWorktreeRoot(process.cwd()) || process.cwd();
  const wtPath = getWorktreePath(root, teamName, executorId);
  const branch = getBranchName(teamName, executorId);

  // Remove worktree
  try {
    execSync(`git worktree remove --force "${wtPath}"`, { cwd: root, stdio: 'pipe' });
  } catch { /* may not exist */ }

  // Prune to clean up
  try {
    execSync('git worktree prune', { cwd: root, stdio: 'pipe' });
  } catch { /* ignore */ }

  // Delete branch
  try {
    execSync(`git branch -D "${branch}"`, { cwd: root, stdio: 'pipe' });
  } catch { /* branch may not exist */ }

  // Update metadata
  const lockPath = getMetadataPath(root, teamName) + '.lock';
  withFileLock(lockPath, () => {
    const existing = readMetadata(root, teamName);
    const updated = existing.filter(e => e.executorId !== executorId);
    writeMetadata(root, teamName, updated);
  });
}

/**
 * List all active worktrees for a team.
 *
 * @param {string} teamName
 * @param {string} [repoRoot]
 * @returns {string[]} Array of worktree paths
 */
export function listWorktrees(teamName, repoRoot) {
  const root = repoRoot || getWorktreeRoot(process.cwd()) || process.cwd();
  const entries = readMetadata(root, teamName);
  return entries.map(e => e.path);
}

/**
 * Remove all worktrees for a team (called on team shutdown).
 *
 * @param {string} teamName
 * @param {string} [repoRoot]
 * @returns {Promise<void>}
 */
export async function cleanupTeamWorktrees(teamName, repoRoot) {
  const root = repoRoot || getWorktreeRoot(process.cwd()) || process.cwd();
  const entries = readMetadata(root, teamName);
  for (const entry of entries) {
    try {
      await removeExecutorWorktree(entry.executorId, teamName, root);
    } catch { /* best effort */ }
  }
}
