# MJS-to-TS Conversion — PR 1 (T1a + T1b + T3) — FINAL REVISION (rev3)

**Status:** FINAL — ralplan consensus iteration 4 of 5
**Branch target:** `feat/mjs-to-ts-pr1`
**Base:** `main` (post `feat/graph-provider-config`)
**Scope:** PR 1 only. PR 2 (remaining 8 hooks) is explicitly out of scope.

---

## Context

OMA ships two parallel hook implementations:
- `plugins/oma/hooks/*.mjs` — executable hooks invoked by `hooks.json`
- `plugins/oma/src/hooks/*.ts` → `plugins/oma/dist/hooks/*.js` — TypeScript rewrites, not yet wired into `hooks.json`

Critic review (round 2) identified two CRITICAL blockers and four MAJOR issues in rev2. This revision resolves all of them with exact line numbers, exact file contents, and a verification strategy that does NOT depend on the orphaned parity runner.

### Repository facts (verified)

| Fact | Location | Notes |
|---|---|---|
| Broken `.replace()` subprocess | `plugins/oma/src/hooks/session-start.ts:39-85` | String interpolation of `hookPath` then `.replace('/src/hooks/session-start.mjs', ...)` — path no longer contains that literal after ts build. |
| HUD emission (reference impl) | `plugins/oma/hooks/session-start.mjs:53-77` | HUD `console.log('\n[OMA HUD]' + JSON.stringify(hud))` emitted BEFORE `console.log(sessionContext.trim())`. |
| HUD fields on state | `session-start.mjs:54,61,62,63` | Flat quoted: `state['hud-active']`, `state['hud-position']`, `state['hud-opacity']`, `state['hud-elements']`. |
| `OmaState` interface | `plugins/oma/src/types.ts:19-25` | Has `[key: string]: unknown` index signature — extension is additive and type-safe. |
| `setup-rules.mjs` arg parsing | `plugins/oma/src/setup-rules.mjs:42-45` | Parses `--project-dir`, NOT `--target`. `--templates` is comma-separated (`.split(',')`). |
| Pre-existing bug in oma-setup.md | `plugins/oma/commands/oma-setup.md:296` | Uses `--target "$RULES_TARGET"` (wrong flag) AND `"${SELECTED_TEMPLATES[*]}"` (space-separated, wrong separator). |
| Test SCRIPT_PATH | `plugins/oma/tests/setup-rules.test.ts:12` | Currently `join(process.cwd(), 'src', 'setup-rules.mjs')` — must move to `dist/setup-rules.js` in T3. |
| Parity runner | `plugins/oma/tests/parity/runner.ts` | Orphaned stub — no test file imports it, expects missing `.sh` files, never ran. DROPPED from verification. |

---

## Work Objectives

1. **T1a** — Document mjs→ts migration state (audit only, zero code change).
2. **T1b** — Convert `session-start` from mjs to ts as the canonical implementation, including: subprocess rewrite, HUD port with emission-order invariant, OmaState extension, regression test that fails on current code.
3. **T3** — Convert `setup-rules` test harness to exercise the compiled `dist/setup-rules.js`, fix the pre-existing `--target` bug in `oma-setup.md:296`.

PR 1 leaves `hooks/hooks.json` unchanged; all hooks continue to run from `.mjs` files after this PR merges. T1b is dark-launch: the ts rewrite is verified but not yet wired up.

---

## Guardrails

### Must Have
- T1b `session-start.ts` passes a targeted regression test that fails on current `main`.
- T1b preserves the HUD-before-sessionContext emission order exactly.
- T1b uses template literal variable interpolation for `pkgJsonPath` and `cacheDir` — zero `.replace()` calls in the child script string.
- T3 `SCRIPT_PATH` points at `join(process.cwd(), 'dist', 'setup-rules.js')`.
- T3 fixes `oma-setup.md:296` to use `--project-dir` (not `--target`) AND comma-separated templates.
- `npm test`, `npx tsc --noEmit`, `npm run build` all green.
- `rg "setup-rules\.mjs" plugins/oma/tests plugins/oma/commands` returns 0 matches after T3.
- `git revert` is a safe rollback for T1b (hooks.json still points at .mjs, zero user impact).

### Must NOT Have
- NO changes to `plugins/oma/hooks/session-start.mjs` (PR 2 will delete it; PR 1 leaves it as the runtime).
- NO changes to `plugins/oma/hooks/hooks.json` (PR 2 rewires).
- NO changes to the 8 non-session-start hooks (PR 2 scope).
- NO reliance on `tests/parity/runner.ts` (orphaned, dropped).
- NO `.replace()` chains in any subprocess child script string.
- NO breaking changes to existing `OmaState` consumers (extension is additive).

---

## Task Flow

```
T1a (audit)  ──┐
               ├──> T1b (session-start rewrite + test)  ──> T3 (setup-rules dist path + bug fix)  ──> Verification
               │                                                                                        │
               └──> MIGRATION-AUDIT.md                                                                   └──> PR 1 ready for review
```

T1a is independent and can run in parallel with T1b. T3 should run after T1b (so `npm test` covers both in a single green run). Verification is the final gate.

---

## Detailed TODOs

### T1a — MIGRATION-AUDIT.md (documentation only)

**Deliverable:** `plugins/oma/MIGRATION-AUDIT.md`

**Contents (required sections):**

1. **Status table** — for each of 9 hooks (session-start, post-tool-status, delegation-enforce, keyword-detect, stop-gate, approval-gate, adr-enforce, cost-track, subagent-start):
   - mjs path, ts path, dist path
   - Wired in `hooks.json`? (yes/no)
   - Has test coverage? (yes/no; test file path)
   - Known divergences from mjs reference

2. **Diff summary** — 9 hook-level diff blurbs (2-4 bullets each) identifying what the ts version changes vs. the mjs reference. For session-start specifically, call out:
   - Broken subprocess `.replace()` bug (lines 44, 72)
   - Missing HUD emission block (mjs:53-73 not ported)
   - Emission-order invariant (HUD before sessionContext)

3. **PR 2 target date:** 2 weeks after PR 1 merge. State explicit criteria for PR 2 promotion: all 9 ts hooks have unit tests, `hooks.json` is rewritten to point at `dist/hooks/*.js`, mjs files are deleted in a single commit, smoke test confirms session-start + stop-gate + keyword-detect still fire.

4. **Distribution model decision matrix** — 3 options with trade-offs:
   | Option | Pros | Cons |
   |---|---|---|
   | A: Ship `dist/` in npm tarball, ship `src/` too | Simplest; source maps work | Larger tarball |
   | B: Ship `dist/` only, `.npmignore` src | Smaller; still debuggable via source maps | Can't patch in place |
   | C: Build on postinstall | Smallest tarball | Slower install; adds dev deps to runtime |
   Pick **Option A** as default with rationale: PR 1 is dark-launch so this choice is reversible.

**Acceptance criteria:**
- File exists at `plugins/oma/MIGRATION-AUDIT.md`.
- All 9 hooks listed with status.
- Session-start row explicitly documents the `.replace()` bug and HUD gap.
- PR 2 target date in ISO 8601 format.
- Distribution matrix selects one option with one-sentence rationale.

---

### T1b — session-start.ts rewrite + OmaState extension + regression test

#### T1b.1 — Extend `OmaState` interface (flat quoted fields)

**File:** `plugins/oma/src/types.ts`

**Change:** Replace lines 19-25 with:

```typescript
export interface OmaState {
  mode: string;
  active: boolean;
  iteration?: number;
  task?: string;
  'hud-active'?: boolean;
  'hud-position'?: string;
  'hud-opacity'?: number;
  'hud-elements'?: Record<string, boolean>;
  [key: string]: unknown;
}
```

**Rationale:** Matches `session-start.mjs:54,61,62,63` exactly. The index signature `[key: string]: unknown` remains so existing consumers compile unchanged.

**Acceptance criteria:**
- `npx tsc --noEmit` clean.
- No changes needed to existing `OmaState` consumers (`ultrawork.ts`, `ralplan.ts`, `post-tool-status.ts`, `delegation-enforce.ts`, `stop-gate.ts`).

#### T1b.2 — Rewrite `spawnBackgroundUpdateCheck` subprocess (Option A)

**File:** `plugins/oma/src/hooks/session-start.ts` lines 35-85.

**Replacement approach (authoritative):**

1. **Compute paths in the parent process** before constructing the child script string:
   ```typescript
   const pluginRoot = process.env.AUGMENT_PLUGIN_ROOT
     ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..');
   const pkgJsonPath = join(pluginRoot, 'package.json');
   const cacheDir = resolveOmaDir();
   ```

2. **Interpolate as template literal variables** into the child script string — not `.replace()`:
   ```typescript
   const checkScript = `
     const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
     const { join } = require('path');
     const https = require('https');

     const pkg = JSON.parse(readFileSync(${JSON.stringify(pkgJsonPath)}, 'utf8'));
     const currentVersion = pkg.version;
     const cacheDir = ${JSON.stringify(cacheDir)};
     // ... rest of fetch + write logic, unchanged
     try { mkdirSync(cacheDir, { recursive: true }); } catch {}
     writeFileSync(join(cacheDir, 'update-check.json'), JSON.stringify(cache, null, 2));
   `;
   ```
   `JSON.stringify()` is the canonical safe way to embed a path as a string literal: handles quotes, backslashes (Windows), and never produces a `.mjs`-dependent substring.

3. **Delete `getUpdateCachePath()`** (lines 16-21) — replaced by `resolveOmaDir()`-derived `cacheDir`, reusing the project's canonical resolver.

4. **Preserve the spawn call** (lines 78-84) verbatim — only the `checkScript` construction changes.

**Acceptance criteria:**
- `rg "\.replace\('/src/hooks/session-start\.mjs'" plugins/oma/src/hooks/session-start.ts` → 0 matches.
- `rg "\.replace\(" plugins/oma/src/hooks/session-start.ts` → 0 matches in the subprocess block.
- `rg "JSON\.stringify\(pkgJsonPath\)|JSON\.stringify\(cacheDir\)" plugins/oma/src/hooks/session-start.ts` → 2 matches.
- Manual invocation via `node dist/hooks/session-start.js` writes `.oma/update-check.json` (or fails silently with `try/catch`).

#### T1b.3 — Port HUD emission block (preserve emission-order invariant)

**Source of truth:** `plugins/oma/hooks/session-start.mjs:53-73`.

**Target:** `plugins/oma/src/hooks/session-start.ts` — insert in `main()` between the Graph Provider Injection block (line 159) and the Output block (line 163).

**Emission-order invariant:** HUD must be `console.log(...)`-emitted BEFORE the `if (sessionContext) console.log(sessionContext);` call. This matches the mjs:72-77 ordering.

**Ported block (reference only — executor writes the actual code):**

```typescript
  // ── HUD auto-display ────────────────────────────────────────────────────────
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
          mode: true, iteration: true, tokens: false,
          time: true, agents: true, progress: true,
        },
      };
      console.log('\n[OMA HUD]' + JSON.stringify(hud));
    }
  } catch { /* ignore */ }

  // ── Output (sessionContext AFTER HUD) ───────────────────────────────────────
  if (sessionContext) {
    console.log(sessionContext);
  }
```

Note: `loadOmaState(omaDir)` is already called earlier in `main()` (line 99). The executor may either cache that result in a local variable at line 99 and reuse it here, or load twice — prefer caching to avoid duplicate I/O.

**Acceptance criteria:**
- When `state['hud-active'] === true`, `[OMA HUD]{...}` line appears on stdout BEFORE any `[OMA MODE RESTORED]` / `[OMA NOTEPAD - PRIORITY]` lines.
- When `state['hud-active']` is falsy, zero HUD output (no empty line, no JSON).
- Defaults match mjs exactly: `position='top-right'`, `opacity=0.8`, `elements={mode,iteration,tokens:false,time,agents,progress}`.

#### T1b.4 — Regression test (fails on current `main`, passes after T1b.2)

**File:** `plugins/oma/tests/unit/hooks/session-start.test.ts` (extend existing suite; do not create a new file).

**Test 1 — Subprocess script has no `.replace()`-based path derivation (M3 resolution):**

```typescript
describe('session-start.ts subprocess script', () => {
  it('builds child script with interpolated paths, not .replace() chains', () => {
    const sourcePath = join(process.cwd(), 'src', 'hooks', 'session-start.ts');
    const src = readFileSync(sourcePath, 'utf8');

    // Locate the checkScript template literal
    const match = src.match(/const checkScript = `([\s\S]*?)`;/);
    expect(match).toBeDefined();
    const childScript = match![1];

    // Must NOT contain the broken replace-based path derivation
    expect(childScript).not.toContain(".replace('/src/hooks/session-start.mjs'");
    expect(childScript).not.toMatch(/\.replace\(['"]\/src\/hooks/);

    // Must contain JSON-stringified interpolations for pkgJsonPath and cacheDir
    expect(src).toContain('JSON.stringify(pkgJsonPath)');
    expect(src).toContain('JSON.stringify(cacheDir)');
  });
});
```

**Why this test fails on current code:** The current `session-start.ts:44` contains `.replace('/src/hooks/session-start.mjs', '/package.json')` — first assertion fails. The current code has no `JSON.stringify(pkgJsonPath)` — last assertions fail.

**Test 2 — HUD emission order (new test, fails on current code because HUD block is missing):**

```typescript
describe('session-start.ts HUD port', () => {
  it('emits [OMA HUD] before sessionContext when hud-active is true', () => {
    // Arrange: mock state with hud-active=true + mode='ralph' + active=true
    //          so both HUD and MODE RESTORED would emit
    // Act: run main() capturing stdout
    // Assert: HUD line index < MODE RESTORED line index
  });

  it('does not emit HUD when hud-active is false', () => {
    // Assert: no line starts with '[OMA HUD]'
  });
});
```

These two tests MUST be added in the same commit as the T1b.2 + T1b.3 implementation. They are the executable specification.

**Acceptance criteria:**
- `npm test` passes with all three new tests green after T1b implementation.
- Running the same three tests against `main` (before the fix) fails on the specific assertions above — the executor must verify this by running `git stash && npm test && git stash pop` and confirming failures.

---

### T3 — setup-rules test harness points at dist + fix oma-setup.md bug

#### T3.1 — Update `SCRIPT_PATH` to `dist/setup-rules.js`

**File:** `plugins/oma/tests/setup-rules.test.ts:12`.

**Change:**
```typescript
// Before:
const SCRIPT_PATH = join(process.cwd(), 'src', 'setup-rules.mjs');
// After:
const SCRIPT_PATH = join(process.cwd(), 'dist', 'setup-rules.js');
```

**Ripple effects:**
- `getAvailableTemplates()` (line 29) derives `templatesDir` from `dirname(SCRIPT_PATH)`. After the change, `dirname(SCRIPT_PATH) = dist/`, so `join(dist, '..', 'templates', 'rules')` still resolves to `plugins/oma/templates/rules/`. Path still correct (since `dist/` and `src/` are both direct children of `plugins/oma/`).
- `runScript()` (line 42) runs `node ${SCRIPT_PATH}` — works against compiled `.js` identically.

#### T3.2 — Build step as a test prerequisite

**File:** `plugins/oma/package.json`

**Add/verify:** `"pretest": "npm run build"` OR document that `npm run build` must run before `npm test` in CI. Confirm `prepare` hook runs `npm run build` so fresh clones compile automatically.

**Verification command in CI/local:** `npm run build && npm test`.

**Acceptance criteria:**
- `npm test` runs successfully after `npm run build`.
- `dist/setup-rules.js` exists after build.
- All 9 existing setup-rules tests still green.

#### T3.3 — Fix pre-existing `--target` bug in `oma-setup.md:296`

**File:** `plugins/oma/commands/oma-setup.md:296`.

**Current (broken):**
```bash
  node "$RULES_SOURCE/setup-rules.mjs" --templates "${SELECTED_TEMPLATES[*]}" --target "$RULES_TARGET"
```

**Two bugs:**
1. `--target` is not a valid flag. `setup-rules.mjs:42` parses `--project-dir`.
2. `"${SELECTED_TEMPLATES[*]}"` produces space-separated names. `setup-rules.mjs:45` does `.split(',')` — expects comma-separated.

**Fix:**
```bash
  IFS=',' TEMPLATES_CSV="${SELECTED_TEMPLATES[*]}"
  node "$RULES_SOURCE/setup-rules.mjs" --templates "$TEMPLATES_CSV" --project-dir "$PROJECT_DIR"
```

Executor must confirm what variable holds the project directory in that script (reading context around line 296 — likely `$PROJECT_DIR` or similar). `$RULES_TARGET` points at `.augment/rules/`, NOT at the project root, so the variable name used for `--project-dir` must be the project root, not `$RULES_TARGET`.

**Also update line 295 comment** if it references `--target`.

**Acceptance criteria:**
- `rg "--target" plugins/oma/commands/oma-setup.md` → 0 matches.
- `rg "--project-dir" plugins/oma/commands/oma-setup.md` → at least 1 match.
- Manual shell walkthrough (dry-run) of the install block with a temp dir produces a valid `node … --templates a,b,c --project-dir /tmp/...` command.

#### T3.4 — Grep hygiene check

After T3.1 and T3.3:
- `rg "setup-rules\.mjs" plugins/oma/tests` → 0 matches.
- `rg "setup-rules\.mjs" plugins/oma/commands` → remaining references must be in `$RULES_SOURCE/setup-rules.mjs` shell invocations (the shell still runs the mjs directly as a script; ESM interop is fine). Document this in a comment next to the invocation.

**Note on PR 1 scope:** The shell in `oma-setup.md` continues to call `setup-rules.mjs` (the runtime). T3 only changes the TEST harness to use `dist/setup-rules.js`. PR 2 will migrate the shell to call the compiled `dist/setup-rules.js`.

---

## Verification (no parity runner)

Run in order in `plugins/oma/`:

```bash
npm run build           # regenerates dist/setup-rules.js + dist/hooks/session-start.js
npx tsc --noEmit        # type correctness (OmaState extension + session-start.ts)
npm test                # 43 existing tests + 3 new session-start tests = 46 pass
rg "setup-rules\.mjs" tests/                    # → 0
rg "--target" commands/oma-setup.md              # → 0
rg "\.replace\('/src/hooks/session-start\.mjs'" src/hooks/session-start.ts   # → 0
rg "JSON\.stringify\(pkgJsonPath\)" src/hooks/session-start.ts               # → 1
```

All seven must pass. No parity runner involvement.

**Rollback:** `git revert <sha>` is safe. `hooks/hooks.json` still points at `hooks/session-start.mjs`, so reverting T1b has zero user-facing impact. T1a is documentation-only. T3 touches only tests and a buggy shell line — reverting restores the previous (still-buggy) state without data loss.

---

## Success Criteria

- [ ] `plugins/oma/MIGRATION-AUDIT.md` exists with all required sections.
- [ ] `plugins/oma/src/types.ts` has flat quoted HUD fields on `OmaState`.
- [ ] `plugins/oma/src/hooks/session-start.ts` subprocess uses `JSON.stringify(pkgJsonPath)` + `JSON.stringify(cacheDir)`; no `.replace()` chains.
- [ ] `session-start.ts` emits HUD before sessionContext when `hud-active=true`.
- [ ] 3 new tests in `tests/unit/hooks/session-start.test.ts` (subprocess assertion, HUD order, HUD absence) pass after T1b and FAIL on current `main`.
- [ ] `tests/setup-rules.test.ts:12` uses `dist/setup-rules.js`.
- [ ] `commands/oma-setup.md:296` uses `--project-dir` + comma-separated templates.
- [ ] `npm run build && npx tsc --noEmit && npm test` all green.
- [ ] All grep hygiene checks pass.

---

## RALPLAN-DR Summary

**Mode:** SHORT (standard consensus; no `--deliberate` flag requested).

**Principles (5):**
1. **Executable specification over prose.** A test that fails on `main` and passes after the fix is the only reliable acceptance gate.
2. **Safe interpolation over string replacement.** `JSON.stringify()` for path embedding in child scripts, never `.replace()` on transformed paths.
3. **Additive type changes.** Extending `OmaState` with optional fields preserves every existing consumer.
4. **Dark-launch first.** T1b compiles and tests without touching `hooks.json`; PR 2 handles the cutover. Rollback is `git revert`.
5. **Fix adjacent bugs you trip over.** The `--target` bug in `oma-setup.md` was discovered during T3 research; ship the fix in the same PR.

**Decision Drivers (top 3):**
1. **Zero user-facing regression in PR 1** — hooks.json untouched, mjs runtime intact.
2. **Test must fail on current code** — otherwise verification is theater.
3. **No reliance on orphaned infrastructure** — parity runner is stubbed out; audit-only documentation is enough for PR 1.

**Options considered (with invalidation rationale for the rejected one):**

| Option | Description | Status |
|---|---|---|
| **A: Rewrite subprocess with JSON.stringify interpolation** | Compute `pkgJsonPath` and `cacheDir` in parent, interpolate as string literals into child script. | **CHOSEN** |
| B: Eliminate subprocess entirely (inline update check in main thread) | Simplest; no subprocess. | **INVALIDATED** — update check must be non-blocking (hook must `process.exit(0)` within ~100ms). Inlining would block session start on network I/O, regressing UX. The comment at line 167 explicitly says "Non-blocking". |
| C: Use `child_process.fork()` with a real `.js` worker file | Cleanest IPC, no string-script. | **INVALIDATED for PR 1** — requires an additional compiled artifact, a new dist path, and changes to the build script. Acceptable for PR 2 but out of scope here. |

Two viable options remained (A and C). C is deferred, A is selected for PR 1.

**ADR:**
- **Decision:** Rewrite `spawnBackgroundUpdateCheck` subprocess using `JSON.stringify()` template literal interpolation of parent-process-computed `pkgJsonPath` and `cacheDir`.
- **Drivers:** Non-blocking update check is required; dark-launch constraint; PR 1 must not add new build artifacts.
- **Alternatives considered:** (B) Inline in main thread — rejected for blocking I/O. (C) `child_process.fork()` worker — deferred to PR 2.
- **Why chosen:** Minimal delta, preserves non-blocking behavior, passes a regression test that fails on current code, and keeps the build graph unchanged.
- **Consequences:** Future hook ts rewrites should use the same `JSON.stringify()` pattern for any child-script path interpolation. A helper `buildChildScript(paths: Record<string,string>, body: string)` may be worth extracting in PR 2.
- **Follow-ups:** PR 2 — wire `hooks.json` to `dist/hooks/*.js`, convert remaining 8 hooks, delete `hooks/*.mjs`, migrate the `oma-setup.md` shell to call `dist/setup-rules.js`, consider `child_process.fork()` refactor.

---

## Out of scope (one sentence each)

- **PR 2 hook migrations** — the 8 remaining hook ts rewrites (post-tool-status, delegation-enforce, keyword-detect, stop-gate, approval-gate, adr-enforce, cost-track, subagent-start) and the `hooks.json` cutover land in PR 2.
- **Parity runner** — `tests/parity/runner.ts` remains an orphaned stub; PR 2 will either delete it or replace it with a real harness.
- **Shell migration in `oma-setup.md`** — the install shell keeps calling `setup-rules.mjs` at runtime; migrating it to `dist/setup-rules.js` is deferred to PR 2.
- **`child_process.fork()` refactor of subprocess** — Option C above is acknowledged as cleaner but stays out of scope for PR 1 to keep the build graph unchanged.
- **Deleting `hooks/session-start.mjs`** — the mjs file stays in place through PR 1 as the runtime; PR 2 deletes it alongside the `hooks.json` cutover.
- **Distribution model implementation** — T1a documents the decision matrix and selects Option A; actually changing `.npmignore` / tarball contents is a separate PR after PR 2 lands.
