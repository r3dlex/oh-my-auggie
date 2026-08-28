# ADR 0006: One canonical `.oma` dir-resolution contract

## Status
Accepted.

## Context
The `.oma` state directory had four incompatible resolution contracts. Hooks
read `<project>/.oma` via `src/utils.ts` `resolveOmaDir`
(`AUGMENT_PROJECT_DIR`/`WORKSPACE_ROOT`/cwd); the MCP server
(`plugins/oma/mcp/state-server.mjs`) derived `OMA_DIR` as
`join(__dirname, '..', '.oma')` — the plugin install dir — and ignored the
`OMA_DIR` env var the e2e bats suite passed it; `src/utils.ts` `findOmaDir`
used `OMA_DIR` env + cwd walk-up + `~/.oma`; and `vscode-oma` reads
`<workspaceRoot>/.oma`. State forked per entry point: installed from a
marketplace cache, `oma_mode_set` persisted state into the install dir,
`writeState` threw JSON-RPC -32603 on read-only install dirs, and
`oma_skill_list`/`oma_skill_inject` were cwd-relative — worse, their handlers
threw a TDZ ReferenceError on every call in every cwd (a no-op destructuring
referenced its own shadowing bindings), so those two tools had never worked;
the e2e suite never called them.

`SPEC.md` and ADR-0001 promise per-working-copy state persistence via the MCP
server. The consolidate-oma-utils spec declared unifying the resolvers a
non-goal "requires its own ADR" — this is that ADR.

## Decision
One canonical dir-resolution contract, first match wins:

1. `OMA_DIR` env — resolved to an absolute path and created (`mkdir -p`) when absent.
2. `AUGMENT_PROJECT_DIR` env — state is `<dir>/.oma`.
3. `WORKSPACE_ROOT` env — state is `<dir>/.oma`.
4. cwd walk-up — nearest ancestor (starting at cwd) containing an existing `.oma` directory.
5. `~/.oma` — or `/tmp/.oma` when HOME is unset.

`WORKSPACE_ROOT` is retained inside the project-env tier (between
`AUGMENT_PROJECT_DIR` and the walk-up) so hook contexts that only carry
`WORKSPACE_ROOT` keep their existing resolution.

The contract lives in a single dependency-free module,
`plugins/oma/mcp/oma-dir.mjs`, which the MCP server imports directly (the
server sits outside the tsc build, so it cannot import built TS dist without
new build steps). `src/utils.ts` implements the identical contract for the
TypeScript surface; `tests/mcp/oma-dir-parity.test.ts` pins both sides to
identical results across the precedence matrix. `findOmaDir()` remains an
exported CLI-facing alias of `resolveOmaDir()`.

Surfaces consuming the contract:
- `plugins/oma/mcp/state-server.mjs` — state/notepad/task-log/team dirs and the
  `OMA_DIR` override; skills resolve from the plugin install root, not cwd.
- `plugins/oma/src/utils.ts` — hooks and CLI (`resolveOmaDir`/`findOmaDir`).
- `vscode-oma/src/state/adapter.ts` — pinned to the project tier: VS Code
  supplies the workspace root directly, so env/walk-up resolution does not
  apply.

## Consequences
- State lands in one place per project across hooks, CLI, and the MCP server;
  no more install-dir writes from marketplace installs.
- `oma_skill_list`/`oma_skill_inject` work at all (TDZ fix) and from any cwd.
- `resolveOmaDir()` is no longer strictly pure: it creates `OMA_DIR` when that
  env is set. In hook contexts (AUGMENT_PROJECT_DIR set) resolution is
  unchanged; the OMA_DIR mkdir and walk-up only engage when the project env is
  absent. CLI discovery additionally honors the project env before walking up.
- Bundling the TS utils into the server via esbuild was rejected to keep the
  zero-dep plain-.mjs server intact; importing built TS dist from `mcp/` was
  rejected because `mcp/` sits outside the tsc build.