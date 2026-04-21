# Architect Review: OMA Windows TypeScript Rewrite Plan

**Reviewer**: Architect agent
**Plan**: `.omc/plans/oma-windows-support-ralplan.md`
**Date**: 2026-04-04

---

## Summary

The plan is architecturally sound in its core direction -- TypeScript + Vitest + npm postinstall is the correct path for achieving Windows compatibility, 100% branch coverage enforcement, and compile-time type safety simultaneously. However, three structural tensions undermine confidence in the 100% branch coverage gate, the `postinstall`-as-distribution-model claim, and the `hooks.json` entry point swap. The plan underweights the behavioral delta introduced by replacing grep-based JSON extraction with `JSON.parse()`, and the `postinstall` lifecycle conflict with Principle 2 (zero runtime deps) is unresolved.

---

## Analysis

### What is architecturally sound

The decision to rewrite shell hooks in TypeScript targeting ESM `.mjs` is the right call for this codebase. The existing shell scripts (`delegation-enforce.sh:27-28`, `stop-gate.sh:31-32`, `approval-gate.sh:45-52`) all use fragile grep+sed patterns to extract values from JSON files -- a well-known antipattern. TypeScript's `JSON.parse()` with typed interfaces (`HookInput`, `HookOutput`, `OmaState` as defined in the plan's Step 2) is strictly superior for correctness.

The three-tier test pyramid (unit + integration + e2e) is appropriate. The original bats tests (492 lines in `e2e/oma-core-loop.bats`) conflate MCP server tests, manifest validation, YAML frontmatter checks, and hook behavioral tests into one layer. Splitting these into unit (pure functions), integration (stdin/stdout + file I/O), and e2e (subprocess spawn) layers is sound architecture.

The exclusion of `src/types.ts` and `src/utils.ts` from coverage thresholds (`vitest.config.ts` line 397 / Step 10 of the plan) is correct -- utility files have different coverage profiles than business-logic hooks.

### Strengths

1. **The `src/utils.ts` utility layer centralizes path operations** (Step 2: `normalizePath`, `resolveOmaDir`) which is the right place to handle `process.platform` checks (`plugins/oma/hooks/adr-enforce.sh:16-19` currently hardcodes `OMA_DIR="${OMA_DIR:-.oma}"` without platform-aware path resolution).

2. **The `isEnterpriseProfile()` helper** (Step 2) replaces the brittle `grep -o '"profile"[[:space:]]*:[[:space:]]*"[^"]*"'` pattern visible in every shell hook (`approval-gate.sh:28-29`, `delegation-enforce.sh:31`, `adr-enforce.sh:28`, etc.). This is a significant correctness improvement.

3. **Vitest E2E tests spawning compiled `.mjs` as subprocesses** (Step 13) is functionally equivalent to the current bats tests that spawn shell scripts, making the migration test-equivalent rather than test-divergent.

4. **The pre-mortem section** (page 698-705) identifies genuine risks: postinstall tsc failure, coverage gate blocking PRs due to unreachable error branches, and keyword-detect false positives. These are real concerns, not rubber-stamp risk tables.

5. **The MCP server (`mcp/state-server.mjs`) is explicitly out of scope** for this rewrite. The plan correctly focuses on the 7 hooks and defers MCP server TypeScript migration to a follow-up. This is disciplined scope management.

---

## Antithesis (Steelman Against Option A)

**The strongest argument for staying with shell + bats is not about the technology -- it is about the behavioral delta and the risk of introducing new bugs during the rewrite.**

The existing shell scripts, despite their grep+sed ugliness, have one critical property: they have been running in production. The bats tests (`e2e/oma-core-loop.bats:143-392`) exercise the actual hooks with real temp directories and verify exit codes. These tests have caught real regressions.

The TypeScript rewrite introduces a behavioral delta that the plan systematically underweights. Consider:

- **`approval-gate.sh:94-123`** uses grep-based pattern matching against JSON (`grep -qi '"type".*Security'`). The TypeScript rewrite (`approval-gate.ts` per Step 5) would use proper JSON structure access. These are not equivalent -- the shell version does substring matching against the full JSON blob; the TypeScript version navigates a typed object. Edge cases around JSON whitespace, key ordering, and nested structures will differ.

- **`cost-track.sh:57-68`** has a hand-rolled JSON array append using `sed`. The TypeScript rewrite (`cost-track.ts` per Step 7) using `JSON.parse()` + array push + `JSON.stringify()` is more correct but produces different whitespace and key ordering in the output `cost-log.json`. If other tools or scripts read this file, the format change is a breaking change.

- **`keyword-detect.sh:61-75`** does case-insensitive matching via `tr '[:upper:]' '[:lower:]'` and grep. The TypeScript equivalent using `.toLowerCase()` and `includes()` is semantically similar but handles Unicode differently. The plan's "Behavior parity" principle (Principle 1) does not account for this class of subtle behavioral drift.

**The 100% branch coverage gate is achievable for the happy paths but creates an unsustainable CI burden for error paths.** The plan's mitigation (R3: `vi.mock('fs')` for error-path tests) works in isolation but the plan also says `src/utils.ts` is excluded from coverage. What about error paths in the hooks themselves that use `fs`? For example, `writeJsonFile()` (Step 2) performing atomic-ish writes via temp file + rename -- the rename failure path (ENOSPC, EPERM, EIO) is not reliably triggerable in unit tests without deep fs mocking. The `/* v8 ignore */` escape hatch is acknowledged but not bounded -- without a clear definition of "acceptable uncovered lines," every contributor will use it, and the 100% gate becomes unenforceable in practice.

**The `postinstall` model is in tension with Principle 2 (zero runtime deps) from the first install onward**, not just at runtime. `npm install` runs `postinstall`, which runs `tsc`, which requires `typescript` to be in `node_modules`. On the first install, `typescript` IS a runtime dependency of the install process. The plan acknowledges this (R1) but frames it as a "postinstall compilation step" issue rather than a fundamental conflict with the stated principle. If `postinstall: tsc` fails, the plugin is not installed at all -- worse than having a runtime dep.

---

## Tradeoff Tensions

### Tension 1: `postinstall` distribution model vs. zero runtime deps principle

The plan states as a core requirement that compiled `.mjs` files must have no `node_modules` dependency (Principle 2, line 33). The chosen distribution mechanism (`postinstall: tsc`) requires `typescript` to be present during `npm install`. These are in direct conflict:

- **To achieve Principle 2**: ship pre-compiled `.mjs` in the npm tarball. TypeScript source never needs to run on the end user's machine.
- **To enable `postinstall: tsc`**: TypeScript source must be included and `typescript` must be installed during `npm install`.

The plan says (line 42): "precompiled `.mjs` files are included in the npm tarball" -- this resolves the conflict in favor of Principle 2, but then `postinstall: tsc` becomes redundant (it compiles what is already compiled). The `postinstall` would only run if the user installs from source (not from the tarball), which is an edge case. The tension is unresolved: if the `.mjs` files are precompiled in the tarball, `postinstall` is unnecessary. If they are not precompiled, Principle 2 is violated.

### Tension 2: 100% branch coverage gate vs. untestable error paths

The hooks perform file I/O, JSON parsing, and git command execution. Error paths for `fs.writeFileSync` (ENOSPC, EPERM, EIO), `JSON.parse()` on malformed input, and `git diff` failures (detached HEAD, no repo) are not reliably reproducible in unit tests. The plan offers `vi.mock('fs')` and `/* v8 ignore */` as mitigations (R3) but:

- `vi.mock('fs')` changes what is being tested -- you are testing the mock, not the actual behavior
- `/* v8 ignore */` is an escape hatch with no criteria for when it is acceptable to use
- The coverage threshold `perFile: true` (Step 10 / line 691) means one uncovered branch in one hook blocks the entire PR

The practical outcome is that contributors will either spend disproportionate time writing fs mocks to hit 100% or will liberally apply `/* v8 ignore */`, making the gate ceremonial rather than meaningful.

### Tension 3: Two `package.json` files vs. simplicity

The plan creates `plugins/oma/package.json` (authoritative for the Auggie plugin) and a root `package.json` (for npm distribution and dev ergonomics). This creates coordination overhead:

- TypeScript version must be synchronized in both (`"typescript": "^5.4.0"` appears in both per Steps 1 and 15)
- `npm install` at root vs. `npm install` in `plugins/oma/` may resolve different dependency trees
- The root `package.json` has `vitest` as a devDependency (Step 15) but the Auggie plugin consumers do not need Vitest

This tension is partially acknowledged (R5) but the mitigation ("use npm workspace or dedupe") adds tooling complexity that is not reflected in the implementation steps.

---

## Issues to Flag

### Issue 1: `hooks.json` entry points are not updated

The plan's AC12 (line 96) states "Hooks accept JSON via `readAllStdin()` and output JSON decision via `stdout.write()`" but nowhere does the plan update `plugins/oma/hooks/hooks.json` to point from `.sh` files to the new `.mjs` files. The current hooks.json (`plugins/oma/hooks/hooks.json:7,13,19,25,31,37,43`) references `${PLUGIN_ROOT}/hooks/session-start.sh`, `${PLUGIN_ROOT}/hooks/delegation-enforce.sh`, etc. The plan omits the `hooks.json` update entirely -- this is a critical gap. The hooks will be compiled but Auggie will still invoke the shell scripts.

### Issue 2: `git diff` on Windows (WSL vs. Git Bash vs. Cygwin)

The plan mentions `git diff --cached --name-only` in `adr-enforce.ts` (Step 6, line 269) and flags it in R6 ("detached HEAD"). But the plan does not address the fundamental Windows issue: `process.platform === 'win32'` does not distinguish WSL from Git Bash from Cygwin, and `git` on each of these has different path semantics:

- **WSL**: Git works with `/mnt/c/...` paths; Node.js sees POSIX paths
- **Git Bash**: Git works with `/c/...` paths; Node.js `path` module uses backslash by default
- **Cygwin**: Git works with `/cygdrive/c/...` paths

The `normalizePath()` utility in `src/utils.ts` (Step 2) is the right place to handle this, but the plan does not specify what `normalizePath()` actually does for each platform combination. Without this, `git diff --cached --name-only` in `adr-enforce.ts` will return paths in one format and Node.js path operations will use another, causing false negatives in `requiresAdr()`.

### Issue 3: The 100% branch coverage gate is not achievable as specified

The `coverage.exclude` in `vitest.config.ts` (Step 10, line 397) excludes `src/types.ts` and `src/utils.ts`. But `src/utils.ts` contains:

- `loadJsonFile<T>()` -- has try/catch around `fs.readFileSync`, `JSON.parse()` -- error path not coverable without mocking
- `writeJsonFile()` -- has error path (file write failure) -- not coverable without mocking
- `readAllStdin()` -- reads from `process.stdin` -- stdin error path is environment-dependent

The plan says (AC5, line 89): "100% branch coverage on hook logic" and defines "hook logic" as `src/hooks/*.ts`. If `src/utils.ts` is excluded, the utility error paths are not counted. However, the hooks import and call these utility functions. When coverage is measured per-file, `src/utils.ts` is excluded, but its error paths are exercised inside the hooks. The V8 coverage provider will report these lines as "not covered" because the actual `fs` calls inside utils are excluded.

**Specific uncovered branches**: In `loadJsonFile()`, if `fs.readFileSync` throws (corrupted file), the `catch` returns `null`. This catch branch is exercised by integration tests writing corrupted JSON, but the V8 coverage provider may report it as uncovered depending on how the test exercises it. Without explicit `vi.mock('fs')` to force the throw, this branch is untestable.

### Issue 4: `approval-gate.sh` approval expiry check is a no-op

The existing `approval-gate.sh:104-110` has a `date` command that runs but is never actually used to check approval expiry -- the comment says "A full implementation would parse JSON and check expiry." The TypeScript rewrite (Step 5, line 239) proposes `hasValidApproval(path, required)` which should include expiry checking. However, the equivalence classes in the plan's unit test section (Step 5, line 254) include "expired approval" as a test case but do not define the expiry format (ISO date? Unix timestamp?) or the tolerance (is "just expired" treated as valid or invalid?). This gap will cause test implementation disputes.

### Issue 5: Shellcheck is not a valid proxy for TypeScript coverage

The plan removes the `shellcheck` CI job (Step 14) and replaces it with Vitest coverage. This is a reasonable trade for the hooks themselves, but shellcheck also validates shell scripts for correctness properties that TypeScript does not cover:

- **Subshell variable leak**: `bash` variable assignments in subshells don't leak, but in TypeScript, `let`/`const` scope is lexical. This is not an issue for the rewrite, but removing shellcheck means the (retained) shell scripts in the repo lose lint coverage.
- **Argument injection**: Shell scripts using unquoted variables are vulnerable to word-splitting. The shell scripts in the repo are being retained (MCP server, e2e bats tests) and will no longer be checked by CI.

The plan says "TypeScript coverage supersedes shell linting" (Step 14, line 487) but this is only true for the hooks being rewritten. The repo still has shell scripts (the MCP `package.json` at `plugins/oma/mcp/package.json`, bats test helpers, etc.).

### Issue 6: CI matrix vs. the plan's cross-platform claims

The plan says (Step 10 / CI matrix, line 696): "Run on `ubuntu-latest`, `windows-latest`, and `macos-latest` for the E2E suite." But the current CI (`ci.yml:21-43`) only runs on `ubuntu-latest`. The plan proposes adding a Windows-native CI job but does not specify:

- Whether this is a separate job or a matrix expansion
- Whether `windows-latest` in GitHub Actions runs WSL, PowerShell, or cmd
- How the `OMA_DIR` temp directory is handled on Windows (the bats tests use `mktemp` which is Unix-only)

The `spawnHook()` helper in Step 13 uses `execa('node', [...])` which works on Windows, but the temp directory setup (`mktemp -d` is Unix-only in the original bats tests at `e2e/oma-core-loop.bats:22-26`) would need a cross-platform replacement (Node's `os.tmpdir()` or Vitest's built-in temp dir handling).

---

## Consensus Addendum (ralplan review)

### Antithesis (steelman)

**The strongest argument for Option B (pure bash) is that the behavioral delta of the TypeScript rewrite will introduce bugs that the 100% branch coverage gate cannot catch.** The existing shell scripts have 492 lines of bats test coverage and have been running against real codebases. The TypeScript rewrite, however carefully typed, changes the JSON extraction semantics (grep-based substring matching vs. structured parsing), the date/time handling (shell `date` command with Unix timestamp fallback vs. `Date` API), the file enumeration (`grep -c .` vs. `split('\n')`), and the keyword matching (`tr | grep` vs. `toLowerCase().includes()`). Each of these changes can silently alter behavior on edge cases (Unicode in file paths, non-standard date formats, empty files, CRLF line endings on Windows). The 100% branch coverage gate covers the code paths that are written -- it does not verify that the written code has the same semantics as the original. A 100% covered incorrect implementation is worse than a partially-covered correct one, because the coverage report gives false confidence.

### Tradeoff Tension

**The tension between "zero runtime deps in compiled output" (Principle 2) and "precompiled `.mjs` in the npm tarball" (Distribution model) cannot be resolved without choosing one as the authoritative constraint.** If precompiled `.mjs` ships in the tarball, `postinstall: tsc` never runs for end users and becomes dead code in the distribution. If `postinstall: tsc` is the intended mechanism, then TypeScript must be in the tarball and compiled on install, violating Principle 2. The plan needs to commit to one: either the `.mjs` files are pre-compiled artifacts (in which case remove `postinstall` and add a `prepare` script for development only), or they are compiled at install time (in which case Principle 2 must be reframed as "zero runtime deps in production use, after `postinstall` completes").

### Synthesis

**Resolution path**: Ship precompiled `.mjs` in the npm tarball (satisfies Principle 2) and keep `postinstall: tsc` as a development guard only (fails the build if source and compiled output are out of sync). Add `prepare: tsc` as the developer-facing script (runs on `npm install` during development) and remove `postinstall` from the published package manifest using `npm config set ignore-scripts false` carefully or by not including `postinstall` in the published `package.json` fields. Alternatively, use a `prepare` script in the root `package.json` for dev ergonomics and let the CI build produce the tarball artifact.

For the coverage gate: adopt a **functional coverage model** instead of branch coverage. Define a coverage matrix of equivalence classes (per the Expanded Test Plan section, page 594-608) and gate on those classes being covered, not on V8 branch coverage. V8 branch coverage is a proxy metric that is achievable but unreliable for error paths. The equivalence class coverage model is more meaningful: "for `approval-gate`, the test suite must contain at least one test for each row in the equivalence class table" -- this is enforceable, human-readable, and does not require fs mocking.

For the `hooks.json` gap: update `hooks.json` in Step 1 (scaffold) as part of the infrastructure work, changing `${PLUGIN_ROOT}/hooks/{name}.sh` to `${PLUGIN_ROOT}/hooks/{name}.mjs` for all 7 hooks. This is a prerequisite for any hook to actually run the TypeScript version.

### Principle Violations (deliberate mode)

1. **Incremental change over big bang** (implied by the brownfield rewrite nature): The plan deletes all 7 shell scripts and all bats tests atomically. If the TypeScript implementations have subtle behavioral differences, they are all deployed simultaneously. A phased migration (one hook at a time, keeping shell scripts as fallback) would be safer but is not proposed.

2. **Evidence over assumptions**: The plan assumes 100% branch coverage is achievable and meaningful (AC5) without presenting evidence that error paths (ENOSPC, EPERM, malformed JSON) can be covered in Vitest without brittle mocking. The plan acknowledges this risk (R3) but does not provide a criteria for when `/* v8 ignore */` is acceptable, making the coverage gate aspirational rather than enforced.

---

## Recommendations

1. **[CRITICAL] Add `hooks.json` update to Step 1** -- Without this, the compiled `.mjs` files are never invoked by Auggie. The `hooks.json` entry points must be updated from `.sh` to `.mjs` as part of the infrastructure scaffold.

2. **[HIGH] Define `normalizePath()` behavior for WSL, Git Bash, and Cygwin explicitly** -- The plan's `normalizePath()` utility is the right abstraction but must specify how `process.platform` maps to path normalization behavior. WSL Git returns POSIX paths; Git Bash Git returns Windows paths that Node.js `path` may mishandle. A concrete implementation strategy is needed before Step 6 (adr-enforce) which uses `git diff`.

3. **[HIGH] Replace 100% branch coverage with equivalence class coverage** -- Define each hook's equivalence classes as the coverage gate (per the Expanded Test Plan tables), not V8 branch coverage. This is enforceable, meaningful, and does not require fs mocking for error paths. V8 coverage can be reported as informational (`branches: 80` as a target, not a blocker).

4. **[MEDIUM] Clarify the `postinstall` lifecycle** -- Decide: are `.mjs` files precompiled in the tarball (Principle 2 satisfied, `postinstall` is dev-only), or are they compiled at install time (Principle 2 violated during install)? Choose one and update Principle 2 or the distribution model accordingly. Removing `postinstall` from the published tarball and using `prepare` for dev ergonomics resolves the conflict cleanly.

5. **[MEDIUM] Add a phased migration strategy** -- Instead of deleting all shell scripts atomically, keep the `.sh` files in the repo as a shadow layer. One hook at a time: write TypeScript, verify behavioral equivalence with the existing bats tests, update `hooks.json`, remove the `.sh` file. This reduces the risk of the behavioral delta problem described in the antithesis.

6. **[MEDIUM] Define approval expiry format** -- The current `approval-gate.sh` does not implement expiry checking (no-op at `approval-gate.sh:104`). The TypeScript rewrite must decide: ISO 8601 timestamps with tolerance? Unix epoch with a clock-skew window? Define this before implementing `hasValidApproval()`.

7. **[LOW] Keep shellcheck for retained shell scripts** -- The bats tests (`e2e/oma-core-loop.bats`) and any shell helper scripts should still be shellchecked. Removing the `shellcheck` CI job entirely means these files lose lint coverage.

---

## References

- `plugins/oma/hooks/adr-enforce.sh:16-54` -- current `git diff` implementation that needs Windows path normalization in TypeScript rewrite
- `plugins/oma/hooks/approval-gate.sh:94-126` -- grep-based approval checking; expiry check is a no-op (line 104-110 comment confirms)
- `plugins/oma/hooks/delegation-enforce.sh:27-44` -- grep+sed JSON extraction replaced by `JSON.parse()` in TypeScript
- `plugins/oma/hooks/stop-gate.sh:31-37` -- same grep+sed pattern; `grep '"agent":"oma-architect"'` uses substring matching
- `plugins/oma/hooks/keyword-detect.sh:61-75` -- `tr | grep` keyword matching; Unicode handling differs from `toLowerCase().includes()`
- `plugins/oma/hooks/cost-track.sh:57-68` -- hand-rolled JSON append; whitespace/ordering changes in TypeScript rewrite may break consumers
- `plugins/oma/hooks/hooks.json:7,13,19,25,31,37,43` -- all 7 hooks reference `.sh` files; not updated in plan
- `plugins/oma/mcp/state-server.mjs:9` -- hardcoded `OMA_DIR = '.oma'` (same pattern used in hooks); cross-platform path handling needed
- `.github/workflows/ci.yml:21-56` -- current CI only runs on `ubuntu-latest`; Windows CI not present
- `e2e/oma-core-loop.bats:22-26` -- uses `mktemp` (Unix-only) for per-test temp directories; needs cross-platform replacement in Vitest

---

## Revision 2 Review

**Reviewer**: Architect agent
**Plan**: `.omc/plans/oma-windows-support-ralplan.md`
**Date**: 2026-04-04
**Revision**: Addressing architect-review.md + critic-review.md findings

---

### CRITICAL Issues: Resolution Status

#### 1. hooks.json update (architect Issue 1, critic CRITICAL-1) -- RESOLVED

The plan now explicitly addresses this in two places:

- **Step 1 (lines 155-166)**: Dedicated sub-section titled "Update `plugins/oma/hooks/hooks.json`" as part of the scaffold step. Provides the concrete sed command to change `${PLUGIN_ROOT}/hooks/{name}.sh` to `.mjs` for all 7 hooks, with verification via `grep '\.sh' plugins/oma/hooks/hooks.json` returning zero results.

- **Step 15 / CI (lines 689-699)**: CI step 0 in `.github/workflows/ci.yml` updates hooks.json as a pre-test step with the same verification. This ensures that even if someone runs tests locally without running Step 1 first, CI will catch any stale entry points.

- **AC10 (line 132)**: Formalized as an acceptance criterion with the grep verification as the pass condition.

This is a complete fix. The hooks will be invoked from `.mjs` entry points in CI and in the committed state.

#### 2. Behavioral parity (architect Tension 2, critic CRITICAL-2) -- RESOLVED

The plan now includes a full behavioral parity test infrastructure:

- **Step 14 (lines 608-684)**: `tests/parity/runner.ts` implements `runParity()` using `execFileSync('bash', [shellScript])` and `execFileSync('node', [tsBinary])` with identical stdin + OMA_DIR environment, asserting identical exit codes and trimmed stderr. This is exactly the output-equivalence test the critic requested.

- **AC9 (line 132)**: Explicit acceptance criterion: `tests/parity/` runs both implementations with identical inputs and asserts identical outputs.

- **Parity tests gate deletion**: The plan explicitly states (line 675): "A hook's shell script is deleted only in the PR that adds its parity tests and demonstrates identical outputs." This addresses the critic's concern about atomic deletion with no regression safety net.

- **Documented divergences**: The plan honestly documents where parity is not expected (cost-track JSON format, keyword-detect Unicode, approval-gate expiry as a new feature) with rationale and stakeholder acknowledgment. This is better than pretending all divergences are regressions.

This is a complete fix. The plan now substantiates Principle 1 ("Behavior parity over syntax equivalence") with actual test infrastructure.

#### 3. postinstall vs. prepare (architect Tension 1, critic CRITICAL-3) -- RESOLVED

The contradiction is cleanly resolved:

- **Requirements Summary (line 16)**: "committed precompiled `.mjs` files in `dist/`; npm tarball ships precompiled output only (no `postinstall`)"
- **Step 1 (line 149)**: `plugins/oma/package.json` has `scripts.prepare = tsc`; no `postinstall` script
- **Step 15 (line 746)**: Root `package.json` has `prepare` script
- **Decision Driver 3 (line 43)**: `prepare` handles dev-time compilation on contributor machines only; end users get precompiled output
- **Principle 2 (line 34)**: "Compiled `.mjs` files must have no `node_modules` dependency" -- satisfied because `.mjs` ships precompiled

This resolves the architect's synthesis: precompiled `.mjs` in the tarball (satisfies Principle 2) + `prepare` for dev ergonomics. The `postinstall` lifecycle contradiction is gone.

#### 4. Windows CI matrix (architect Issue 6, critic CRITICAL-4) -- RESOLVED

The plan correctly retreats from claiming `windows-latest` CI:

- **Step 15 (lines 719-722)**: Explicitly states: "Windows CI claim removed -- `windows-latest` in GitHub Actions runs PowerShell, not bash." Acknowledges this honestly rather than papering over it.
- **Rationale (lines 720-721)**: Ubuntu job with cross-platform code review and parity tests serves as the authoritative verification mechanism, since TypeScript `.mjs` files are platform-agnostic and `normalizePath()` + `path.resolve()` handle path differences.
- **ADR (line 829)**: Follow-up item to evaluate adding a Windows-native CI job via WSL runner.

This is the correct call. Claiming `windows-latest` without specifying bash + Node.js setup would have been a CI gap. The plan honestly defers Windows-native CI rather than over-promising.

---

### MAJOR Issues: Resolution Status

#### 5. 95% coverage threshold with bounded v8 ignore (architect Issue 3, critic MAJOR-1) -- PARTIALLY RESOLVED

The plan drops from 100% to 95% and defines bounded `/* v8 ignore */` categories:

- **Vitest config (lines 524-527)**: `branches: 95`, `lines: 95`, `statements: 95`, `functions: 100`. The `perFile: true` setting means one hook below threshold blocks all PRs -- this is strict but consistent.

- **Bounded categories (lines 542-547)**: Four specific allowed categories with non-empty reason requirements: `unreachable: handled by upstream guard`, `error: fs error path not reproducible in tests`, `platform: only runs on non-Windows`, `git: only runs when git is available`. PR review verifies each justification.

- **Remaining concern**: 95% with `perFile: true` means one uncovered catch block in one hook blocks all PRs. The critic's concern about contributors liberally applying `/* v8 ignore */` is partially mitigated by the PR review gate, but the categories are broad enough that "fs error path not reproducible in tests" could justify almost any fs error branch. This is acceptable risk given the PR review requirement -- the 95% threshold is achievable and the ignore categories are reviewed. The pre-mortem (line 950) acknowledges the coverage gate failure scenario, which is honest.

**Verdict**: Acceptable. The 95% threshold is realistic; the ignore categories provide structure; PR review is the human backstop.

#### 6. Option B factual correction (architect MAJOR-2 concern, critic MAJOR-2) -- RESOLVED

- **Option B invalidation (lines 66-69)**: Explicitly corrects the factual error: "bats-core IS officially supported on Windows via MSYS2 and Git Bash. The real invalidation is not tooling availability -- it is the absence of coverage tooling." The single strong reason (no branch coverage tooling for shell) is now the primary argument.

**Verdict**: Option B is now fairly represented.

#### 7. Approval expiry format (architect Issue 4, critic MAJOR-3) -- RESOLVED

- **ApprovalRecord type (lines 83-96)**: `expires?: string` with ISO 8601 format (`YYYY-MM-DDTHH:mm:ssZ`)
- **Expiry semantics (lines 92-96)**: 5-minute clock-skew tolerance; missing `expires` = never expires; explicit note that the shell script's expiry check was a no-op and TypeScript is the first functional implementation.
- **isApprovalExpired implementation (lines 232-238)**: Code with CLOCK_SKEW_TOLERANCE_MS constant
- **Equivalence classes (lines 364, 359)**: Expired approval, within clock-skew tolerance, missing expiry field all have test coverage

**Verdict**: Complete. Format, tolerance, and fallback are all defined.

#### 8. normalizePath specification (architect Issue 2, critic MAJOR-4) -- RESOLVED

- **Dedicated section (lines 100-113)**: Full `normalizePath()` specification with concrete behavior:
  - Always: `path.resolve(p)` -- no detection, no translation, no MSYS/CYGWIN prefix handling
  - WSL (`linux`): no translation needed
  - Git Bash (`win32`): `path.resolve()` returns backslash paths which work correctly on Git Bash
  - What NOT to do: do NOT attempt to detect and translate MSYS/CYGWIN prefixes
  - Unit tests: relative, Git Bash, POSIX, WSL paths all specified
- **adr-enforce usage (line 395)**: Explicit note that paths from `git diff` are normalized via `normalizePath()` before pattern matching

**Verdict**: Complete. The `path.resolve()` simplicity is the right call -- trying to detect and translate path prefixes would be more brittle than trusting Node's built-in resolution.

---

### New Concerns

#### NC-1: isGitAvailable() uses `command -v` on Unix, `where` on Windows

The `isGitAvailable()` function (Step 2, line 228) is specified as using `command -v` on Unix and `where` on Windows. This is technically cross-platform, but both shells (bash on WSL/Git Bash) support `command -v`. Using `where` on a Windows `cmd` shell is unnecessary since the target is WSL/Git Bash (not native Windows). This is minor -- `command -v` works in Git Bash and WSL bash. The function should probably just use `command -v` unconditionally in the bash shell context.

**Severity**: LOW. The function will work correctly in the target environments (WSL, Git Bash).

#### NC-2: CRLF handling is addressed in the plan

The critic raised CRLF handling on Windows (the original bats tests use `printf '%s'` which handles CRLF correctly). The `readAllStdin()` function in `src/utils.ts` (line 219) explicitly "normalizes CRLF to LF before JSON parsing." This is addressed.

---

### Verdict on Critical Issues

**All 4 CRITICAL issues are RESOLVED.** The plan is now structurally sound:

1. **hooks.json**: Explicitly updated in Step 1 and as CI step 0 with verification
2. **Behavioral parity**: Full `tests/parity/` infrastructure with `runParity()` runner, gating shell script deletion on parity demonstration
3. **prepare vs. postinstall**: Cleanly resolved -- precompiled output in tarball, `prepare` for dev-time only
4. **Windows CI**: Honestly deferred rather than over-promised; Ubuntu job + cross-platform code is the correct verification mechanism for WSL/Git Bash targets

The remaining MAJOR issues are either fully resolved or at acceptable risk levels with mitigations in place.

**Confidence in approval for execution**: HIGH. The plan should be approved with the understanding that the `/* v8 ignore */` categories will be refined during PR review as actual uncovered error paths are encountered.

*Revision 2 review completed: 2026-04-04*
