# mjs-to-ts Conversion — Revised Plan (PR 1)

**Mode:** ralplan consensus, revision 2 (post Architect + Critic ITERATE)
**Scope:** PR 1 only — audit + bug fixes + scoped setup-rules port
**Deferred to follow-up PRs:** T1c (hooks.json redirect + dist/ strategy), T2 (delete stale .mjs), T4 (MCP server conversion)

---

## Context

Revision 1 proposed Option C with 5 tasks (audit, bug-fix, setup-rules port, MCP port, delete stale .mjs, hooks.json redirect). Architect and Critic both returned ITERATE with the following combined blockers:

- **C1 (CRITICAL):** Plugin distribution model does not ship `dist/`. Plugin consumers install from git/marketplace and receive whatever is committed — i.e. `hooks/*.mjs` directly. Redirecting `hooks.json` to `dist/hooks/*.js` would break plugin installs with ENOENT.
- **C2:** `src/hooks/session-start.ts` contains two pre-existing bugs (hardcoded 3-level walk to `.oma`, stale `/src/hooks/session-start.mjs` string replace in background update check) that will manifest the moment we redirect.
- **C3:** MCP server has 22+ external references across `.mcp.json` files (2 at different depths), `doctor.mjs`, 4 bats invocations, docs, SPEC.md, and 12 translated READMEs — too large for this iteration.
- **C4:** `setup-rules.mjs` port is missing 2 required updates: `tests/setup-rules.test.ts:12` (SCRIPT_PATH) and `commands/oma-setup.md:294-296` (shell invocation).
- **C5:** Port of `hud-active` block requires extending `OmaState` type (currently lacks `hud-active`, `hud-position`, `hud-opacity`, `hud-elements`).
- **C6:** `node hook.js < /dev/null` smoke tests only catch syntax errors — all session-start failures are `catch {}`-wrapped. Must use existing `tests/parity/runner.ts`.
- **C7:** Deleting stale `.mjs` hooks in the same PR as the redirect is irreversible — must be a separate follow-up with a git tag and plugin-install smoke test.
- **C8:** Plan missing pre-mortem, expanded test plan, committed audit artifact, and explicit scope boundary.

**Reviewers' recommendation:** Narrow PR 1 to audit + bug fixes + scoped setup-rules port. This revised plan adopts that recommendation.

---

## Work Objectives

1. Produce an authoritative audit (`MIGRATION-AUDIT.md`) of all 9 hook pairs so the dist/ shipping decision (deferred to PR 2) has a factual baseline.
2. Fix two pre-existing latent bugs in `src/hooks/session-start.ts` and complete the port of the `hud-active` HUD block by extending `OmaState`.
3. Convert the standalone `src/setup-rules.mjs` script to TypeScript with full reference enumeration (test + command doc).

---

## Guardrails

### Must Have
- `MIGRATION-AUDIT.md` committed to the repo (not gitignored).
- `session-start.ts` uses `resolveOmaDir()` from `src/utils.ts` (no hardcoded path walk).
- `session-start.ts` background update check uses the compiled path (`dist/hooks/session-start.js`) or, preferably, an explicit `import.meta.url`-based resolver that does not rely on string replacement.
- `OmaState` type extended with optional `hud-active`, `hud-position`, `hud-opacity`, `hud-elements` fields.
- HUD auto-display block ported from `hooks/session-start.mjs:53-73` to `src/hooks/session-start.ts`.
- `setup-rules.mjs` → `setup-rules.ts` conversion updates all 3 references: the script, `tests/setup-rules.test.ts:12`, and `commands/oma-setup.md:294-296`.
- Parity runner (`tests/parity/runner.ts`) used for `session-start` verification, not `< /dev/null` smoke tests.
- Explicit scope-boundary statement in PR description.

### Must NOT Have
- No changes to `plugins/oma/hooks/hooks.json` (redirect is deferred to PR 2).
- No deletion of `plugins/oma/hooks/*.mjs` files (deferred to PR 3).
- No changes to `plugins/oma/mcp/state-server.mjs` or any of its 22+ references (deferred to a separate plan).
- No changes to `package.json:files` or `dist/` shipping strategy (deferred to PR 2).
- No architectural rework of `resolveOmaDir()` or `getMergedConfig()`.
- No new hooks, no new features.

---

## Task Flow

```
T1a (audit)  ─────────────┐
                          ├──► commit ──► CI ──► PR 1
T1b (session-start fixes) ┤
                          │
T3  (setup-rules port)    ┘
```

Tasks are independent and may land in any order; all three ship in a single PR.

---

## Detailed TODOs

### T1a — Audit all 9 hook pairs, commit `MIGRATION-AUDIT.md`

**Files to create:**
- `plugins/oma/MIGRATION-AUDIT.md` (new, committed)

**Audit must enumerate (for each of the 9 hook pairs):**

| # | Hook name | `.mjs` LOC | `.ts` LOC | Behavioral deltas | Port status |
|---|-----------|-----------:|----------:|-------------------|-------------|
| 1 | adr-enforce | | | | |
| 2 | approval-gate | | | | |
| 3 | audit-log | | | | |
| 4 | cost-track | | | | |
| 5 | delegation-enforce | | | | |
| 6 | keyword-detect | | | | |
| 7 | post-tool-status | | | | |
| 8 | session-start | | | | |
| 9 | stop-gate | | | | |

For each pair:
1. Run `diff -u hooks/<name>.mjs src/hooks/<name>.ts` and summarize semantic diffs (ignoring imports/types).
2. Enumerate any `state[...]` keys the `.mjs` reads that are not declared in `src/types.ts:OmaState`.
3. Flag any hardcoded path walks (`../../..`), stale filename references (`.mjs` in string replacements), or `process.env` reads.
4. Classify port status: **identical** / **behavioral-gap** / **missing-feature** / **has-bugs**.

**Document must also include a "Distribution Model Findings" section** capturing:
- `.augment-plugin/manifest.json` `files` glob / what is actually shipped.
- `package.json:files` (confirm `dist/**/*` only affects npm publish, not plugin install).
- Git-tracked status of `plugins/oma/dist/` (confirm whether committed or gitignored).
- A decision matrix for PR 2 with Options A/B/C from the C1 blocker (commit dist/, compile in-place, or stage redirect).

**Acceptance criteria:**
- [ ] File exists at `plugins/oma/MIGRATION-AUDIT.md`, tracked in git (not in `.gitignore`).
- [ ] All 9 hook pairs enumerated with diff summary + port status.
- [ ] Distribution Model Findings section present with concrete findings on all 3 bullet points.
- [ ] Decision matrix lists Options A/B/C with pros/cons, no decision made yet (that is PR 2's job).
- [ ] session-start entry explicitly flags the 2 known bugs (hardcoded walk, stale string replace) and the hud-active port status.
- [ ] Document linked from `plugins/oma/README.md` under a "Migration status" heading (1-line reference only).

---

### T1b — Fix `src/hooks/session-start.ts` bugs + port `hud-active`

**Files to modify:**
1. `plugins/oma/src/types.ts`
2. `plugins/oma/src/hooks/session-start.ts`

**Changes — `src/types.ts` (OmaState extension, C5):**

Extend the `OmaState` interface (currently lines 19-25) with the following optional fields:

```ts
export interface OmaState {
  mode: string;
  active: boolean;
  iteration?: number;
  task?: string;
  // HUD auto-display fields (read by session-start hook)
  'hud-active'?: boolean;
  'hud-position'?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  'hud-opacity'?: number;
  'hud-elements'?: {
    mode?: boolean;
    iteration?: boolean;
    tokens?: boolean;
    time?: boolean;
    agents?: boolean;
    progress?: boolean;
  };
  [key: string]: unknown;
}
```

(Keep the `[key: string]: unknown` index signature so other reads stay loose.)

**Changes — `src/hooks/session-start.ts` (C2 bug fixes):**

1. **Bug fix 1 — hardcoded path walk (lines 16-21).** Replace `getUpdateCachePath()`:

   Current:
   ```ts
   function getUpdateCachePath(): string {
     const hookDir = dirname(fileURLToPath(import.meta.url));
     const omaDir = join(hookDir, '..', '..', '..', '.oma');
     return join(omaDir, 'update-check.json');
   }
   ```

   Replacement: use `resolveOmaDir()` (already imported at line 4):
   ```ts
   function getUpdateCachePath(): string {
     return join(resolveOmaDir(), 'update-check.json');
   }
   ```

   Remove the now-unused `dirname` / `fileURLToPath` imports only if no other caller remains in the file (the `spawnBackgroundUpdateCheck` function still uses them — keep them).

2. **Bug fix 2 — stale `.mjs` string replace (lines 44, 72).** The `spawnBackgroundUpdateCheck()` function constructs a child-process script via string interpolation and currently does:
   - Line 44: `'${hookPath.replace(/'/g, "'\"'\"'")}'.replace('/src/hooks/session-start.mjs', '/package.json')`
   - Line 72: `'${hookPath.replace(/'/g, "'\"'\"'")}'.replace('/src/hooks/session-start.mjs', '/.oma')`

   After TS compilation, `hookPath` resolves to `.../dist/hooks/session-start.js`, so `/src/hooks/session-start.mjs` is never present and both `.replace()` calls silently no-op — leaving absolute paths pointing at the compiled hook file itself.

   Fix: compute `packageJsonPath` and `omaDirPath` in the **parent** process using `resolveOmaDir()` and plugin-root resolution, then interpolate the already-resolved absolute paths into the child script string. Concretely:

   ```ts
   function spawnBackgroundUpdateCheck(): void {
     if (!shouldCheckUpdate()) return;
     const omaDir = resolveOmaDir();
     // Plugin root is 2 levels up from dist/hooks/ OR src/hooks/ (ts-node dev mode).
     // Resolve via package.json lookup walking up from import.meta.url.
     const pluginRoot = findPluginRoot(fileURLToPath(import.meta.url));
     const packageJsonPath = join(pluginRoot, 'package.json');
     const updateCachePath = join(omaDir, 'update-check.json');
     const checkScript = `
       const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
       const { dirname } = require('path');
       const https = require('https');
       const pkg = JSON.parse(readFileSync(${JSON.stringify(packageJsonPath)}, 'utf8'));
       // ...rest uses ${JSON.stringify(updateCachePath)} instead of string-replace
     `;
     // ...
   }
   ```

   Add a small helper `findPluginRoot(startPath: string): string` that walks up from `startPath` until it finds a `package.json` whose `name` is `oh-my-auggie` (or the plugin's published name), falling back to 2 levels up if no match. Place it in `src/utils.ts` next to `resolveOmaDir()` and export it.

3. **HUD auto-display port (C5).** Port the block from `hooks/session-start.mjs:53-73` into `src/hooks/session-start.ts`, placing it **after** the existing "Mode Injection" block (around line 106, before "Notepad Injection"). Use the newly-typed `OmaState` fields:

   ```ts
   // ── HUD auto-display ───────────────────────────────────────────────────────
   try {
     const state = loadOmaState(omaDir);
     if (state['hud-active'] === true) {
       const hud = {
         type: 'hud',
         display: true,
         mode: state.mode ?? 'none',
         active: state.active ?? false,
         task: state.task ?? '',
         position: state['hud-position'] ?? 'top-right',
         opacity: state['hud-opacity'] ?? 0.8,
         elements: state['hud-elements'] ?? {
           mode: true,
           iteration: true,
           tokens: false,
           time: true,
           agents: true,
           progress: true,
         },
       };
       console.log('\n[OMA HUD]' + JSON.stringify(hud));
     }
   } catch {
     // State missing or invalid — no HUD
   }
   ```

**Acceptance criteria:**
- [ ] `src/types.ts` `OmaState` declares all 4 HUD fields as optional.
- [ ] `getUpdateCachePath()` no longer uses `'..', '..', '..', '.oma'` literals.
- [ ] `grep -n "/src/hooks/session-start.mjs" plugins/oma/src/hooks/session-start.ts` returns zero matches.
- [ ] `spawnBackgroundUpdateCheck` interpolates already-resolved absolute paths into the child script.
- [ ] HUD auto-display block emits `[OMA HUD]...` JSON when `state['hud-active'] === true`.
- [ ] `npm run build` (tsc) succeeds with no type errors.
- [ ] Parity test (see test plan below) passes for `session-start` — shell / mjs / compiled ts emit matching stdout for 4 fixtures: empty state, active-mode state, hud-active state, corrupted state.

---

### T3 — Convert `src/setup-rules.mjs` → `src/setup-rules.ts` (scoped)

**Files to modify:**
1. `plugins/oma/src/setup-rules.mjs` → delete, replaced by `plugins/oma/src/setup-rules.ts` (new)
2. `plugins/oma/tests/setup-rules.test.ts` (line 12)
3. `plugins/oma/commands/oma-setup.md` (lines 294-296)

**Changes — `src/setup-rules.ts` (new):**

- Port all functions from `setup-rules.mjs` (`parseArgs`, `installTemplate`, `verify`, `main`, helpers).
- Define interfaces: `Args`, `InstallPolicy`, `InstallResult`, `VerifyResult`.
- Preserve the `#!/usr/bin/env node` shebang — after TS compile, the emitted `.js` will retain it if configured via `tsc` banner or post-build chmod. Verify tsconfig emits an executable JS (if not, add a build step in T3 acceptance).
- Keep all CLI behavior identical: same flags, same `[INSTALLED]` / `[SKIP]` / `[CONFLICT]` / `[ERROR]` / `[VERIFY]` output lines, same exit codes (0 on success, 1 on error).
- Export `main(argv: string[]): number` for unit-test ergonomics (still call `main(process.argv.slice(2))` at the bottom).

**Changes — `tests/setup-rules.test.ts:12` (C4):**

Replace:
```ts
const SCRIPT_PATH = join(process.cwd(), 'src', 'setup-rules.mjs');
```
with:
```ts
// Post-build: tests run against compiled dist artifact so CLI shebang + emit path are verified.
const SCRIPT_PATH = join(process.cwd(), 'dist', 'setup-rules.js');
```

**Note:** This requires the test suite's jest/vitest config to run `tsc` as a pretest step OR the test to shell out to `ts-node src/setup-rules.ts`. Pick whichever matches the existing pattern. Confirm in T3 step 1 by reading `plugins/oma/package.json` scripts and `jest.config.*` / `vitest.config.*`. If the existing pattern is `ts-node`-based, the SCRIPT_PATH should reference the `.ts` via `ts-node` invocation; document the choice in the PR description.

**Changes — `commands/oma-setup.md:294-296` (C4):**

Current:
```bash
# Invoke setup-rules.mjs for post-install processing
if [ -f "$RULES_SOURCE/setup-rules.mjs" ] && [ ${#SELECTED_TEMPLATES[@]} -gt 0 ]; then
  node "$RULES_SOURCE/setup-rules.mjs" --templates "${SELECTED_TEMPLATES[*]}" --target "$RULES_TARGET"
```

Replacement (assuming compiled artifact ships alongside or instead of source):
```bash
# Invoke setup-rules for post-install processing
# Prefer compiled dist artifact if present (plugin install), fall back to ts source via ts-node (dev)
if [ -f "$RULES_SOURCE/dist/setup-rules.js" ] && [ ${#SELECTED_TEMPLATES[@]} -gt 0 ]; then
  node "$RULES_SOURCE/dist/setup-rules.js" --templates "${SELECTED_TEMPLATES[*]}" --target "$RULES_TARGET"
elif [ -f "$RULES_SOURCE/src/setup-rules.ts" ] && [ ${#SELECTED_TEMPLATES[@]} -gt 0 ]; then
  npx --yes tsx "$RULES_SOURCE/src/setup-rules.ts" --templates "${SELECTED_TEMPLATES[*]}" --target "$RULES_TARGET"
```

**Open question (deferred to reviewer):** T3 touches the dist-shipping boundary the same way T1c would. The Must-NOT list says "no changes to dist shipping strategy" — but setup-rules is a CLI, not a hook, and its consumer (`oma-setup.md`) is a shell runbook, not `hooks.json`. If shipping `dist/setup-rules.js` is acceptable while we defer `dist/hooks/*.js`, this is fine. If not, T3 must be deferred alongside T1c. **Write this question to `.omc/plans/open-questions.md` and flag to the reviewer before implementation.**

**Acceptance criteria:**
- [ ] `src/setup-rules.ts` exists; `src/setup-rules.mjs` deleted.
- [ ] `npm run build` emits a runnable `dist/setup-rules.js` with shebang preserved (or tests use `tsx`).
- [ ] `tests/setup-rules.test.ts` passes all 9 existing test cases with no behavioral changes.
- [ ] `commands/oma-setup.md` shell snippet runs against the new artifact (manual smoke test in a clean temp project).
- [ ] `grep -rn "setup-rules.mjs" plugins/oma/` returns only matches inside `MIGRATION-AUDIT.md` historical references (or zero).
- [ ] No new TypeScript strict errors.
- [ ] Open question about dist/setup-rules.js shipping logged to `.omc/plans/open-questions.md`.

---

## Pre-Mortem (3 failure scenarios)

### Scenario 1 — Compiled `dist/setup-rules.js` loses shebang, plugin install breaks
**What happens:** After `tsc` emit, the compiled JS has no `#!/usr/bin/env node` line. `oma-setup.md` shell snippet runs `node "$RULES_SOURCE/dist/setup-rules.js"` explicitly, so shebang is not required at invocation — but any other caller that `exec`'s the file directly (e.g. a future marketplace hook) will fail.
**Probability:** Medium.
**Detection:** Post-build smoke test `head -1 plugins/oma/dist/setup-rules.js` must output `#!/usr/bin/env node`.
**Mitigation:** Add a post-build step in `plugins/oma/package.json` that prepends the shebang + `chmod +x` OR configure `tsc` with a banner plugin. If neither is acceptable, keep the `node "$RULES_SOURCE/..."` explicit invocation pattern (which works without a shebang) and document that setup-rules must always be invoked via `node`, never directly executed.

### Scenario 2 — `findPluginRoot()` walks into the wrong `package.json` on nested installs
**What happens:** In a monorepo or nested-plugin install layout, walking up from `dist/hooks/session-start.js` could hit the consumer's `package.json` before the plugin's. The update-check would then fetch the wrong version string and inject misleading telemetry.
**Probability:** Medium (users install in diverse environments).
**Detection:** Unit test for `findPluginRoot()` with a fixture containing nested `package.json` files; integration test that runs session-start from inside a mock `node_modules/@vendor/nested/` layout.
**Mitigation:** Match on `package.json#name === 'oh-my-auggie'` (or whatever the plugin's canonical name is), not just "first package.json found". On no match, fall back to the conservative "2-levels-up" heuristic AND emit a warning to stderr so observability catches it. Record the expected name in `src/utils.ts` as a const `PLUGIN_NAME`.

### Scenario 3 — Parity runner regression hides because fixtures are too thin
**What happens:** Parity runner passes for "empty state" and "active mode", but silently misses the new `hud-active` branch because no fixture sets `hud-active: true`. Reviewers approve PR 1. Later, users report "HUD never renders after update."
**Probability:** High if we don't explicitly add fixtures.
**Detection:** Require T1b acceptance to include a `tests/parity/fixtures/session-start-hud-active.json` fixture AND a parity run that asserts `stdout` contains `[OMA HUD]`. Fail the build if that fixture is missing.
**Mitigation:** Add 4 fixtures to `tests/parity/fixtures/session-start/` (empty, active-mode, hud-active, corrupted-json) and wire them into a parameterized parity test. Commit the fixtures in this PR so they exist before the port.

---

## Expanded Test Plan

### Unit
- `findPluginRoot()` — 4 cases: plain layout, monorepo nested, missing package.json, package.json with wrong name.
- `getUpdateCachePath()` — returns path under `resolveOmaDir()` regardless of cwd.
- `src/setup-rules.ts` `parseArgs()` — round-trip all flag combinations (add if missing).
- `src/setup-rules.ts` `installTemplate()` — mock fs, verify overwrite / rename / skip policies.

### Integration
- `tests/setup-rules.test.ts` — existing 9 cases pass against new artifact (compiled or tsx).
- New `tests/unit/session-start.test.ts` — import `main()` from `src/hooks/session-start.ts`, stub `console.log`, verify each emission branch (mode, notepad, auggie version, hud, graph).

### Parity (via `tests/parity/runner.ts`)
- `session-start` × 4 fixtures:
  - `empty-state.json` — no state, no notepad → empty stdout.
  - `active-mode.json` — `mode=ralph, active=true, task="foo"` → `[OMA MODE RESTORED]` string.
  - `hud-active.json` — `hud-active=true, hud-position="bottom-left"` → `[OMA HUD]` JSON with `position: "bottom-left"`.
  - `corrupted-json.json` — invalid JSON → graceful empty stdout, exit 0.
- Each fixture runs shell (N/A if no shell hook exists, then mjs vs compiled ts) side-by-side; `matched === true` required.
- **Important:** `runParity()` currently compares shell vs mjs. For this PR, add a new helper `runMjsVsTs()` that compares `hooks/<name>.mjs` vs the compiled `dist/hooks/<name>.js` (or invokes via `tsx` on `src/hooks/<name>.ts`). Document as the canonical parity harness going forward.

### Plugin-install smoke (NEW — required)
- Script: `scripts/test-plugin-install.sh` (new, executable).
- Steps:
  1. `git archive` the plugin to a tarball.
  2. Extract into a temp dir (simulating what Augment's plugin loader does).
  3. Verify `hooks/session-start.mjs` still exists and runs (this PR does not touch `hooks/*.mjs`).
  4. Verify `src/setup-rules.ts` OR `dist/setup-rules.js` is present depending on the open-question resolution.
  5. Run `oma-setup` shell snippet end-to-end against a mock project.
- Runs in CI as a separate job.

### Verification commands
```bash
# From plugins/oma/
npm run build                                              # tsc compile, no errors
npm test                                                   # all unit + integration green
node tests/parity/runner.js session-start hud-active.json  # parity harness (or tsx equivalent)
grep -rn "setup-rules.mjs" .                               # only historical refs allowed
grep -rn "/src/hooks/session-start.mjs" src/               # must be zero
grep -n "'\\.\\./', '\\.\\./', '\\.\\./'" src/hooks/session-start.ts  # must be zero
bash scripts/test-plugin-install.sh                        # plugin-install smoke
```

---

## Scope Boundary Statement

**This PR (PR 1) contains ONLY:**
- `plugins/oma/MIGRATION-AUDIT.md` (new, committed)
- `plugins/oma/src/types.ts` (OmaState extension)
- `plugins/oma/src/utils.ts` (new `findPluginRoot` export + `PLUGIN_NAME` const)
- `plugins/oma/src/hooks/session-start.ts` (2 bug fixes + HUD port)
- `plugins/oma/src/setup-rules.ts` (new, replaces .mjs)
- `plugins/oma/src/setup-rules.mjs` (deleted)
- `plugins/oma/tests/setup-rules.test.ts` (SCRIPT_PATH update)
- `plugins/oma/tests/parity/fixtures/session-start/*.json` (4 new fixtures)
- `plugins/oma/tests/parity/runner.ts` (new `runMjsVsTs` helper — additive)
- `plugins/oma/tests/unit/session-start.test.ts` (new)
- `plugins/oma/scripts/test-plugin-install.sh` (new)
- `plugins/oma/commands/oma-setup.md` (lines 294-296 update)
- `plugins/oma/README.md` (1-line "Migration status" reference)

**This PR does NOT touch:**
- `plugins/oma/hooks/hooks.json` (deferred to PR 2 after dist/ shipping strategy resolved)
- `plugins/oma/hooks/*.mjs` (deferred to PR 3 after PR 2 bakes)
- `plugins/oma/mcp/state-server.mjs` + 22+ external references (deferred to separate plan)
- `plugins/oma/package.json:files` / dist/ shipping strategy (deferred to PR 2 audit findings)
- `plugins/oma/.mcp.json`, `.augment-plugin/.mcp.json`, `cli/commands/doctor.mjs`, `e2e/oma-cli.bats`, translated READMEs

**Why deferred:**
- Redirecting `hooks.json` without first deciding dist/ shipping → broken plugin installs for every downstream consumer (C1).
- Deleting stale `.mjs` in the same PR as a redirect is irreversible → blocks rollback (C7).
- MCP server has 22+ references across files at differing depths, multiple `.mcp.json` depths, and 12 translated READMEs → too large for a single reviewer pass (C3).

---

## RALPLAN-DR Summary

**Mode:** SHORT (not `--deliberate`)
**Note:** Pre-mortem + expanded test plan included despite SHORT mode because Critic's C8 explicitly required them.

### Principles
1. **Reversibility over velocity.** Any change that breaks plugin installs for downstream consumers is irreversible without a git revert + release. Prefer audit → stage → execute over big-bang.
2. **Evidence over claims.** The distribution-model decision must be grounded in a committed audit artifact, not reviewer memory.
3. **Parity harness, not smoke.** Session-start failures are all `catch {}`-wrapped; syntax-check smoke tests are insufficient.
4. **Single-PR coherence.** Each PR must be mergeable and revertable in isolation; no cross-PR dependencies that can't be rolled back individually.
5. **Scope boundary as a first-class artifact.** Explicitly enumerate what is NOT touched, with rationale.

### Decision Drivers (top 3)
1. **Not breaking plugin installs** — C1 is the single most critical constraint.
2. **Catching regressions in `catch {}`-wrapped code paths** — C6 requires parity runner adoption.
3. **Bounding reviewer cognitive load** — deferring MCP (22+ refs) and hook redirect keeps PR 1 under ~300 LOC diff.

### Viable Options Considered

#### Option A — Full 5-task migration in one PR (Revision 1 — REJECTED)
- **Pros:** Single atomic migration, no multi-PR sequencing.
- **Cons:** C1 (breaks plugin installs), C3 (22+ MCP refs), C7 (irreversible delete + redirect), reviewer cognitive overload.
- **Verdict:** Rejected by Architect and Critic. Not viable.

#### Option B — Narrow to setup-rules port only (minimum viable iteration)
- **Pros:** Smallest possible PR, zero hook risk.
- **Cons:** Leaves 2 known latent bugs in `session-start.ts` in `main`; no audit artifact to ground PR 2; still requires resolving dist-shipping open question for setup-rules.
- **Verdict:** Viable but leaves technical debt. Weaker ROI than Option C.

#### Option C — Audit + bug fixes + scoped setup-rules (THIS PLAN)
- **Pros:** Fixes C2 bugs before they matter (pre-empts PR 2 regression); commits MIGRATION-AUDIT.md so PR 2 has factual basis; narrow enough to review in one pass; additively extends parity harness for reuse.
- **Cons:** setup-rules port still bumps against the dist-shipping open question (partially mitigated by documenting the question and allowing a tsx-based fallback); introduces new helper `findPluginRoot()` whose behavior under nested installs needs careful testing.
- **Verdict:** **CHOSEN.** Matches reviewer recommendation exactly.

### Architecture Decision Record

**Decision:** Ship PR 1 with T1a (audit) + T1b (session-start fixes + HUD port) + T3 (scoped setup-rules port). Defer T1c, T2, T4 to follow-up PRs.

**Drivers:**
1. Plugin install distribution model is undefined → must be audited before redirect.
2. Pre-existing latent bugs in `session-start.ts` will become live the moment we redirect → fix first.
3. Reviewer cognitive load budget ≈ 1 PR ≈ ~300 LOC diff.

**Alternatives considered:** Option A (monolithic, rejected by reviewers); Option B (setup-rules only, weaker ROI).

**Why chosen:** Option C is the narrowest plan that (a) unblocks PR 2 with a committed audit, (b) pre-empts known regressions from surfacing in PR 2, and (c) proves out the TS parity harness on a real hook before depending on it for the redirect.

**Consequences:**
- PR 2 blocked on dist/-shipping decision — this is intentional; audit is the unblocker.
- PR 3 blocked on PR 2 bake-in period + plugin-install smoke green in CI.
- setup-rules.ts consumer (`oma-setup.md`) must tolerate either compiled OR tsx-invoked artifact — documented as open question.
- New `findPluginRoot()` helper adds a new surface area; mitigated by unit tests + named-match heuristic.

**Follow-ups:**
- **PR 2 (T1c):** Resolve dist/ shipping strategy based on MIGRATION-AUDIT.md Decision Matrix; redirect `hooks.json` one hook at a time with parity gates.
- **PR 3 (T2):** Delete stale `hooks/*.mjs` after PR 2 bakes for at least one release + plugin-install smoke passes.
- **Separate plan (T4):** MCP server `state-server.mjs` → `.ts` with full 22+ reference enumeration as its own ralplan.
- **Open question #1:** dist/ shipping for setup-rules.js — written to `.omc/plans/open-questions.md`, resolve before T3 implementation.

---

## Success Criteria

- [ ] All 3 tasks (T1a, T1b, T3) landed in a single PR.
- [ ] `npm test` green.
- [ ] Parity harness green for `session-start` × 4 fixtures.
- [ ] Plugin-install smoke script green.
- [ ] `MIGRATION-AUDIT.md` committed and linked from `plugins/oma/README.md`.
- [ ] Zero matches for the 3 grep checks listed in Verification.
- [ ] PR description includes the Scope Boundary Statement verbatim.
- [ ] Open question logged to `.omc/plans/open-questions.md`.
- [ ] Reviewer sign-off from 1 Architect + 1 Critic (ralplan consensus).
