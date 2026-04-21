# OMA: Eliminate `.mjs` / TypeScript Drift — RALPLAN-DR Consensus Plan

**Status:** Draft (pending Architect + Critic review)
**Date:** 2026-04-12
**Mode:** SHORT (default consensus)
**Scope:** `plugins/oma/` and root `cli/`
**Owner:** Planner → Architect → Critic → Executor

---

## 1. Problem Statement & Feasibility

### Feasibility answer: Yes — all conversions are technically possible.

But not all are worth doing. Cost/benefit varies sharply by category, and one category hides a **live production bug** we only uncovered during planning:

> **Critical finding (drift bug):** `plugins/oma/hooks/*.mjs` and `plugins/oma/dist/hooks/*.js` are two parallel implementations of the OMA hooks. The TypeScript implementation in `src/hooks/*.ts` compiles to `dist/hooks/*.js` and is the newer, feature-rich version (e.g., `session-start.ts` includes graph-provider injection via `getMergedConfig`, HUD logic, update-check spawning). The `hooks/*.mjs` files are older, stale copies — yet `plugins/oma/hooks/hooks.json` invokes the **stale** `.mjs` files at runtime. The compiled TS code is effectively dead at runtime.

This is not a cleanup task. It is a correctness fix that happens to remove duplication.

### File inventory (verified 2026-04-12)

| Category | Path | Files | LOC | Live? | Drift? |
|---|---|---|---|---|---|
| A. Runtime hooks (stale) | `plugins/oma/hooks/*.mjs` | 9 | 878 | Yes (hooks.json) | Stale vs. `dist/hooks/` |
| B. Compiled hooks (unused) | `plugins/oma/dist/hooks/*.js` | 9 | 1,202 | No (not invoked) | Newer, richer |
| C. Root CLI | `cli/*.mjs` (root) | 6 | 1,182 | Yes | — |
| D. MCP server | `plugins/oma/mcp/state-server.mjs` | 1 | 590 | Yes | — |
| E. Team skill | `plugins/oma/skills/team/worktree-manager.mjs` | 1 | 291 | Yes | — |
| F. Setup script | `plugins/oma/src/setup-rules.mjs` | 1 | 224 | Yes | In `src/` but excluded from tsconfig |
| G. Test helper | `plugins/oma/tests/hooks-setup.js` | 1 | 8 | Test-time | — |

**Total non-test `.mjs`: ~3,165 LOC across 18 files.**

### Why the drift happened (diagnosis)

- `plugins/oma/tsconfig.json` has `"rootDir": "./src"` and `"include": ["src/**/*"]` with `"exclude": ["node_modules", "dist", "tests"]`.
- The TS pipeline produces `dist/hooks/*.js` cleanly, but nothing wires those compiled files back into `hooks.json`.
- At some point `hooks/*.mjs` were the original runtime scripts; `src/hooks/*.ts` were added later for type safety, but `hooks.json` was never repointed.
- Both copies evolved independently — classic dual-maintenance drift.

---

## 2. RALPLAN-DR Summary

### Principles (5)

1. **Correctness before cleanup.** Fixing the hooks drift bug (live runtime using stale code) outweighs stylistic conversion wins.
2. **One source of truth per runtime artifact.** A hook's behavior must live in exactly one file; duplication is a latent bug generator.
3. **Type safety where it catches real bugs.** Strict TS is valuable when the surface is complex (MCP server, CLI); lower-value for tiny wrappers.
4. **Stay shippable.** No change that cannot be verified with `npx tsc --noEmit && npm test` in a single pass.
5. **Minimal scope creep.** This plan is plumbing, not a redesign. Avoid touching public APIs, hook contracts, or CLI command semantics.

### Decision Drivers (top 3)

1. **D1 — Correctness risk:** The hooks drift is an active bug. Any plan that does not resolve it is incomplete.
2. **D2 — Maintenance burden per LOC:** High-churn, logic-heavy files (MCP server, CLI, hooks) benefit most from strict types. Small wrappers and setup scripts benefit little.
3. **D3 — Blast radius of the change:** Hooks run on every PreToolUse/SessionStart — any regression halts the dev loop. Changes must be verifiable end-to-end before merge.

### Options evaluated

#### Option A — Conservative: Trivial wins only
- **What:** Redirect `hooks.json` to `dist/hooks/*.js` (fix drift bug). Delete `hooks/*.mjs`. Convert `src/setup-rules.mjs` → `src/setup-rules.ts`. Leave root `cli/`, `mcp/state-server.mjs`, and `skills/team/worktree-manager.mjs` as-is.
- **LOC touched:** ~1,100 deleted, ~224 converted.
- **Pros:** Fixes the drift bug. Smallest blast radius. One PR, one afternoon. Verification is fast: `tsc --noEmit && npm test && manual hook smoke test`.
- **Cons:** Leaves ~2,063 LOC of `.mjs` unconverted. Team CLI and MCP server keep running without type safety.
- **When to pick:** If D1 (correctness) dominates and we want to ship a fix this week without entangling other refactors.

#### Option B — Maximal: Convert everything
- **What:** Everything in Option A, plus convert all of `cli/*.mjs`, `mcp/state-server.mjs`, `skills/team/worktree-manager.mjs`, and `tests/hooks-setup.js` to TS. Expand `tsconfig.json` `include`/`rootDir` to cover new scope. Wire `prepare` script to build all artifacts.
- **LOC touched:** ~3,165 converted + drift fix.
- **Pros:** Single unified build system. Full type coverage. Eliminates `.mjs` from the repo (except possibly shebang entry points).
- **Cons:** Large blast radius. Root `cli/` is outside `plugins/oma/` — requires either hoisting tsconfig or adding a second one. Team CLI currently spawned as raw node scripts — retool of invocation paths. High risk of subtle regressions (spawn argv differences, shebang handling, dynamic import paths). Multiple PRs or a single very large one.
- **When to pick:** If we have a maintenance window, QA bandwidth, and D2 (type safety) outweighs D3 (blast radius).

#### Option C — Targeted: Hooks fix + high-value conversions **[RECOMMENDED]**
- **What:** Option A plus convert `mcp/state-server.mjs` (complex, stateful, 590 LOC — highest bug-per-LOC value) and `src/setup-rules.mjs`. Leave root `cli/*.mjs` and `skills/team/worktree-manager.mjs` unchanged for now (track in open questions for a follow-up plan).
- **LOC touched:** ~1,100 deleted, ~814 converted.
- **Pros:** Fixes drift bug (D1). Adds strict typing to the single riskiest unchecked file, the MCP state server, which coordinates multi-agent state (D2). Keeps blast radius moderate (D3): all changes live under `plugins/oma/`, one tsconfig, one build, one test suite. Verification is a single `npx tsc --noEmit && npm test` cycle plus an MCP smoke test.
- **Cons:** `cli/*.mjs` (1,182 LOC) still unconverted — punted to follow-up. Team worktree manager remains `.mjs`.
- **Why chosen:** See ADR below.

---

## 3. Recommended Approach — Task Flow (Option C)

### Task ordering (dependency-first)

1. **T1 (blocker, risk-critical):** Fix hooks drift by redirecting `hooks.json` to `dist/hooks/*.js`.
2. **T2:** Delete stale `hooks/*.mjs` after T1 verification.
3. **T3:** Convert `plugins/oma/src/setup-rules.mjs` → `.ts` (already inside `src/`, simplest conversion).
4. **T4:** Convert `plugins/oma/mcp/state-server.mjs` → `src/mcp/state-server.ts`; update any invocation paths.
5. **T5:** Final verification pass: `tsc --noEmit`, `vitest run`, manual hook smoke tests.

### Work Objectives

- Eliminate the runtime drift bug by collapsing to one hooks implementation.
- Add strict TypeScript coverage to the MCP state server (highest-risk unchecked surface).
- Keep all changes verifiable in a single `tsc + vitest` cycle.
- Preserve existing hook contracts, CLI behavior, and MCP server API exactly.

### Guardrails

**Must have:**
- `npx tsc --noEmit` passes with zero errors after each task.
- `npm test` (vitest) passes.
- `hooks.json` still wires all 9 hook events (SessionStart, PreToolUse×3, PostToolUse×4, Stop).
- Manual smoke test: SessionStart hook produces context, PreToolUse delegation-enforce blocks disallowed writes, PostToolUse keyword-detect fires.
- MCP state server starts, accepts tool calls, returns expected JSON shapes.

**Must NOT have:**
- No changes to hook behavior, only the invocation path.
- No changes to MCP server tool names, arg schemas, or response shapes.
- No changes to `cli/*.mjs` (root CLI) in this plan.
- No changes to `skills/team/worktree-manager.mjs` in this plan.
- No changes to public package exports (`dist/index.js` must still be the main entry).
- No `--no-verify` on commits; no hook skipping.

---

## 4. Detailed TODOs

### T1 — Redirect `hooks.json` to compiled TS hooks

**File:** `plugins/oma/hooks/hooks.json`

**Change:** Replace all 9 `node ${AUGMENT_PLUGIN_ROOT}/hooks/*.mjs` invocations with `node ${AUGMENT_PLUGIN_ROOT}/dist/hooks/*.js`.

**Pre-checks:**
- Confirm each `dist/hooks/*.js` has a top-level `main()` call (Read `dist/hooks/session-start.js` already confirms this: line 164 calls `main();`). Spot-check the other 8 to confirm they execute as standalone scripts, not only as module exports.
- Confirm `AUGMENT_PLUGIN_ROOT` resolves such that `dist/hooks/` is reachable at runtime (it is, since `dist/` is included in the `files` array of `package.json`).

**Acceptance criteria:**
- `hooks.json` has 9 commands, all pointing at `dist/hooks/*.js`.
- Each referenced `dist/hooks/*.js` exists and has a side-effect `main()` invocation.
- `node plugins/oma/dist/hooks/session-start.js` runs standalone without crashing (exit 0).
- SessionStart smoke test injects OMA context as expected.

**Verification commands:**
```bash
cd plugins/oma
npx tsc --noEmit
# Verify each compiled hook runs standalone
for h in dist/hooks/*.js; do node "$h" < /dev/null; echo "$h exit=$?"; done
# Vitest
npm test
```

---

### T2 — Delete stale `hooks/*.mjs` runtime files

**Files to delete:**
- `plugins/oma/hooks/adr-enforce.mjs`
- `plugins/oma/hooks/approval-gate.mjs`
- `plugins/oma/hooks/audit-log.mjs`
- `plugins/oma/hooks/cost-track.mjs`
- `plugins/oma/hooks/delegation-enforce.mjs`
- `plugins/oma/hooks/keyword-detect.mjs`
- `plugins/oma/hooks/post-tool-status.mjs`
- `plugins/oma/hooks/session-start.mjs`
- `plugins/oma/hooks/stop-gate.mjs`

**Do NOT delete:** `plugins/oma/hooks/hooks.json` (updated in T1).

**Pre-check:** `Grep` for any reference to `hooks/*.mjs` outside `hooks.json` — scripts, docs, tests, install routines. Any such reference must first be repointed.

**Acceptance criteria:**
- 9 `.mjs` files removed.
- No remaining references to `hooks/*.mjs` in the repo (use `rg "hooks/[a-z-]+\.mjs"`).
- `hooks.json` still valid JSON.
- Full test suite green.

**Verification commands:**
```bash
cd /Users/andreburgstahler/Ws/Personal/oh-my-auggie
# From repo root:
rg --fixed-strings "hooks/session-start.mjs" || echo "clean"
rg "hooks/[a-z-]+\.mjs" plugins/oma scripts docs || echo "clean"
cd plugins/oma && npm test
```

---

### T3 — Convert `src/setup-rules.mjs` → `src/setup-rules.ts`

**File:** `plugins/oma/src/setup-rules.mjs` → `plugins/oma/src/setup-rules.ts`

**Scope:** This file is already inside `src/` but uses the `.mjs` extension, which currently lets it bypass TS checking (TS includes `src/**/*` but `tsc` won't type-check `.mjs`). Convert in place.

**Steps:**
- Rename extension.
- Add types for any exported functions.
- Fix type errors surfaced by strict mode.
- Update any imports in `src/index.ts` or elsewhere that reference `./setup-rules.mjs` → `./setup-rules.js` (TS uses `.js` specifiers for NodeNext).

**Acceptance criteria:**
- File compiles under strict TS.
- `dist/setup-rules.js` emitted.
- Any caller still resolves the setup-rules entry point without runtime error.
- No behavior change (setup-rules logic identical).

**Verification commands:**
```bash
cd plugins/oma
npx tsc --noEmit
npm test
# If there's a setup-rules invoker, run it end-to-end
```

---

### T4 — Convert `mcp/state-server.mjs` → `src/mcp/state-server.ts`

**Files:**
- Source: `plugins/oma/mcp/state-server.mjs` (590 LOC)
- Destination: `plugins/oma/src/mcp/state-server.ts`
- Compiled output: `plugins/oma/dist/mcp/state-server.js`

**Steps:**
- Create `plugins/oma/src/mcp/` directory.
- Move content, rename extension, add types.
- Use existing `types.ts` shapes where applicable; introduce new interfaces for MCP tool request/response shapes only where reuse is not possible.
- Find all invocation paths (likely in plugin manifest or scripts) and update from `mcp/state-server.mjs` → `dist/mcp/state-server.js`.
- Delete old `mcp/state-server.mjs`.

**Pre-checks:**
- `Grep` for `mcp/state-server.mjs` in the repo to find all invocation sites.
- Confirm MCP tool schemas and response shapes by reading the file end-to-end (haiku explore agent acceptable here).

**Acceptance criteria:**
- TS compiles under strict mode.
- `dist/mcp/state-server.js` exists and runs standalone.
- MCP server registers all existing tools with identical names and arg schemas.
- Smoke test: start the server, send a `state_read` call, receive expected JSON.
- All invocation paths updated; no dangling `.mjs` references.

**Verification commands:**
```bash
cd plugins/oma
npx tsc --noEmit
# Start the server as a subprocess and send a JSON-RPC tools/list
node dist/mcp/state-server.js &
SERVER_PID=$!
# Run a client-side smoke test (or manual with jq)
kill $SERVER_PID
npm test
```

---

### T5 — Final verification pass

**Commands:**
```bash
cd /Users/andreburgstahler/Ws/Personal/oh-my-auggie/plugins/oma
npx tsc --noEmit
npm run prepare   # full build
npm test          # vitest run
# Hook smoke tests
node dist/hooks/session-start.js < /dev/null
node dist/hooks/delegation-enforce.js < /dev/null
# Start a fresh auggie/claude session and confirm SessionStart context injection
```

**Acceptance criteria:**
- `tsc --noEmit` exit 0.
- `vitest run` all green.
- Each compiled hook runs standalone exit 0.
- No `hooks/*.mjs` files remain.
- No `mcp/state-server.mjs` file remains.
- `src/setup-rules.ts` exists; no `src/setup-rules.mjs`.
- `rg "\.mjs" plugins/oma/hooks plugins/oma/src plugins/oma/mcp` returns empty.
- A fresh session with the plugin installed still displays OMA context and HUD correctly.

---

## 5. Success Criteria (overall)

- **Bug fixed:** Runtime hooks run the current TypeScript implementation; graph provider injection, HUD logic, and update-check all active.
- **Duplication eliminated:** Zero duplicate hook code. One source of truth under `src/hooks/`.
- **Type coverage expanded:** MCP state server and setup-rules under strict TS.
- **Blast radius contained:** No changes to public APIs, CLI behavior, or tool schemas.
- **Verifiable:** Single `npx tsc --noEmit && npm test` cycle passes from a clean checkout.
- **Shippable as one PR or a short PR chain** (suggested: PR1 = T1+T2, PR2 = T3+T4, PR3 = T5 cleanup if needed).

---

## 6. Open Questions (deferred; track in `open-questions.md`)

- **OQ1 — Root `cli/*.mjs` conversion.** 1,182 LOC across 6 files. Worth a dedicated follow-up plan? What is the CLI's release / distribution story (bin in package.json, standalone scripts, worktree workers)?
- **OQ2 — `skills/team/worktree-manager.mjs` conversion.** 291 LOC. Lower priority; typed only if team skill is actively evolving.
- **OQ3 — Second tsconfig for root `cli/`** vs. hoisting to monorepo-level tsconfig? Deferred until OQ1 is scoped.
- **OQ4 — `tests/hooks-setup.js` (8 LOC).** Trivially convertible; bundle with any future test refactor.

---

## 7. ADR — Architectural Decision Record

### Context
Planning surfaced a live bug: `hooks.json` invokes stale `.mjs` runtime scripts while the newer, feature-rich TypeScript hooks compile to `dist/hooks/*.js` but go unused. At the same time, the user asked whether to convert the repo's remaining `.mjs` files to TypeScript.

### Decision
**Adopt Option C — Targeted conversion with drift fix.**

Fix the hooks drift bug by redirecting `hooks.json` to compiled TS hooks and deleting the stale `.mjs` copies. Additionally convert `src/setup-rules.mjs` (trivial, in-scope) and `mcp/state-server.mjs` (high-value, complex, unchecked). Defer root `cli/*.mjs` and `skills/team/worktree-manager.mjs` to follow-up plans.

### Decision Drivers
1. **D1 — Correctness:** Drift between live and compiled hooks is an active bug; fixing it is non-negotiable.
2. **D2 — Maintenance value per LOC:** MCP state server has the highest bug-per-LOC risk of any unchecked file.
3. **D3 — Blast radius:** Option C stays entirely inside `plugins/oma/`, under one tsconfig, verified by one test cycle.

### Alternatives considered
- **Option A (conservative):** Rejected because it leaves 590 LOC of complex MCP state code unchecked. The marginal cost of adding T4 is small given we already have tooling set up; the marginal benefit is large.
- **Option B (maximal):** Rejected because root `cli/*.mjs` lives outside `plugins/oma/`, requires either a second tsconfig or a monorepo hoist, and has a broader blast radius (spawned workers, shebang entry points). Not ruled out forever — tracked as OQ1.
- **Keep `hooks/*.mjs` and convert in place to `.ts`:** Rejected because it does not fix the drift bug — it merely adds types to the stale copy while the compiled-TS version remains unused. Dual-maintenance persists.

### Why chosen
Option C is the smallest plan that both (a) resolves the correctness bug and (b) captures the highest-value type-safety win. It stays shippable in one verification cycle and leaves a clean handoff for follow-up work.

### Consequences
- **Positive:** Live hooks finally match source. Graph provider injection and HUD logic go live. MCP state server gets compile-time protection. Hooks `.mjs`/`.ts` duplication permanently eliminated.
- **Negative:** Root `cli/*.mjs` stays `.mjs` until a follow-up plan. Mixed-style repo remains in the short term.
- **Risk:** A subtle regression in hook behavior (e.g., an env var read that differs between the stale `.mjs` and the newer `.ts`) could surface only after deployment. Mitigated by T1 acceptance criteria (diff the two implementations before deleting) and T5 smoke tests.

### Follow-ups
- Follow-up plan for OQ1 (root `cli/*.mjs` conversion).
- Follow-up plan for OQ2/OQ3 (team worktree-manager + tsconfig strategy).
- Post-merge: watch audit log for any hook failures in the first 24 hours.

---

## 8. Pre-mortem note (informational; SHORT mode does not require full pre-mortem)

Even in SHORT mode, two failure scenarios deserve explicit watch:

1. **Hook behavior regression:** The stale `.mjs` session-start has a `hud-active` branch that the newer TS version does not include. If users rely on that HUD auto-display, switching to `dist/hooks/session-start.js` will break it. **Mitigation:** Before T1, diff the two implementations and port any missing features into `src/hooks/session-start.ts` first (do NOT delete `.mjs` until parity is confirmed). This may introduce a T0 task.
2. **MCP server invocation path divergence:** If the MCP server is referenced by an external plugin manifest or a shell wrapper, updating only `plugins/oma/` may miss a consumer. **Mitigation:** `rg` across the entire repo (and `.omc/`, `.oma/`) for `state-server.mjs` before deleting.

> **If these two mitigations are non-trivial, upgrade to DELIBERATE mode and run the full pre-mortem + expanded test plan.** Analyst/Architect review should explicitly rule on scenario 1 (HUD parity) before execution begins.

---

## 9. Handoff

- **Next:** Architect review (design correctness, file layout, invocation path). Then Critic review (risk assessment, parity check on hook features). Then executor.
- **Executor command on approval:** `/oh-my-claudecode:start-work mjs-to-ts-conversion-ralplan`
- **Consensus gate:** Do not execute until Architect + Critic both sign off AND the HUD-parity question (pre-mortem scenario 1) is explicitly resolved.
