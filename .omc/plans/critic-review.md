# Critic Review: OMA Windows TypeScript Rewrite Plan

**Reviewer**: Critic agent
**Plan**: `.omc/plans/oma-windows-support-ralplan.md`
**Architect Review**: `.omc/plans/architect-review.md`
**Date**: 2026-04-04
**Mode**: THOROUGH (escalated to ADVERSARIAL after CRITICAL findings confirmed)

---

## Pre-commitment Predictions

Before reading the plan, based on the domain (brownfield TypeScript rewrite of shell hooks) and the architect's prior review, I predicted the following problem areas:

1. **Behavioral delta between shell grep-based parsing and TypeScript JSON.parse()** -- I expected this gap to be unaddressed, since the plan claims "behavior parity" as a principle but tests only the new implementation.
2. **hooks.json not updated** -- The plan omits updating the entry points from `.sh` to `.mjs`. I flagged this as CRITICAL based on the architect's review and verified it independently.
3. **100% branch coverage gate is unachievable for error paths** -- The plan acknowledges this (R3) but the escape hatch (`/* v8 ignore */`) is unbounded and undermines the gate.
4. **postinstall lifecycle conflict with zero-runtime-deps principle** -- The plan claims both but they cannot both be true simultaneously.
5. **Option B straw-manned** -- MSYS2 bats support on Windows is more viable than the plan acknowledges, especially given Git Bash's built-in bats compatibility in modern versions.

**Verification against predictions**: All 5 predicted issues were confirmed. The plan additionally has 4 more CRITICAL/MAJOR gaps that I did not predict.

---

## VERDICT: REVISE

The plan has a solid structural direction (TypeScript + Vitest + npm) and correctly identifies the core problem (Windows compatibility + coverage enforcement), but it has 4 CRITICAL findings that will cause execution to fail or produce wrong results, plus 4 MAJOR findings that require significant rework. The plan cannot be approved for execution in its current form.

---

## Overall Assessment

The plan is well-structured in its TypeScript architecture, test pyramid design, and risk identification. However, it has a critical gap (hooks.json entry points not updated), an unresolved distribution contradiction (precompiled tarball vs. postinstall tsc), behavioral parity is asserted but not tested, the coverage gate is aspirational rather than enforceable, and Option B is treated as trivially dismissible rather than genuinely considered. None of these issues are cosmetic -- each will cause either execution failure or a regression in production behavior.

---

## Critical Findings (blocks execution)

### CRITICAL-1: `hooks.json` entry points not updated -- hooks will never run

**Evidence**: `plugins/oma/hooks/hooks.json` lines 7, 13, 19, 25, 31, 37, 43 all reference `${PLUGIN_ROOT}/hooks/{name}.sh`. The plan has zero references to `hooks.json` in any step. AC12 says "Hooks accept JSON via readAllStdin()" but does not mention that Auggie reads `hooks.json` to find which file to execute.

The architect raised this in Issue 1. The plan's rebuttal is missing -- hooks.json is not even in the same directory as the hooks, and the plan never creates or modifies it.

**Confidence**: HIGH

**Why this matters**: The entire TypeScript rewrite compiles successfully, CI passes at 100% branch coverage, but Auggie still invokes the original `.sh` files because `hooks.json` is the entry point manifest. All 7 hooks are dead code. This is the single most likely execution failure.

**Fix**: Add a step (or sub-step in Step 1) that creates/updates `plugins/oma/hooks/hooks.json` to change all 7 `command` fields from `${PLUGIN_ROOT}/hooks/{name}.sh` to `${PLUGIN_ROOT}/hooks/{name}.mjs`. Verify with: `grep '\.sh' plugins/oma/hooks/hooks.json` returns zero results.

---

### CRITICAL-2: Behavioral parity is claimed but never tested against original shell scripts

**Evidence**: Principle 1 (line 32) says: "The TypeScript hooks must pass the same test cases the shell scripts pass today -- not just compile cleanly." But the entire test strategy (Steps 11-13, Expanded Test Plan, E2E table at line 642-655) tests only the new TypeScript implementation. There is not a single verification step that runs the original shell scripts against the same inputs and compares outputs.

The bats tests in `e2e/oma-core-loop.bats` test the shell scripts directly (lines 144-198), but the plan's E2E tests (Step 13) spawn `node dist/hooks/*.mjs` -- they never run the original `.sh` files as a reference implementation.

The plan's E2E coverage table at line 642-655 shows rows like "Hook: delegation-enforce blocks Edit when mode active" -- but this only tests the new TypeScript code. The original shell script is not used as a golden reference.

**Specific behavioral deltas not caught by new tests alone**:
- `approval-gate.sh:113-114` uses `grep -qi '"type".*Security'` which is substring matching against the full JSON blob. The TypeScript version navigates typed object fields. Edge case: if an approval record has `"type":"Security"` but inside a nested object or array, the grep will find it but the TypeScript typed access will not.
- `cost-track.sh:57-68` uses sed-based JSON append that produces different whitespace/key ordering than `JSON.stringify()` + array push. The plan's `cost-track.ts` (Step 7) will produce different `cost-log.json` format -- but no test compares the actual file output.
- `keyword-detect.sh:61` uses `tr '[:upper:]' '[:lower:]'` which handles Unicode character classes differently from TypeScript's `.toLowerCase()`. Input `"DON'T STOP"` vs `"don't stop"` vs `"Dont Stop"` may behave differently.
- `stop-gate.sh:32` uses `grep '"agent":"oma-architect"'` -- substring match on exact string. If the JSON has whitespace variation, the grep still matches. TypeScript's `JSON.parse()` + strict field access does not.

**Confidence**: HIGH

**Why this matters**: The plan's single most important quality claim -- "behavior parity over syntax equivalence" -- is unsubstantiated. The tests prove the TypeScript code is internally consistent, but they do not prove it behaves identically to the original. This is the antithesis problem that the architect raised and the plan did not address.

**Fix**: Add a behavioral parity test suite that runs both the original shell scripts and the new TypeScript implementations with identical inputs, captures stdout/stderr/exit codes, and asserts they match. This can be implemented as a `tests/parity/` directory with shell-script reference implementations run via `bash`. Alternatively, keep the original bats tests as a regression suite alongside the new Vitest tests until parity is proven.

---

### CRITICAL-3: postinstall lifecycle contradiction is unresolved

**Evidence**: The plan simultaneously claims:
- Principle 2 (line 33): "Compiled `.mjs` files must have no `node_modules` dependency."
- Decision Driver 3 (line 42): "precompiled `.mjs` files are included in the npm tarball."
- AC10 (line 94): `postinstall: tsc` runs on every `npm install`.

These are mutually exclusive. If `.mjs` files are precompiled in the tarball, `postinstall: tsc` is never needed by end users (it would just recompile identical files). If `postinstall: tsc` runs on every install, then TypeScript must be in the tarball and compiled on the user's machine -- violating Principle 2.

The architect identified this as Tension 1 and proposed a resolution: ship precompiled `.mjs` in the tarball (satisfies Principle 2), use `prepare` for development only, and remove or document `postinstall` as a no-op for published packages. The plan does not adopt or reject this resolution.

**Confidence**: HIGH

**Why this matters**: This affects the distribution model for the entire project. If the intent is to ship precompiled hooks, `postinstall: tsc` should be replaced with `prepare: tsc` (only runs during `npm install` on the developer's machine, not on `npm install @r3dlex/oh-my-auggie` by end users). If the intent is to compile at install time, Principle 2 must be reframed.

**Fix**: Choose one. The cleaner choice: use `prepare` instead of `postinstall`, add `.npmignore` excluding `src/` from the published tarball, and document that Principle 2 means "zero runtime dependencies after the package is installed." Update Principle 2 accordingly. Step 1's `package.json` creation must reflect this choice explicitly.

---

### CRITICAL-4: Windows CI matrix (`windows-latest`) is not feasible as described

**Evidence**: Step 10 (line 696) says CI should run on `ubuntu-latest`, `windows-latest`, and `macos-latest`. The Expanded Test Plan (line 696) repeats this. However:

1. The plan's E2E tests use `spawn('node dist/hooks/*.mjs')` which requires Node.js on Windows. GitHub Actions `windows-latest` runs PowerShell/cmd by default, not a bash shell with Node.js pre-installed.
2. The bats tests use `mktemp -d` (Unix-only) for per-test temp directories (bats file lines 22-26). The Vitest replacement would need `os.tmpdir()` or Vitest's built-in temp dir handling -- but the plan never specifies this.
3. The plan explicitly says bats tests are "being replaced" (Requirements Summary line 15), but the E2E test spawn approach requires a bash-compatible environment on Windows. Git Bash on `windows-latest` in GitHub Actions is not a standard runner configuration -- it requires extra setup.

The current CI (`.github/workflows/ci.yml:21-56`) only runs on `ubuntu-latest`. The plan proposes expanding to Windows but does not provide the GitHub Actions configuration.

**Confidence**: HIGH (for the contradiction); MEDIUM (for whether GitHub Actions windows-latest can run Node + bash scripts -- it can if bash is installed, but the plan doesn't specify the setup).

**Why this matters**: The Windows CI expansion is cited as a key verification step for cross-platform correctness (AC13, R2 mitigation). If it is not feasible as described, the plan lacks the most important Windows verification mechanism.

**Fix**: Either (a) remove the `windows-latest` CI expansion from the plan (rely on WSL/Git Bash on `ubuntu-latest` with cross-platform code reviews instead), or (b) specify the GitHub Actions setup needed for `windows-latest` with Node.js + bash (e.g., `actions/setup-node` + a bash installation step). The plan cannot claim "Windows CI" without specifying what that means.

---

## Major Findings (causes significant rework)

### MAJOR-1: 100% branch coverage gate is unenforceable as specified

**Evidence**: R3 (line 537) acknowledges: "100% branch coverage is unachievable for some error paths." The mitigation is `vi.mock('fs')` and `/* v8 ignore */`. But the plan provides zero criteria for when `/* v8 ignore */` is acceptable. The `perFile: true` threshold (Step 10 / line 691) means one uncovered catch block in one hook blocks all PRs.

More specifically: `src/utils.ts` is excluded from coverage (Step 10 line 397), but hooks import and call utility functions. When `loadJsonFile()` is called and `fs.readFileSync` throws, the catch branch is exercised. Without explicit `vi.mock('fs')` to force the throw, this branch is not covered. The V8 coverage provider will mark it as uncovered -- and since `src/utils.ts` is excluded, these lines are not counted toward the threshold, but any catch blocks inside hook files (e.g., a try/catch around `git diff` in `adr-enforce.ts`) are counted and will fail.

**Confidence**: HIGH

**Why this matters**: This is the most likely CI blocker post-implementation. Contributors will either spend disproportionate time writing fs mocks or liberally apply `/* v8 ignore */` until the gate is ceremonial.

**Fix**: The architect's recommendation (HIGH priority) is sound: replace 100% V8 branch coverage with equivalence class coverage. Define each hook's equivalence classes as the gate ("for `approval-gate`, there must be at least one test for each row in the equivalence class table"), and set V8 branch coverage as informational (reported but not blocking). This is enforceable, human-readable, and does not require fs mocking.

---

### MAJOR-2: Option B (Pure Bash + MSYS2) is not treated fairly

**Evidence**: Option B's invalidation rationale (lines 65-69) contains two factually incorrect claims:

1. "bats on Windows via Git Bash is unreliable and not officially supported" -- bats-core explicitly supports Git Bash on Windows. The bats test file (`e2e/oma-core-loop.bats`) uses standard POSIX shell features that work in Git Bash. The bats-core README lists Git Bash as a supported environment.

2. "MSYS2 path translation in CI requires extra GitHub Actions configuration and is brittle" -- The plan proposes `windows-latest` in the CI matrix (Step 10 / line 696) which also requires extra configuration. Git Bash on `windows-latest` in GitHub Actions requires essentially the same setup as any Windows Node.js job. The effort difference is not as large as the plan implies.

The real reason Option B fails is not covered: shell scripts cannot achieve 100% branch coverage enforcement. But the plan buries this valid reason under two weaker claims, which weakens the overall decision quality.

**Confidence**: HIGH (for the factual inaccuracy about bats on Git Bash); MEDIUM (for the MSYS2 effort claim -- it is harder than Linux, but the plan overstates this).

**Why this matters**: A decision built on weak arguments is vulnerable to challenge. If a reviewer or stakeholder pushes back on Option A's complexity, the plan's rejection of Option B can be undermined by pointing out the incorrect factual claims.

**Fix**: Remove the bats unreliability claim and the MSYS2 brittleness claim. Replace with the single strong reason: "Shell scripts cannot achieve 100% branch coverage enforcement -- no equivalent to Vitest's V8 coverage provider exists for bash." This is a technical constraint, not a tooling claim that can be disproved.

---

### MAJOR-3: Approval expiry format is undefined -- will cause implementation disputes

**Evidence**: `approval-gate.sh:104-110` has a `date` command that runs but the comment explicitly says it is a no-op: "A full implementation would parse JSON and check expiry." The plan's Step 5 says `hasValidApproval(path, required)` should include expiry checking and lists "expired approval" as an equivalence class (Step 5 line 254), but never specifies:

- The expiry field format in `approvals.json` (ISO 8601? Unix epoch?)
- The tolerance window (is "just expired" valid or invalid? Clock skew handling?)
- The fallback if the expiry field is missing (treat as valid? invalid?)

This gap will cause implementation disputes and divergent implementations across contributors.

**Confidence**: HIGH

**Why this matters**: The plan will be executed by multiple contributors. Without a defined expiry format, each implementer will make a different choice, producing inconsistent behavior.

**Fix**: Define the expiry format in Step 5's "Key typed helper functions" section. Recommended: ISO 8601 timestamps with a 5-minute clock-skew tolerance, treating missing expiry fields as "never expires" (current shell behavior).

---

### MAJOR-4: `normalizePath()` utility is undefined for WSL/Git Bash path semantics

**Evidence**: The plan references `normalizePath()` in Step 2 (line 160) as the cross-platform path abstraction and cites it as the mitigation for R2 (Windows path issues). But the plan never specifies what `normalizePath()` actually does for WSL vs. Git Bash vs. Cygwin paths.

Specifically for `adr-enforce.ts` (Step 6, line 269): `git diff --cached --name-only` returns paths in the shell environment's format. On WSL, these are POSIX paths (`/home/user/project/src/file.ts`). On Git Bash, these are `/c/Users/...` style paths. On Cygwin, these are `/cygdrive/c/Users/...`. The TypeScript `path` module uses backslash conventions on Git Bash.

The plan says AC13 verifies cross-platform behavior by "running on Git Bash (Windows)" -- but Step 14's CI update does not include a Git Bash job, and the expanded test plan (line 696) says `windows-latest` but does not specify Git Bash.

**Confidence**: HIGH

**Why this matters**: `adr-enforce.ts` will silently produce incorrect results on Windows if the git path format does not match the Node.js path expectations.

**Fix**: Define `normalizePath()` behavior in Step 2: use `path.resolve()` to convert any path format to an absolute path in the Node.js process's native format. For WSL, no translation needed. For Git Bash, detect `/c/` prefix and convert to `C:\`. Document this behavior explicitly and add unit tests for each path format.

---

## Minor Findings

1. **Shellcheck removed for retained shell scripts**: The bats tests include shellcheck tests (lines 420-466) for all 7 hook scripts. The plan removes the shellcheck CI job (Step 14) but the repo still contains shell scripts (the MCP server, though out of scope for this rewrite, and any shell helper scripts). Shellcheck should remain for retained shell scripts.

2. **Root `package.json` has Vitest as devDependency but consumers don't need it**: Step 15 creates a root `package.json` with `vitest ^2.0.0` in devDependencies. End users of `@r3dlex/oh-my-auggie` do not need Vitest. This should be documented as a developer-only dependency with a comment.

3. **Two package.json coordination overhead underestimated**: The plan acknowledges this (R5) but the mitigation (npm workspace or dedupe) adds tooling complexity not reflected in the implementation steps. A single `plugins/oma/package.json` that is the npm package root (with the root `package.json` removed or made a thin wrapper) would be simpler.

4. **`mktemp` replacement in test setup**: The original bats tests use `mktemp -d` (lines 22-26). Vitest's temp dir handling or Node's `os.tmpdir()` must be explicitly specified in `tests/setup.ts`.

---

## What's Missing (gaps, unhandled edge cases, unstated assumptions)

1. **Approval format specification**: The `approvals.json` schema is never defined. What does a valid approval record look like? What fields are required vs. optional? This is critical for `hasValidApproval()` to be implemented.

2. **Exit code preservation on subprocess spawn**: E2E tests verify exit codes (AC12, AC13) but the `spawnHook()` helper in Step 13 uses `execa()` with `reject: false`. This means the test must explicitly assert the exit code. The verification steps (line 559) say "Exit codes match" but the mechanism is not verified -- if `execa()` is configured incorrectly, the exit code could be silently discarded.

3. **CRLF handling on Windows**: The shell scripts use `printf '%s' ...` which handles CRLF correctly. TypeScript's `readAllStdin()` (Step 2) reads from `process.stdin`. On Windows, `process.stdin` may receive CRLF line endings which could affect JSON parsing if not stripped. The plan does not address this.

4. **`git diff` on detached HEAD is covered (R6) but `git` availability is not**: `adr-enforce.ts` calls `git diff` (Step 6, line 269). The shell version uses `command -v git` to check availability. The TypeScript version should do the same, but the plan does not specify this check. If `git` is not in PATH on Windows, the hook should gracefully skip ADR enforcement, not crash.

5. **Atomic write semantics**: `writeJsonFile()` in Step 2 is described as "atomic-ish JSON write via temp file + rename." On Windows, `fs.rename()` is not atomic across filesystems. This edge case (rename across filesystem boundaries) is not addressed.

6. **No rollback strategy for the atomic migration**: The plan deletes all shell scripts and bats tests in the same PR (Step 14 deprecates bats job, Step 13 deletes `e2e/oma-core-loop.bats`). If the TypeScript implementation has subtle bugs discovered post-merge, there is no shell script fallback to restore.

---

## Ambiguity Risks

- **"Behavior parity" (Principle 1, AC12)** -- Could mean: (A) TypeScript hooks pass the same test cases as shell scripts (test-equivalence), or (B) TypeScript hooks produce identical stdout/stderr/exit code outputs when given identical inputs (output-equivalence). The plan uses test-equivalence but the principle name implies output-equivalence.
  - Risk if wrong interpretation chosen: The plan only implements test-equivalence. If stakeholders expect output-equivalence (e.g., JSON whitespace and key ordering must match), the implementation will be rejected even if all tests pass.

- **"Precompiled `.mjs` files are included in the npm tarball" (Decision Driver 3, line 42)** -- Could mean: (A) the npm pack step includes `dist/` in the tarball, or (B) the repository ships with pre-compiled `dist/` checked in. If (B), then `postinstall: tsc` would overwrite the checked-in files. The distinction matters for reproducibility.
  - Risk if wrong interpretation chosen: If the tarball ships source but not compiled output, Principle 2 is violated during install. If it ships compiled but not source, `postinstall: tsc` is dead code.

- **"100% branch coverage" (AC5, Principle 3)** -- Could mean: (A) every branch in the compiled output is covered, or (B) every branch in the source is covered. V8 coverage measures compiled output branches, which may differ from source branches due to TypeScript compilation. `/* v8 ignore */` comments affect source-level coverage reporting.
  - Risk if wrong interpretation chosen: Contributors may spend time covering compiled-output branches that have no meaningful source-level distinction.

- **"Cross-platform" (Principle 4, AC13)** -- Could mean: (A) hooks run on WSL, Git Bash, and Linux/macOS with identical behavior, or (B) hooks run on any environment with Node.js 18+ including native Windows cmd/PowerShell.
  - Risk if wrong interpretation chosen: The plan explicitly says "WSL/Git Bash on Windows" (Requirements Summary line 11, Decision Driver 1 line 40), not native Windows. But AC13 says "Run on Git Bash (Windows)" which is the correct interpretation. The scope is clear but the wording in Principle 4 is ambiguous.

---

## Multi-Perspective Notes

### Executor
The plan gives me everything I need to write the TypeScript hooks -- the logic, the test cases, the file structure. But I will get stuck at two points without guidance: (1) `hooks.json` update is missing, so I will not know to update it, and (2) `normalizePath()` is referenced but not defined, so I will need to make assumptions about WSL/Git Bash path handling. Both of these are blockers in practice.

### Stakeholder
The plan solves Windows compatibility and adds coverage enforcement -- both stated requirements. But it claims behavioral parity without testing it, and it creates a coverage gate that will likely block CI after the first implementation attempt. The stakeholder wants the hooks to work correctly on Windows, not just to compile correctly.

### Skeptic
The plan's strongest claim is that TypeScript + Vitest is the only path to 100% enforceable branch coverage. But 100% branch coverage on error paths requires fs mocking that tests the mock, not the code. The plan acknowledges this (R3) but does not bound it, so the gate will become ceremonial. Meanwhile, the original shell scripts -- which have been running in production and have 492 lines of bats tests -- are being replaced with TypeScript that has no behavioral parity proof. The skeptic's strongest counter-argument is: "What if the TypeScript code is internally consistent but semantically different from the shell scripts in ways that break existing users?"

---

## Verdict Justification

**Verdict: REVISE**

The plan is structurally sound in its TypeScript architecture and test pyramid design. It has 4 CRITICAL findings that individually block execution or produce regressions, and 4 MAJOR findings that require significant rework. None of these are style preferences -- each is a genuine flaw that will cause either execution failure (hooks never invoked), production regression (behavioral delta), CI blocker (coverage gate), or developer confusion (undefined behaviors).

**Realist Check recalibrations applied**: CRITICAL-1 (hooks.json) is confirmed CRITICAL -- even if the executor happens to notice and updates hooks.json, it is not in the plan and therefore not part of the scope. CRITICAL-2 (behavioral parity) is confirmed CRITICAL -- the plan's most important quality claim is unsubstantiated. CRITICAL-3 (postinstall contradiction) is confirmed CRITICAL -- this is a fundamental design decision conflict. CRITICAL-4 (Windows CI) is confirmed CRITICAL for the claim it makes about the CI matrix.

No findings were downgraded from CRITICAL to MAJOR under the Realist Check because the mitigations in the plan are either absent (CRITICAL-1, CRITICAL-2) or weak (CRITICAL-3: "mitigated by CI matrix testing" does not resolve the contradiction; CRITICAL-4: "add windows-latest" is itself an unimplemented step).

**Review mode**: Escalated from THOROUGH to ADVERSARIAL after confirming CRITICAL-1 (hooks.json) and CRITICAL-2 (behavioral parity). These two findings together suggest systemic issues with the plan's review process -- the architect identified them and the plan did not address them. This triggered aggressive investigation of remaining claims.

**What would upgrade this to APPROVED**:
1. Add `hooks.json` update as Step 1 sub-task with explicit verification
2. Add behavioral parity test suite comparing shell scripts to TypeScript implementations
3. Resolve the postinstall/Principle-2 contradiction with a documented choice
4. Replace 100% V8 branch coverage with equivalence class coverage
5. Define approval expiry format explicitly

---

## Open Questions (unscored)

1. **Does Auggie read `hooks.json` at runtime or at plugin load time?** If Auggie caches the hook entry points at plugin load, then updating `hooks.json` after Auggie starts would require a restart. This affects the migration strategy (can users update the file and reload the plugin, or must they restart Auggie?).

2. **What is the approval `expires` field format in `approvals.json`?** The shell script comment says ISO date but the implementation is a no-op. Before the TypeScript rewrite can implement expiry checking, the format must be standardized.

3. **Should the shell scripts be kept as shadow implementations?** The architect recommended a phased migration (one hook at a time). This would enable behavioral parity testing at each step. The plan's atomic deletion removes this safety net.

4. **Is the `mcp/state-server.mjs` also being updated?** It is explicitly out of scope, but it uses the same grep+sed patterns for JSON extraction. If the MCP server's behavior changes (e.g., if other tools depend on its exact output format), there could be cross-component compatibility issues.

---

## Ralplan Summary Row

| Dimension | Status | Reason |
|-----------|--------|--------|
| Principle/Option Consistency | **FAIL** | Principles 1, 2, and 3 are internally inconsistent with the implementation choices. Principle 1 claims behavioral parity but tests are not parity tests. Principle 2 claims zero runtime deps but postinstall requires typescript. Principle 3 claims enforceable coverage but the escape hatch is unbounded. |
| Alternatives Depth | **FAIL** | Option B is straw-manned with factually incorrect claims (bats on Git Bash "unreliable and not officially supported"). The single valid reason (no branch coverage tooling for shell) is buried. |
| Risk/Verification Rigor | **FAIL** | R3 coverage gate is acknowledged as unachievable for error paths but remains as the enforcement mechanism. Behavioral parity is a core claim but has zero verification steps. AC13 verification ("run on Git Bash") requires an unimplemented CI step. |
| Deliberate Additions | **PARTIAL** | Pre-mortem (3 scenarios) is present and credible. Expanded test plan covers unit/integration/e2e. However, the pre-mortem scenario 2 (coverage gate) confirms the problem rather than solving it. Equivalence class coverage is identified as an improvement but not adopted. |

---

*Review generated: 2026-04-04*
*Reviewer: Critic agent*
*Files verified: `plugins/oma/hooks/hooks.json`, `plugins/oma/hooks/{approval-gate,delegation-enforce,stop-gate,keyword-detect,adr-enforce,cost-track,session-start}.sh`, `e2e/oma-core-loop.bats`, `.github/workflows/ci.yml`, `plugins/oma/.augment-plugin/plugin.json`, `SPEC.md`*

---

## Revision 2 Verdict

**Reviewer**: Critic agent
**Plan**: `.omc/plans/oma-windows-support-ralplan.md`
**Date**: 2026-04-04
**Revision**: 2 (addressing original CRITICAL-1 through CRITICAL-4 and MAJOR-1 through MAJOR-4)
**Mode**: THOROUGH

---

### CRITICAL Findings: Resolution Status

**CRITICAL-1: hooks.json update -- RESOLVED**

The plan now addresses this in two concrete locations:
- Step 1 (lines 155-166): Explicit sub-step titled "Update `plugins/oma/hooks/hooks.json`" with the exact sed command to change all 7 `.sh` references to `.mjs`, and the verification command `grep '\.sh' plugins/oma/hooks/hooks.json` as a zero-results pass condition.
- Step 15 (lines 690-699): CI Step 0 runs the same update as a pre-test guard, ensuring the committed state is always correct even if Step 1 was skipped locally.
- AC10 (line 132): Formalized as an acceptance criterion with the grep verification as pass condition.

This is a complete fix. Verified against the actual `hooks.json` (lines 7, 13, 19, 25, 31, 37, 43 still reference `.sh` in the current committed state -- the plan addresses this correctly for the target state).

**CRITICAL-2: Behavioral parity tested against original shell scripts -- RESOLVED**

The plan now includes a full behavioral parity infrastructure:
- Step 14 (lines 608-684): `tests/parity/runner.ts` implements `runParity()` using `execFileSync('bash', [shellScript])` and `execFileSync('node', [tsBinary])` with identical stdin and OMA_DIR environment, asserting identical exit codes and trimmed stderr.
- AC9 (line 132): Explicit acceptance criterion that `tests/parity/` runs both implementations with identical inputs and asserts identical outputs.
- Deletion gate (line 675): "A hook's shell script is deleted only in the PR that adds its parity tests and demonstrates identical outputs." This is the safety net the original plan lacked.
- Documented divergences (lines 430, 467-468, 678-683): cost-track JSON format, keyword-detect Unicode handling, and approval-gate expiry (a new feature, not a rewrite) are all acknowledged with stakeholder-level acceptance required.

This is a complete fix. The plan now substantiates Principle 1 with actual test infrastructure, not just assertion.

**CRITICAL-3: postinstall lifecycle contradiction -- RESOLVED**

The contradiction is cleanly resolved:
- Requirements Summary (line 16): "committed precompiled `.mjs` files in `dist/`; npm tarball ships precompiled output only (no `postinstall`)"
- Step 1 (line 149): `plugins/oma/package.json` has `scripts.prepare = tsc`; no `postinstall` script.
- Step 16 (lines 746-750): Root `package.json` has `prepare` script only.
- Principle 2 (line 34): "Compiled `.mjs` files must have no `node_modules` dependency" -- satisfied because `.mjs` ships precompiled.
- Decision Driver 3 (line 43): `prepare` handles dev-time compilation on contributor machines only.

This matches the architect's synthesis exactly: precompiled `.mjs` in the tarball (satisfies Principle 2) + `prepare` for dev ergonomics. The `postinstall` lifecycle contradiction is gone.

**CRITICAL-4: Windows CI matrix -- RESOLVED**

The plan correctly retreats from the `windows-latest` claim:
- Step 15 (lines 719-722): Explicitly states "Windows CI claim removed -- `windows-latest` in GitHub Actions runs PowerShell, not bash." The rationale is honest: Ubuntu job with cross-platform code review and parity tests serves as the authoritative verification mechanism, since TypeScript `.mjs` files are platform-agnostic and `normalizePath()` + `path.resolve()` handle path differences.
- ADR (line 829): Follow-up item to evaluate a Windows-native CI job via WSL runner.

This is the correct call. Claiming `windows-latest` without specifying bash + Node.js setup was a CI gap. The plan defers it honestly rather than over-promising.

---

### MAJOR Findings: Resolution Status

**MAJOR-1: 95% branch coverage gate with bounded v8 ignore -- ACCEPTABLE**

The plan drops from 100% to 95% and defines four bounded categories (lines 542-547):
- `unreachable: handled by upstream guard`
- `error: fs error path not reproducible in tests`
- `platform: only runs on non-Windows`
- `git: only runs when git is available`

Each ignore comment requires a non-empty reason reviewed in PR. The 95% threshold is realistic; the categories provide structure; PR review is the human backstop. The architect rated this acceptable and I agree -- the remaining risk (contributors liberally applying ignores) is mitigated by the PR review gate.

**MAJOR-2: Option B fairly represented -- RESOLVED**

Option B's invalidation (lines 66-69) now correctly states: "bats-core IS officially supported on Windows via MSYS2 and Git Bash. The real invalidation is not tooling availability -- it is the absence of coverage tooling." The single strong reason (no branch coverage tooling for shell) is the primary argument.

**MAJOR-3: Approval expiry format -- RESOLVED**

The ApprovalRecord type (lines 83-96) defines `expires?: string` with ISO 8601 format. Expiry semantics are explicit: 5-minute clock-skew tolerance, missing `expires` means never expires, and `isApprovalExpired()` is implemented in `src/utils.ts` (lines 232-238). The shell script's no-op is explicitly documented. Complete.

**MAJOR-4: normalizePath specification -- RESOLVED**

A dedicated section (lines 100-113) defines `normalizePath()` behavior concretely: always `path.resolve(p)`, with per-platform notes (WSL no translation needed, Git Bash backslash paths work correctly). The "What NOT to do" clause explicitly forbids MSYS/CYGWIN prefix detection. Unit tests for each path format are specified. This is the right call -- `path.resolve()` is the correct primitive.

---

### New Issues

No new CRITICAL or MAJOR issues introduced by the revision.

**NC-1 (Minor)**: The `isGitAvailable()` function (line 228) uses `command -v` on Unix and `where` on Windows. In practice, `command -v` works in Git Bash and WSL bash. Using `where` for a Windows `cmd` shell is unnecessary since the target is bash-compatible environments only. Low severity -- the function will work in the target environments.

**NC-2 (Minor)**: The `ApprovalRecord` type defines `type: 'Security+DevOps'` as a valid literal, but Step 5 (line 348) says "A record with `type: 'Security+DevOps'` is not valid for dual approval -- requires two separate records." This creates an inconsistency: the union type allows `'Security+DevOps'` but the logic rejects it. The type definition should be updated to remove `'Security+DevOps'` from the union, or the logic should accept it. This is a minor inconsistency that the implementer will need to resolve, but it does not block execution.

---

### Verification Against Original Critic Review

| Original Finding | Plan Reference | Status |
|------------------|----------------|--------|
| CRITICAL-1: hooks.json not updated | Step 1 (155-166), Step 15 (690-699), AC10 (132) | RESOLVED |
| CRITICAL-2: Behavioral parity untested | Step 14 (608-684), AC9 (132), deletion gate (675) | RESOLVED |
| CRITICAL-3: postinstall contradiction | Line 16, Step 1 (149), Step 16 (746), Principle 2 (34) | RESOLVED |
| CRITICAL-4: windows-latest CI infeasible | Step 15 (719-722), ADR (829) | RESOLVED |
| MAJOR-1: Coverage gate unbounded | Lines 542-547 (bounded categories), 95% threshold (524) | ACCEPTABLE |
| MAJOR-2: Option B straw-manned | Lines 66-69 (factual correction) | RESOLVED |
| MAJOR-3: Expiry format undefined | Lines 83-96 (ISO 8601 + 5min tolerance), lines 232-238 (impl) | RESOLVED |
| MAJOR-4: normalizePath undefined | Lines 100-113 (concrete spec + unit tests) | RESOLVED |

---

### Ralplan Summary Row (Revision 2)

| Dimension | Status | Reason |
|-----------|--------|--------|
| Principle/Option Consistency | **PASS** | All three originally inconsistent principles (1, 2, 3) are now internally consistent. Principle 1 has behavioral parity test infrastructure. Principle 2 has `prepare` + committed `.mjs`. Principle 3 has 95% threshold with bounded ignores. |
| Alternatives Depth | **PASS** | Option B is now fairly represented with the correct primary invalidation reason (no branch coverage tooling). The MSYS2 factual error is corrected. |
| Risk/Verification Rigor | **PASS** | R3 coverage gate is bounded. Behavioral parity has dedicated test infrastructure (Step 14). Windows CI is honestly deferred. All verification steps now have concrete mechanisms in the plan. |
| Deliberate Additions | **PASS** | Pre-mortem (3 scenarios, lines 946-953) is credible and each scenario has a mitigation. Expanded test plan covers unit/integration/e2e/parity/observability. |

---

### Verdict

**APPROVED**

The plan has addressed all 4 CRITICAL findings and all 4 MAJOR findings from the original review. The hooks.json gap is closed with dual coverage (Step 1 implementation + CI guard). Behavioral parity is substantiated with a full `tests/parity/` infrastructure and a deletion gate that prevents shell script removal until parity is proven. The postinstall lifecycle contradiction is cleanly resolved via `prepare` + committed `.mjs`. Windows CI is honestly deferred rather than over-promised. Coverage is bounded at 95% with reviewed escape categories. Approval expiry, normalizePath, and Option B are all correctly resolved.

Two minor issues remain (NC-1: `where` vs `command -v` in `isGitAvailable()`; NC-2: `Security+DevOps` in ApprovalRecord type vs. logic rejection), but neither blocks execution -- the implementer will handle them during the TypeScript rewrite.

**Realist Check**: The two minor inconsistencies are low-confidence findings that a contributor implementing the hooks will naturally resolve. Neither represents a structural flaw in the plan.

---

*Revision 2 review completed: 2026-04-04*
*Reviewer: Critic agent*
*Files verified against plan: `plugins/oma/hooks/hooks.json` (lines 7,13,19,25,31,37,43), `plugins/oma/hooks/approval-gate.sh` (lines 104-126 confirmed no-op on expiry)*
