# Work intake: consolidate-oma-utils

- **Type**: refactor (architecture deepening)
- **Spec**: [docs/specifications/ACTIVE/consolidate-oma-utils.md](../../docs/specifications/ACTIVE/consolidate-oma-utils.md)
- **Branch**: `improve-arch/consolidate-oma-utils`
- **Priority**: medium
- **Behavior change**: none (public API preserved)

## Problem

`plugins/oma/src/utils.ts` and `plugins/oma/src/cli/utils.ts` both export
overlapping path resolution, JSON I/O, and config helpers. `resolveOmaDir`
exists in BOTH with different semantics (project-env pure resolver vs
OMA_DIR/upward-walk discovery). The hooks/CLI seam is accidental, and the
duplicated name hides a real contract difference.

## Ask

Consolidate into one canonical `src/utils.ts` (Option A):

1. Keep hooks' `resolveOmaDir()` exactly as-is (public API via `src/index.ts`).
2. Promote the CLI resolver as `findOmaDir()` with a contract docstring.
3. Promote `resolveInOmaDir`, `atomicWrite`, `readJsonSafe`, `listWorkerDirs`,
   `nextWorkerId`, `isPidAlive`, `tailLines`; update the 9 CLI importers;
   delete `src/cli/utils.ts`.
4. Unit coverage for every promoted function; vitest + typecheck + build +
   manifest validation green.

## Non-goals

Semantic unification of the four `.oma` resolvers (Option B) — follow-up
requiring its own ADR; recorded in the spec's out-of-scope section.
