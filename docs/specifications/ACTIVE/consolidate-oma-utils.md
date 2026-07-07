# Spec: Consolidate OMA utils into one canonical module

- **Slug**: `consolidate-oma-utils`
- **Status**: ACTIVE
- **Issue**: [.ai/work-intake/consolidate-oma-utils.md](../../../.ai/work-intake/consolidate-oma-utils.md)
- **Scope**: `plugins/oma` — zero public behavior change

## A — Current state (problem)

Two overlapping utility modules with an accidental seam between them:

- `plugins/oma/src/utils.ts` (~403 lines) — used by hooks; re-exported as
  public API via `src/index.ts` (`export * from './utils.js'`).
- `plugins/oma/src/cli/utils.ts` (~114 lines) — used by 9 CLI entrypoints
  (`doctor`, `events`, `hud`, `launch`, `oma`, `run`, `team`, `tmux`, `ui`)
  **plus two hand-written runtime consumers outside `src/` (invisible to
  tsc) that import the compiled `dist/cli/utils.js` directly**:
  `cli/update.mjs` (uses `atomicWrite`, `readJsonSafe`, and the CLI
  `resolveOmaDir` discovery semantics) and `cli/workers/wrapper.mjs`
  (uses `atomicWrite`; spawned at runtime by `team.ts`).

Overlaps: path resolution (`resolveOmaDir` exported from BOTH, with
**different semantics**), JSON I/O (`loadJsonFile` vs `readJsonSafe`,
`writeJsonFile` vs `atomicWrite`), and config helpers. The duplicated name
`resolveOmaDir` hides a real contract difference:

| | hooks `resolveOmaDir` | CLI `resolveOmaDir` |
|---|---|---|
| Env vars | `AUGMENT_PROJECT_DIR` / `WORKSPACE_ROOT` | `OMA_DIR` |
| Search | none — `<projectDir>/.oma` | upward walk to existing `.oma` |
| Side effects | pure | `mkdir -p` on `OMA_DIR` |
| Fallback | `<cwd>/.oma` | `$HOME/.oma` (or `/tmp/.oma`) |

## B — Target state (Option A: merge, preserve both contracts)

One canonical `plugins/oma/src/utils.ts`; `src/cli/utils.ts` **deleted**
(all importers updated, no re-export shim needed).

- Hooks' `resolveOmaDir()` kept byte-identical (public API preserved).
- CLI resolver promoted as **`findOmaDir()`** — the name states the contract:
  env-aware `OMA_DIR` override (with mkdir) + upward walk + home fallback.
- Promoted with collision-safe names (none collided): `resolveInOmaDir`
  (now built on `findOmaDir`), `atomicWrite`, `readJsonSafe`,
  `listWorkerDirs`, `nextWorkerId`, `isPidAlive`, `tailLines`.
- Each resolver carries a docstring stating its contract and when to use it;
  the module header lists all four `.oma` resolvers (`resolveOmaDir`,
  `findOmaDir`, `resolveGlobalOmaDir`, `resolveLocalOmaDir`) in one place.
- The 9 CLI files import `findOmaDir` (and friends) from `../utils.js`.
- The two `.mjs` runtime consumers repoint to `plugins/oma/dist/utils.js`;
  `cli/update.mjs` renames `resolveOmaDir` → `findOmaDir` because it relies
  on the CLI discovery semantics (`OMA_DIR` / upward walk / HOME fallback) —
  a naive repoint to the hooks' `resolveOmaDir` would be a silent behavior
  change.
- Dead code dropped with the deleted module: unexported `BOX_*` constants and
  the never-imported `pad()` helper (not part of the package public API).

## Acceptance criteria

- [ ] `cd plugins/oma && npm test` — vitest green (every promoted function
      has unit coverage in `tests/unit/utils.test.ts`).
- [ ] `npm run typecheck` and `npm run build` green.
- [ ] `validate-manifests` CI job equivalent passes locally (manifest JSON
      parses; all `hooks.json` dist entrypoints exist after build).
- [ ] No API change for hooks: `resolveOmaDir` semantics and every existing
      `src/utils.ts` export unchanged; `src/index.ts` untouched.
- [ ] `src/cli/utils.ts` deleted; no file in the repo — TypeScript sources
      AND hand-written `.mjs`/`.cjs` runtime files alike — imports
      `src/cli/utils` or `dist/cli/utils.js`, enforced by a guard test
      ("no imports of deleted cli/utils" in `tests/unit/utils.test.ts`).

## Out of scope (explicit follow-up)

**Option B — layered semantic unification** of the four `.oma` resolvers
(e.g. `OMA_DIR` → project env → upward walk → fallback in one function) is a
behavior change for both hooks and CLI. It is deliberately NOT done here and
requires its own ADR + spec before any attempt.
