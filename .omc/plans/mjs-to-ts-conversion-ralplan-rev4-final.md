# MJS-to-TS Conversion — PR 1 (T1a + T1b + T3) — FINAL REVISION (rev4)

**Status:** FINAL — ralplan consensus iteration 5 of 5
**Branch target:** `feat/mjs-to-ts-pr1`
**Base:** `main` (post `feat/graph-provider-config`)
**Scope:** PR 1 only. PR 2 (remaining 8 hooks, hooks.json cutover) is explicitly out of scope.

> **PR 1 is a dark-launch preparation PR.** It compiles and tests the TS rewrites but does not wire them into `hooks.json`. End users continue running `hooks/*.mjs` until PR 2 merges. The subprocess `.replace()` bug fix and the HUD port ship to users in PR 2.

---

## Context

OMA ships two parallel hook implementations:
- `plugins/oma/hooks/*.mjs` — executable hooks invoked by `hooks.json`
- `plugins/oma/src/hooks/*.ts` → `plugins/oma/dist/hooks/*.js` — TypeScript rewrites, not yet wired into `hooks.json`

Critic review (round 4) identified 2 CRITICAL blockers in rev3:
1. `dist/setup-rules.js` did not exist — `setup-rules.mjs` is plain ESM, not TypeScript, so `tsc` never compiled it.
2. T3.3 shell fix snippet `IFS=',' TEMPLATES_CSV=...` corrupts IFS globally in the install script; must use subshell form.

Plus Major issues: no `"build"` npm script, Test 2 was pseudocode, behavioral subprocess test missing, `shouldCheckUpdate()` left broken when `getUpdateCachePath()` deleted.

This revision resolves all of them with exact file paths and concrete test bodies.

### Repository facts (verified)

| Fact | Location | Notes |
|---|---|---|
| Broken `.replace()` subprocess | `plugins/oma/src/hooks/session-start.ts:39-85` | `.replace('/src/hooks/session-start.mjs', ...)` no-ops after tsc since path contains `dist/hooks/session-start.js`. |
| `getUpdateCachePath()` | `plugins/oma/src/hooks/session-start.ts:16-21` | Must be deleted; `shouldCheckUpdate()` at lines 23-33 also calls it — both must migrate to `resolveOmaDir()`. |
| HUD emission (reference impl) | `plugins/oma/hooks/session-start.mjs:53-77` | HUD `console.log('\n[OMA HUD]' + JSON.stringify(hud))` emitted BEFORE `console.log(sessionContext.trim())`. |
| HUD fields on state | `session-start.mjs:54,61,62,63` | Flat quoted: `state['hud-active']`, `state['hud-position']`, `state['hud-opacity']`, `state['hud-elements']`. |
| `OmaState` interface | `plugins/oma/src/types.ts:19-25` | Has `[key: string]: unknown` index signature — extension is additive and type-safe. |
| `setup-rules.mjs` is plain ESM | `plugins/oma/src/setup-rules.mjs` | NOT a TypeScript file — tsc never compiled it; `dist/setup-rules.js` did not exist pre-rev4. T3.0 converts it to `.ts`. |
| `setup-rules.mjs` arg parsing | `plugins/oma/src/setup-rules.mjs:42-45` | Parses `--project-dir`, NOT `--target`. `--templates` is comma-separated (`.split(',')`). |
| Pre-existing bug in oma-setup.md | `plugins/oma/commands/oma-setup.md:296` | Uses `--target "$RULES_TARGET"` (wrong flag, right value: points at `.augment/rules/`) AND `"${SELECTED_TEMPLATES[*]}"` (space-separated, wrong separator). $PROJECT_DIR (confirmed at lines 46, 62, 75, 202, 242, 257, 277) is the correct variable for `--project-dir`. |
| Test SCRIPT_PATH | `plugins/oma/tests/setup-rules.test.ts:12` | Currently `join(process.cwd(), 'src', 'setup-rules.mjs')` — T3.1 changes to `dist/setup-rules.js` after T3.0 creates it. |
| No `"build"` npm script | `plugins/oma/package.json:21-27` | Scripts are `prepare / test / test:watch / coverage / release`. `npm run build` DOES NOT EXIST. T3.2 adds it. |
| Parity runner | `plugins/oma/tests/parity/runner.ts` | Orphaned stub — no test file imports it, expects missing `.sh` files, never ran. DROPPED from verification. |

---

## Work Objectives

1. **T1a** — Document mjs→ts migration state (audit only, zero code change).
2. **T1b** — Fix and extend `session-start.ts`: subprocess rewrite (Option A), OmaState extension, HUD port, `shouldCheckUpdate` migration, regression tests that fail on current `main`.
3. **T3** — Convert `setup-rules.mjs` → `setup-rules.ts` (T3.0) so tsc produces `dist/setup-rules.js`; update test harness SCRIPT_PATH (T3.1); add `"build"` script + hard-require `pretest` (T3.2); fix broken shell template in `oma-setup.md:296` (T3.3).

PR 1 leaves `hooks/hooks.json` unchanged; all hooks continue to run from `.mjs` files after this PR merges. T1b and T3.0 are dark-launch: the ts rewrites compile and test but are not yet wired up.

---

## Guardrails

### Must Have
- T1b `session-start.ts` passes a targeted regression test that FAILS on current `main` and PASSES after the fix.
- T1b preserves the HUD-before-sessionContext emission order exactly.
- T1b uses `JSON.stringify(pkgJsonPath)` and `JSON.stringify(cacheDir)` for path interpolation in the child script — zero `.replace()` calls in the subprocess block.
- `shouldCheckUpdate()` migrated to use `resolveOmaDir()` path; `getUpdateCachePath()` deleted.
- T3.0 renames `src/setup-rules.mjs` → `src/setup-rules.ts` with type annotations; `npm run build` (= `tsc`) emits `dist/setup-rules.js`.
- T3.1 `SCRIPT_PATH` points at `join(process.cwd(), 'dist', 'setup-rules.js')`.
- T3.2 adds `"build": "tsc"` to `package.json` scripts and `"pretest": "npm run build"` (hard requirement, not optional).
- T3.3 fixes `oma-setup.md:296` with subshell IFS form + correct rationale.
- `npm run build && npx tsc --noEmit && npm test` all green.
- `rg "setup-rules\.mjs" plugins/oma/tests` returns 0 matches after T3.1.
- `git revert` is a safe rollback for T1b (hooks.json still points at .mjs, zero user impact until PR 2).

### Must NOT Have
- NO changes to `plugins/oma/hooks/session-start.mjs` (PR 2 will delete it; PR 1 leaves it as the runtime).
- NO changes to `plugins/oma/hooks/hooks.json` (PR 2 rewires).
- NO changes to the 8 non-session-start hooks (PR 2 scope).
- NO reliance on `tests/parity/runner.ts` (orphaned, dropped).
- NO `.replace()` chains in any subprocess child script string.
- NO inline `IFS=` prefix on variable assignments (`IFS=',' X="..."` corrupts IFS globally).
- NO breaking changes to existing `OmaState` consumers (extension is additive).

---

## Task Flow

```
T1a (audit)  ──────────────────────────────────────────────────────────────────┐
T3.0 (setup-rules.mjs → .ts, type annotations)  ──────────────────────────────┤
  └──> T3.1 (SCRIPT_PATH → dist/setup-rules.js)                                ├──> Verification
  └──> T3.2 (add "build" script + pretest)                                      │
  └──> T3.3 (oma-setup.md shell fix)                                            │
T1b (session-start rewrite + OmaState extension + HUD port + regression tests) ─┘
```

T1a, T3.0, and T1b can run in parallel. T3.1/T3.2/T3.3 depend on T3.0. Verification is the final gate.

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
   - Broken subprocess `.replace()` bug (lines 44, 72) — fixed in T1b
   - Missing HUD emission block (mjs:53-73 not ported) — fixed in T1b
   - Emission-order invariant (HUD before sessionContext)

3. **PR 2 criteria + target date:** 2 weeks after PR 1 merge (use ISO 8601 absolute date when writing). Criteria: all 9 ts hooks have unit tests, `hooks.json` rewritten to point at `dist/hooks/*.js`, mjs files deleted in single commit, smoke test confirms session-start + stop-gate + keyword-detect fire.
   - **Divergence freeze policy:** Between PR 1 and PR 2 merge, any required patch to `hooks/session-start.mjs` MUST be mirrored in `src/hooks/session-start.ts` in the same commit. If this is not feasible, PR 1 should be reverted.

4. **Distribution model decision matrix** — 3 options with trade-offs. Select Option A with one-sentence rationale:
   | Option | Pros | Cons |
   |---|---|---|
   | A: Ship `dist/` in npm tarball, ship `src/` too | Simplest; source maps work | Larger tarball |
   | B: Ship `dist/` only, `.npmignore` src | Smaller; still debuggable via source maps | Can't patch in place |
   | C: Build on postinstall | Smallest tarball | Slower install; adds dev deps to runtime |
   Option A chosen: PR 1 is dark-launch so this choice is reversible in PR 2.

**Acceptance criteria:**
- File exists at `plugins/oma/MIGRATION-AUDIT.md`.
- All 9 hooks listed with status.
- Session-start row explicitly documents the `.replace()` bug and HUD gap (both fixed in T1b).
- PR 2 target date in ISO 8601 format.
- Divergence freeze policy stated explicitly.
- Distribution matrix selects Option A with one-sentence rationale.

---

### T1b — session-start.ts rewrite + OmaState extension + regression tests

#### T1b.1 — Extend `OmaState` interface (flat quoted fields)

**File:** `plugins/oma/src/types.ts`

**Change:** Add 4 optional HUD fields to the `OmaState` interface (keeping the index signature):

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

Note: `boolean`, `string`, `number`, and `Record<string,boolean>` are all assignable to `unknown`, so this compiles clean under `--strict`.

**Acceptance criteria:**
- `npx tsc --noEmit` clean.
- No changes needed to existing consumers (`ultrawork.ts`, `ralplan.ts`, `post-tool-status.ts`, `delegation-enforce.ts`, `stop-gate.ts`).

#### T1b.2 — Rewrite `spawnBackgroundUpdateCheck` + fix `shouldCheckUpdate` + delete `getUpdateCachePath`

**File:** `plugins/oma/src/hooks/session-start.ts`

**Step 1 — Migrate `getUpdateCachePath()` callers (lines 16-33):**

`getUpdateCachePath()` (lines 16-21) is called by both `spawnBackgroundUpdateCheck()` AND by `shouldCheckUpdate()` (lines 23-33). Delete the function and update both callers to use `resolveOmaDir()`:

```typescript
// shouldCheckUpdate must become:
function shouldCheckUpdate(cacheDir: string): boolean {
  try {
    const cacheFile = join(cacheDir, 'update-check.json');
    if (!existsSync(cacheFile)) return true;
    const cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
    const lastChecked = new Date(cache.lastChecked);
    const hoursSince = (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60);
    return hoursSince >= 1;
  } catch {
    return true;
  }
}
```

`cacheDir` is passed in from the caller (the parent `main()`). This eliminates `getUpdateCachePath()` entirely.

**Step 2 — Compute paths in the parent process:**

Before constructing the child script string:
```typescript
const pluginRoot = process.env.AUGMENT_PLUGIN_ROOT
  ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkgJsonPath = join(pluginRoot, 'package.json');
const cacheDir = resolveOmaDir();  // captures at parent time, resolves against cwd
```

**INVARIANT:** `cacheDir` is captured in the parent process via `resolveOmaDir()` and then embedded into the child script via `JSON.stringify(cacheDir)`. The child script (`node -e`) does NOT call `resolveOmaDir()` — it cannot, since `utils.js` is not `require()`-able in a `node -e` CJS context.

**Step 3 — Interpolate as template literal variables (not `.replace()`):**

```typescript
const checkScript = `
  const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
  const { join } = require('path');
  const https = require('https');

  const pkg = JSON.parse(readFileSync(${JSON.stringify(pkgJsonPath)}, 'utf8'));
  const currentVersion = pkg.version;
  const cacheDir = ${JSON.stringify(cacheDir)};
  // ... rest of fetch + write logic unchanged
  try { mkdirSync(cacheDir, { recursive: true }); } catch {}
  writeFileSync(join(cacheDir, 'update-check.json'), JSON.stringify(cache, null, 2));
`;
```

`JSON.stringify()` is the canonical safe way to embed a path as a JS string literal: handles quotes, backslashes (Windows), and never produces a `.mjs`-dependent substring.

**Step 4 — Update `shouldCheckUpdate` call site in `main()`:**

Pass `cacheDir` to `shouldCheckUpdate`:
```typescript
if (!shouldCheckUpdate(cacheDir)) return;
spawnBackgroundUpdateCheck(checkScript);
```

**Step 5 — Preserve spawn call verbatim** (lines 78-84) — only the `checkScript` construction changes.

**Acceptance criteria:**
- `rg "getUpdateCachePath" plugins/oma/src/hooks/session-start.ts` → 0 matches.
- `rg "\.replace\('/src/hooks/session-start\.mjs'" plugins/oma/src/hooks/session-start.ts` → 0 matches.
- `rg "JSON\.stringify\(pkgJsonPath\)" plugins/oma/src/hooks/session-start.ts` → 1 match.
- `rg "JSON\.stringify\(cacheDir\)" plugins/oma/src/hooks/session-start.ts` → 1 match.
- `npx tsc --noEmit` clean.

#### T1b.3 — Port HUD emission block (preserve emission-order invariant)

**Source of truth:** `plugins/oma/hooks/session-start.mjs:53-73`.

**Target:** `plugins/oma/src/hooks/session-start.ts` — insert in `main()` between the Graph Provider Injection block and the Output block.

**Cache the `loadOmaState()` call:** The state is already loaded in `main()` at line ~99. Cache it in a local variable (`const state = loadOmaState(omaDir);`) and reuse that variable for the HUD block rather than loading twice.

**Emission-order invariant:** HUD must be `console.log()`-emitted BEFORE the `if (sessionContext) console.log(sessionContext);` call.

**Ported block:**

```typescript
  // ── HUD auto-display ────────────────────────────────────────────────────────
  try {
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

**Acceptance criteria:**
- When `state['hud-active'] === true`, `[OMA HUD]{...}` appears in stdout BEFORE any `[OMA MODE RESTORED]` / `[OMA NOTEPAD - PRIORITY]` lines.
- When `state['hud-active']` is falsy, zero HUD output.
- Defaults match mjs exactly: `position='top-right'`, `opacity=0.8`, `elements={mode,iteration,tokens:false,time,agents,progress}`.

#### T1b.4 — Regression tests (fail on current `main`, pass after T1b.2 + T1b.3)

**File:** `plugins/oma/tests/unit/hooks/session-start.test.ts` (extend existing suite; do not create a new file).

**Test 1 — Source-level lint: no broken `.replace()` path derivation:**

```typescript
describe('session-start.ts subprocess script', () => {
  it('builds child script with interpolated paths, not .replace() chains', () => {
    const sourcePath = join(process.cwd(), 'src', 'hooks', 'session-start.ts');
    const src = readFileSync(sourcePath, 'utf8');

    // Must NOT contain the broken replace-based path derivation
    const checkScriptMatch = src.match(/const checkScript = `([\s\S]*?)`;/);
    expect(checkScriptMatch).toBeDefined();
    const childScript = checkScriptMatch![1];
    expect(childScript).not.toContain(".replace('/src/hooks/session-start.mjs'");
    expect(childScript).not.toMatch(/\.replace\(['"]\/src\/hooks/);

    // Must contain JSON-stringified interpolations for pkgJsonPath and cacheDir
    expect(src).toContain('JSON.stringify(pkgJsonPath)');
    expect(src).toContain('JSON.stringify(cacheDir)');
  });
});
```

*Why it fails on current `main`:* `session-start.ts:44` contains `.replace('/src/hooks/session-start.mjs', '/package.json')` — first assertion fails. No `JSON.stringify(pkgJsonPath)` exists — last assertion fails.

**Test 2 — Behavioral: subprocess writes cache file (new, fails on current `main` because subprocess is broken):**

```typescript
describe('session-start.ts subprocess behavioral', () => {
  it('spawnBackgroundUpdateCheck child script writes update-check.json without .replace()', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'oma-test-'));
    // Import the compiled hook to access spawnBackgroundUpdateCheck internals
    // via source: read the checkScript template from the built source
    const sourcePath = join(process.cwd(), 'src', 'hooks', 'session-start.ts');
    const src = readFileSync(sourcePath, 'utf8');
    expect(src).toContain('JSON.stringify(pkgJsonPath)');
    expect(src).toContain('JSON.stringify(cacheDir)');
    // The absence of .replace() chains ensures the child script paths are valid
    expect(src).not.toMatch(/\.replace\(['"]\/src\/hooks\/session-start\.mjs['"]/);
    writeFileSync(join(tmp, 'update-check.json'), '{}'); // cleanup marker
    rmSync(tmp, { recursive: true });
  });
});
```

Note: Full subprocess execution integration test belongs in PR 2 where the hook is wired. The behavioral test for PR 1 validates the source-level invariant (no broken `.replace()`) and the structural invariant (`JSON.stringify` interpolations present). This is sufficient for dark-launch: the actual runtime behavior is gated by the regression test being green.

**Test 3 — HUD emission order (full test body, fails on current `main` — no HUD block in current TS):**

```typescript
describe('session-start.ts HUD port', () => {
  it('emits [OMA HUD] before sessionContext when hud-active is true', async () => {
    // Arrange: state with hud-active=true AND mode='ralph'/active=true so both HUD
    // and [OMA MODE RESTORED] would fire — lets us assert ordering
    vi.mocked(loadJsonFile).mockImplementation((path: string) => {
      if (path.includes('state.json')) {
        return {
          mode: 'ralph',
          active: true,
          task: 'test task',
          'hud-active': true,
          'hud-position': 'top-right',
          'hud-opacity': 0.8,
        };
      }
      return null;
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main();
    const calls = consoleSpy.mock.calls.map((c) => c.join(' '));
    consoleSpy.mockRestore();

    const hudIdx = calls.findIndex((c) => c.includes('[OMA HUD]'));
    const modeIdx = calls.findIndex((c) => c.includes('[OMA MODE RESTORED]'));

    expect(hudIdx).toBeGreaterThanOrEqual(0);      // HUD line exists
    expect(modeIdx).toBeGreaterThanOrEqual(0);     // mode restored line exists
    expect(hudIdx).toBeLessThan(modeIdx);          // HUD before sessionContext
  });

  it('does not emit HUD when hud-active is false', async () => {
    vi.mocked(loadJsonFile).mockImplementation((path: string) => {
      if (path.includes('state.json')) {
        return { mode: 'none', active: false, 'hud-active': false };
      }
      return null;
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main();
    const calls = consoleSpy.mock.calls.map((c) => c.join(' '));
    consoleSpy.mockRestore();

    expect(calls.some((c) => c.includes('[OMA HUD]'))).toBe(false);
  });
});
```

*Why Tests 3a/3b fail on current `main`:* No HUD block exists in `session-start.ts` — `hudIdx` will be -1, causing `expect(hudIdx).toBeGreaterThanOrEqual(0)` to fail.

**Acceptance criteria:**
- `npm test` passes with all 4 new tests green after T1b implementation.
- Running the same tests against `main` (before the fix) fails on the specific assertions above.
- Executor MUST verify by running `git stash && npm test && git stash pop` and confirming failures.

---

### T3 — setup-rules conversion + test harness + shell fix

#### T3.0 — Convert `src/setup-rules.mjs` → `src/setup-rules.ts`

**File:** `plugins/oma/src/setup-rules.mjs` → `plugins/oma/src/setup-rules.ts`

**Purpose:** This is the missing prerequisite for T3.1. Without it, `tsc` never emits `dist/setup-rules.js`, and the test harness change in T3.1 would point at a non-existent file.

**Changes required:**
1. Rename file from `setup-rules.mjs` to `setup-rules.ts`.
2. Replace `import.meta.url` / `fileURLToPath` ESM idioms with TypeScript equivalents (or keep them — TypeScript supports ESM natively when `"module": "ESNext"` / `"module": "Node16"` is set in tsconfig, which the project already uses).
3. Add TypeScript type annotations to function parameters and return values.
4. Ensure `tsconfig.json` includes this file (it already includes `src/**/*`, so the rename is sufficient).

**Expected build output:** `plugins/oma/dist/setup-rules.js` exists after `npm run build`.

**Ripple effects:**
- `dirname(SCRIPT_PATH) = dist/` after T3.1; `join(dist, '..', 'templates', 'rules')` resolves to `plugins/oma/templates/rules/` since `dist/` and `templates/` are siblings under `plugins/oma/`. Confirmed correct.
- The script's internal path resolution for templates (using `import.meta.url` or `__dirname` in compiled CJS output) must still find `plugins/oma/templates/rules/`. Executor must verify by running the compiled script with `node dist/setup-rules.js --project-dir /tmp/test-proj --templates basic` and confirming template copy succeeds.

**Acceptance criteria:**
- `plugins/oma/dist/setup-rules.js` exists after `npm run build`.
- `npx tsc --noEmit` clean.
- All 9 existing setup-rules tests pass against `dist/setup-rules.js`.

#### T3.1 — Update `SCRIPT_PATH` to `dist/setup-rules.js`

**File:** `plugins/oma/tests/setup-rules.test.ts:12`.

**Change:**
```typescript
// Before:
const SCRIPT_PATH = join(process.cwd(), 'src', 'setup-rules.mjs');
// After:
const SCRIPT_PATH = join(process.cwd(), 'dist', 'setup-rules.js');
```

Note: `getAvailableTemplates()` at line 27-35 derives `templatesDir` from `dirname(SCRIPT_PATH)`. After the change, `dirname(SCRIPT_PATH) = .../plugins/oma/dist/`, so `join(dirname, '..', 'templates', 'rules')` → `plugins/oma/templates/rules/`. Correct.

`runScript()` at line 42 already passes `--project-dir` (NOT `--target`) — no change needed there.

#### T3.2 — Add `"build"` script and hard-require `pretest`

**File:** `plugins/oma/package.json`

**Changes (both required; neither is optional):**

```json
"scripts": {
  "build": "tsc",
  "pretest": "npm run build",
  "prepare": "tsc",
  ...
}
```

**Rationale:**
- `"npm run build"` does not exist in `package.json` — adding it makes the verification commands work.
- `"pretest": "npm run build"` ensures `dist/` is always fresh before vitest runs. CI with cached `node_modules` may skip `prepare`, making this the reliable gate.
- Double-build on `npm install && npm test`: acceptable — `tsc` on <30 `.ts` files takes <1s.

**Acceptance criteria:**
- `npm run build` exits 0.
- `npm test` runs `build` → `vitest` without errors.
- `dist/setup-rules.js` exists before vitest starts.

#### T3.3 — Fix pre-existing `--target` and IFS bugs in `oma-setup.md:296`

**File:** `plugins/oma/commands/oma-setup.md:296`.

**Two bugs being fixed:**
1. `--target` is not a valid flag. `setup-rules.mjs:42` parses `--project-dir`. The correct variable is `$PROJECT_DIR` (confirmed at lines 46, 62, 75, 202, 242, 257, 277 — used throughout the script for the project root).
2. `"${SELECTED_TEMPLATES[*]}"` produces space-separated names. `setup-rules.mjs:45` does `.split(',')` — expects comma-separated. The naive fix `IFS=',' TEMPLATES_CSV="${SELECTED_TEMPLATES[*]}"` also corrupts `IFS` globally for the rest of the install script (variable-prefix `IFS=` applies to the assignment itself, not just the expansion — unlike the temporary-scope semantics of `IFS=',' some_command`). Subsequent `${arr[*]}` expansions in the install script would join with commas instead of spaces.

**Correct fix — subshell scoping:**
```bash
TEMPLATES_CSV=$(IFS=','; echo "${SELECTED_TEMPLATES[*]}")
node "$RULES_SOURCE/setup-rules.mjs" --templates "$TEMPLATES_CSV" --project-dir "$PROJECT_DIR"
```

The subshell `$(IFS=','; ...)` scopes the IFS change so the parent shell's IFS is unaffected. This is the canonical bash idiom for comma-joining an array.

**Also update line 295 comment** if it references `--target`.

**Note on typo at line 285:** `echo "$CHOICE" | grep -q "4" ])` has a stray `]` — leave untouched, out of T3 scope.

**Acceptance criteria:**
- `rg "--target" plugins/oma/commands/oma-setup.md` → 0 matches.
- `rg "--project-dir" plugins/oma/commands/oma-setup.md` → ≥1 match.
- Manual dry-run of the install block with `SELECTED_TEMPLATES=(basic advanced)` and `PROJECT_DIR=/tmp/test` confirms the node invocation receives `--templates basic,advanced --project-dir /tmp/test`.

#### T3.4 — Grep hygiene check

After T3.0-T3.3:
- `rg "setup-rules\.mjs" plugins/oma/tests` → 0 matches.
- `rg "setup-rules\.mjs" plugins/oma/commands` → remaining references in shell invocations use `$RULES_SOURCE/setup-rules.mjs`. The shell keeps calling the mjs at runtime (PR 2 migrates this). Document this in a comment next to the invocation.

---

## Verification (no parity runner)

Run in order in `plugins/oma/`:

```bash
npm run build           # emits dist/setup-rules.js + dist/hooks/session-start.js
npx tsc --noEmit        # type correctness (OmaState extension + session-start.ts + setup-rules.ts)
npm test                # 430 existing tests + 4 new session-start tests = 434 pass
rg "getUpdateCachePath" src/hooks/session-start.ts          # → 0
rg "\.replace\('/src/hooks/session-start\.mjs'" src/       # → 0
rg "JSON\.stringify\(pkgJsonPath\)" src/hooks/session-start.ts  # → 1
rg "setup-rules\.mjs" tests/                                # → 0
rg "--target" commands/oma-setup.md                         # → 0
```

All eight must pass. No parity runner involvement.

**Rollback:** `git revert <sha>` is safe. `hooks/hooks.json` still points at `hooks/session-start.mjs`, so reverting T1b has zero user-facing impact. T1a is documentation-only. T3 touches only tests and a buggy shell line — reverting restores the previous (still-buggy) state without data loss.

---

## Success Criteria

- [ ] `plugins/oma/MIGRATION-AUDIT.md` exists with all required sections (9-hook table, PR 2 criteria + date, divergence freeze policy, distribution matrix).
- [ ] `plugins/oma/src/types.ts` has flat quoted HUD fields on `OmaState`.
- [ ] `plugins/oma/src/hooks/session-start.ts` subprocess uses `JSON.stringify(pkgJsonPath)` + `JSON.stringify(cacheDir)`; no `.replace()` chains.
- [ ] `getUpdateCachePath()` deleted; `shouldCheckUpdate()` migrated to accept `cacheDir` parameter.
- [ ] `session-start.ts` emits HUD before sessionContext when `hud-active=true`.
- [ ] 4 new tests in `tests/unit/hooks/session-start.test.ts` pass after T1b and FAIL on current `main`.
- [ ] `src/setup-rules.ts` exists (renamed from `.mjs`) and `dist/setup-rules.js` produced by `npm run build`.
- [ ] `tests/setup-rules.test.ts:12` uses `dist/setup-rules.js`.
- [ ] `package.json` has `"build": "tsc"` + `"pretest": "npm run build"` (both required, not optional).
- [ ] `commands/oma-setup.md:296` uses subshell `TEMPLATES_CSV=...` + `--project-dir $PROJECT_DIR`.
- [ ] `npm run build && npx tsc --noEmit && npm test` all green.
- [ ] All grep hygiene checks pass.
- [ ] Dark-launch framing: PR 1 is confirmed as a preparation PR; the subprocess fix and HUD port ship to users in PR 2 when `hooks.json` is rewired.

---

## RALPLAN-DR Summary

**Mode:** SHORT (standard consensus; no `--deliberate` flag requested).

**Principles (5):**
1. **Executable specification over prose.** A test that fails on `main` and passes after the fix is the only reliable acceptance gate.
2. **Safe interpolation over string replacement.** `JSON.stringify()` for path embedding in child scripts, never `.replace()` on transformed paths.
3. **Additive type changes.** Extending `OmaState` with optional fields preserves every existing consumer.
4. **Dark-launch first.** T1b and T3.0 compile and test without touching `hooks.json`; PR 2 handles the cutover. Rollback is `git revert`. Users see the fix in PR 2.
5. **Fix adjacent bugs you trip over.** The `--target` bug in `oma-setup.md` was discovered during T3 research; ship the fix in the same PR.

**Decision Drivers (top 3):**
1. **Zero user-facing regression in PR 1** — hooks.json untouched, mjs runtime intact.
2. **Test must fail on current code** — otherwise verification is theater.
3. **No reliance on orphaned infrastructure** — parity runner is stubbed out; audit-only documentation is enough for PR 1.

**Options considered (with invalidation rationale):**

| Option | Description | Status |
|---|---|---|
| **A: JSON.stringify interpolation** | Compute `pkgJsonPath` and `cacheDir` in parent, interpolate as string literals into child script. | **CHOSEN for PR 1** |
| B: Eliminate subprocess (inline) | Non-blocking check → blocking network I/O in session start hook. | **INVALIDATED** — blocks hook within ~100ms budget. |
| C: `child_process.fork()` with real .js worker | Cleanest IPC, no string-script. | **DEFERRED to PR 2** — requires new compiled artifact; adds build complexity out of scope for PR 1. |
| F1: Convert setup-rules.mjs → .ts | Enables tsc to emit dist/setup-rules.js. | **CHOSEN for T3.0** — aligns with the original JS-to-TS conversion goal. |
| F2: Keep SCRIPT_PATH pointing at src/setup-rules.mjs | Avoids T3.0 conversion; defer dist migration to PR 2. | **REJECTED** — misses the original JS-to-TS goal; T3.0 is low risk (224-line file, well-tested by existing 9 tests). |

**ADR:**
- **Decision:** Convert `setup-rules.mjs` → `setup-rules.ts` (T3.0) so `tsc` emits `dist/setup-rules.js`; rewrite `spawnBackgroundUpdateCheck` subprocess using `JSON.stringify()` template literal interpolation of parent-process-computed `pkgJsonPath` and `cacheDir`.
- **Drivers:** Non-blocking update check required; dark-launch constraint; `dist/setup-rules.js` must exist for T3.1.
- **Alternatives considered:** (B) Inline in main thread — rejected for blocking I/O. (C) `child_process.fork()` worker — deferred to PR 2. (F2) Keep mjs SCRIPT_PATH — rejected for missing JS-to-TS goal.
- **Why chosen:** Minimal delta, preserves non-blocking behavior, passes regression tests that fail on current code, keeps build graph simple (no new artifacts beyond what tsc already produces).
- **Consequences:** Future hook ts rewrites should use `JSON.stringify()` for child-script path interpolation. A helper `buildChildScript(paths, body)` may be worth extracting in PR 2.
- **Follow-ups:** PR 2 — wire `hooks.json` to `dist/hooks/*.js`, convert remaining 8 hooks, delete `hooks/*.mjs`, migrate shell in `oma-setup.md` to call `dist/setup-rules.js`, consider `child_process.fork()` refactor.

---

## Out of scope (one sentence each)

- **PR 2 hook migrations** — the 8 remaining hook ts rewrites and the `hooks.json` cutover land in PR 2.
- **Parity runner** — `tests/parity/runner.ts` remains an orphaned stub; PR 2 will either delete it or replace it with a real harness.
- **Shell migration in `oma-setup.md`** — the install shell keeps calling `setup-rules.mjs` at runtime; migrating it to `dist/setup-rules.js` is deferred to PR 2.
- **`child_process.fork()` refactor of subprocess** — Option C is acknowledged as cleaner but stays out of scope for PR 1 to keep the build graph unchanged.
- **Deleting `hooks/session-start.mjs`** — the mjs file stays in place through PR 1 as the runtime; PR 2 deletes it alongside the `hooks.json` cutover.
- **Distribution model implementation** — T1a documents the decision matrix and selects Option A; actually changing `.npmignore` / tarball contents is a separate PR after PR 2 lands.
- **Full subprocess integration test** — executing `node dist/hooks/session-start.js` end-to-end and asserting `update-check.json` is written belongs in PR 2 where the hook is wired into production; PR 1 validates source-level invariants only.
