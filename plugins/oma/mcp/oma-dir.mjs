// Canonical `.oma` directory resolution — the single home of the dir-resolution
// contract (ADR-0006: docs/architecture/adr/0006-oma-dir-resolution-contract.md).
//
// Precedence (first match wins):
//   1. OMA_DIR env              — explicit override; resolved to an absolute
//                                 path and created (mkdir -p) when absent.
//   2. AUGMENT_PROJECT_DIR env  — auggie's project dir; state is <dir>/.oma.
//   3. WORKSPACE_ROOT env       — some hook contexts carry the workspace root.
//   4. cwd walk-up              — nearest ancestor (starting at cwd) containing
//                                 an existing `.oma` directory.
//   5. $HOME/.oma fallback      — or /tmp/.oma when HOME is unset.
//
// Zero npm dependencies, plain ESM: plugins/oma/mcp/state-server.mjs sits
// outside the tsc build and imports this file directly. src/utils.ts implements
// the same contract for the TypeScript surface; tests/mcp/oma-dir-parity.test.ts
// pins both sides to identical results across the precedence matrix.

import { existsSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';

export function resolveOmaDir() {
  // 1. Explicit override — created (mkdir -p) so callers can write immediately.
  if (process.env.OMA_DIR) {
    const abs = resolve(process.env.OMA_DIR);
    mkdirSync(abs, { recursive: true });
    return abs;
  }
  // 2-3. Project env (auggie sets AUGMENT_PROJECT_DIR; some hooks set WORKSPACE_ROOT).
  if (process.env.AUGMENT_PROJECT_DIR) {
    return join(resolve(process.env.AUGMENT_PROJECT_DIR), '.oma');
  }
  if (process.env.WORKSPACE_ROOT) {
    return join(resolve(process.env.WORKSPACE_ROOT), '.oma');
  }
  // 4. Walk up from cwd to the nearest existing `.oma`.
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, '.oma');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // 5. Global fallback.
  return join(process.env.HOME || '/tmp', '.oma');
}