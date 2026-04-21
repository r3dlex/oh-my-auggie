# Plan: OMA Windows TypeScript Rewrite

## Plan saved to: `.omc/plans/oma-windows-support-ralplan.md`
## Scope: ~28 tasks across 15 files | Estimated complexity: HIGH
## Type: brownfield rewrite (shell hooks + bats tests)

---

## Requirements Summary

Rewrite OMA's shell hooks and replace bats tests with TypeScript + Vitest, distributed as a precompiled npm package with `prepare` TypeScript compilation, targeting WSL/Git Bash on Windows with 95% branch/condition test coverage (100% enforced on all uncovered lines via documented `/* v8 ignore */` comments).

**In scope:**
- 7 shell hooks rewritten as TypeScript source files, compiled to `.mjs` via `tsc`
- bats tests (492 lines) replaced with Vitest unit + integration + e2e tests
- `prepare` script for dev-time compilation; committed precompiled `.mjs` files in `dist/`; npm tarball ships precompiled output only (no `postinstall`)
- `tsconfig.json` targeting ESM, Node 18+, strict mode
- CI updated to run `tsc --noEmit`, `vitest run`, and coverage threshold
- `hooks.json` updated to point to `.mjs` files (explicit prerequisite step)

**Out of scope:**
- Rewriting existing `.mjs` CLI files (`cli/oma.mjs`, `utils.mjs`, etc.)
- Native Windows without WSL/bash
- CommonJS output
- TypeScript compilation by end users (npm tarball ships compiled output only)

---

## RALPLAN-DR Summary

### Principles (5)

1. **Behavior parity over syntax equivalence**: The TypeScript hooks must pass the same test cases the shell scripts pass today -- not just compile cleanly. Every grep-based JSON extraction becomes `JSON.parse()` with typed inputs, but the exit codes and output format must be identical. A behavioral parity test suite (`tests/parity/`) runs both implementations against identical inputs and asserts identical outputs before a hook is considered complete.
2. **Zero runtime dependencies in compiled output**: Compiled `.mjs` files must have no `node_modules` dependency. All logic is self-contained via Node.js built-ins (`fs`, `path`, `process`, `crypto`). TypeScript types are stripped at compile time.
3. **Test coverage gates release**: `vitest --coverage` with `coverageThresholds.branch: 95` runs in CI. Uncovered lines require documented `/* v8 ignore: <reason> */` comments reviewed in PR. Hook source files must reach 100% coverage; utility files are excluded from the gate but still reported.
4. **Portability-first**: Use `path.join()` and `process.platform` checks instead of Unix path conventions. All path operations go through `normalizePath()` which resolves relative paths to absolute using `path.resolve()`. The hooks must run identically on WSL, Git Bash, and Linux/macOS.
5. **No test rewrites until hooks are type-safe**: Unit tests for a hook only begin after its TypeScript source passes `tsc --noEmit --strict`. The bats-to-Vitest migration is gated on the hooks being type-correct, not on them existing.

### Decision Drivers (top 3)

1. **Windows portability**: bats cannot run natively on Windows without a bash layer (MSYS2 or Git Bash). Shell scripts are technically portable via Git Bash/WSL but have no cross-platform path handling. TypeScript + Node.js compiles to portable `.mjs` and has mature cross-platform test tooling (Vitest) that runs on any Node.js host.
2. **Coverage enforcement**: Shell scripts have no type system and no coverage tooling. TypeScript with Vitest's V8 coverage provider enables a meaningful, enforceable coverage gate that shell scripts cannot match.
3. **Distribution model**: User confirmed npm package distribution -- committed precompiled `.mjs` files in `dist/` are shipped in the npm tarball (satisfies zero runtime deps). A `prepare` script handles dev-time compilation on contributor machines only.

### Viable Options (2)

#### Option A: TypeScript + Vitest + committed precompiled output (CHOSEN)
**Approach**: Create `plugins/oma/package.json` with TypeScript source in `src/hooks/` and committed compiled output in `dist/`. Root `package.json` depends on `@r3dlex/oh-my-auggie`. A `prepare` script runs `tsc` for contributors (not end users). bats tests replaced with Vitest tests in `plugins/oma/tests/`.

**Bounded pros**:
- Fully cross-platform: `.mjs` files run on Node 18+ on Windows (WSL/Git Bash) and Linux/macOS
- 95% branch coverage enforced via Vitest `coverageThresholds`; 100% enforced via reviewed `/* v8 ignore */` comments
- TypeScript strict mode catches logic errors at compile time
- npm distribution means Auggie installs via standard package manager
- Vitest E2E tests spawn `node dist/hooks/approval-gate.mjs` as subprocess -- same semantics as bats but cross-platform
- Zero runtime dependencies in compiled output (only Node.js built-ins used)

**Bounded cons**:
- `prepare` requires `npm install` to succeed on contributor machines (compilation step can fail on edge-case Node versions)
- TypeScript source must be maintained alongside committed `.mjs` in the repo
- Two package.json files (root + plugin) add coordination overhead

#### Option B: Pure Bash with MSYS2/Windows-native bash detection
**Approach**: Add Windows path compatibility layers to existing shell scripts. Keep bats tests; run bats on Git Bash on Windows.

**Invalidation rationale**:
- **Factual correction**: bats-core IS officially supported on Windows via MSYS2 and Git Bash. The real invalidation is not tooling availability -- it is the absence of coverage tooling: shell scripts have no equivalent to Vitest's V8 coverage provider, making a meaningful branch coverage gate impossible. MSYS2 is also an additional dependency that pure Node.js avoids, adding setup friction for contributors on Windows.
- Shell scripts cannot achieve enforced branch coverage reporting
- Shell scripts cannot be type-checked -- logic bugs only surface at runtime

---

### Option Chosen

**Option A** (TypeScript + Vitest + committed precompiled output) was chosen because it is the only approach that simultaneously satisfies: (1) cross-platform execution on Windows via WSL/Git Bash, (2) enforceable branch coverage, and (3) type safety at compile time. The committed precompiled `.mjs` + `prepare` script model resolves the tension between the original `postinstall` proposal and the zero-runtime-deps principle.

---

## ApprovalRecord Type (for reference)

```typescript
// plugins/oma/src/types.ts
export interface ApprovalRecord {
  path: string;        // glob pattern or exact path
  type: 'Security' | 'DevOps' | 'DBA' | 'Security+DevOps';
  approvedBy: string;
  approvedAt: string;  // ISO 8601: "2026-04-04T12:00:00Z"
  expires?: string;    // ISO 8601 expiry timestamp; absent = never expires
}
```

**Expiry semantics**:
- Format: ISO 8601 (`2026-04-04T23:59:59Z`). All time comparisons use `new Date()` and UTC.
- Tolerance: 5-minute clock-skew tolerance (approval is valid if `expires - now > -5 minutes`). This prevents false negatives due to minor clock drift between machines.
- Missing `expires` field: treated as "never expires" (matching current shell behavior where expiry is a no-op).
- The `date` command in `approval-gate.sh:104-110` is a no-op; the TypeScript rewrite is the first functional implementation.

---

## normalizePath() Specification

`normalizePath(p: string): string` in `src/utils.ts`:

- **Always**: return `path.resolve(p)` -- this converts any relative path to an absolute path in the Node.js process's native format. This is sufficient for all supported environments (WSL, Git Bash, Linux, macOS).
- **WSL** (`process.platform === 'linux'`): `git diff` returns POSIX paths; `path.resolve()` returns POSIX paths. No translation needed.
- **Git Bash** (`process.platform === 'win32'`): `git diff` returns `/c/Users/...` paths. Node.js `path.resolve()` returns `C:\Users\...` backslash paths. For file system operations, backslash paths work correctly on Git Bash. For display/logging, the absolute path in native format is used.
- **Linux/macOS**: `path.resolve()` returns POSIX absolute paths. No special handling.
- **What NOT to do**: do NOT attempt to detect MSYS/CYGWIN prefixes and translate them -- `path.resolve()` handles these natively on the relevant platforms.
- **Unit tests required**:
  - Relative path (`src/file.ts`) → absolute path in native format
  - Git Bash path (`/c/Users/...`) → resolved to absolute
  - POSIX path on Linux → unchanged
  - WSL path (`/mnt/c/Users/...`) → unchanged (already POSIX)

---

## Acceptance Criteria

All criteria below are 100% testable with specific metrics.

| # | Criterion | Metric |
|---|-----------|--------|
| AC1 | All 7 hooks have TypeScript source files | `src/hooks/{name}.ts` exists for each of: `approval-gate`, `adr-enforce`, `cost-track`, `delegation-enforce`, `keyword-detect`, `session-start`, `stop-gate` |
| AC2 | All 7 hooks compile to `.mjs` | `dist/hooks/{name}.mjs` exists and is valid ESM (verifiable via `node --check dist/hooks/{name}.mjs`) |
| AC3 | `tsc --noEmit` reports zero errors | Exit code 0 with no `.ts` files in error output |
| AC4 | `tsconfig.json` targets ESM, Node 18+ | `"module": "NodeNext"`, `"target": "ES2022"`, `"moduleResolution": "NodeNext"`, `"lib": ["ES2022"]` |
| AC5 | 95% branch coverage on hook logic; all uncovered lines documented | `vitest run --coverage` shows `branches >= 95` for all `src/hooks/*.ts` files; each uncovered line has `/* v8 ignore: <reason> */` with a non-empty reason; PR review confirms all ignore reasons are justified |
| AC6 | Unit tests exist for all pure functions per hook | Each hook's pure functions have dedicated test cases covering boundary + equivalence classes |
| AC7 | Integration tests cover stdin/stdout + file I/O | Each hook integration test feeds JSON stdin, verifies exit code (0 or 2) and stdout/stderr content |
| AC8 | E2E tests spawn `node dist/hooks/*.mjs` as subprocess | `vitest e2e/` tests call `spawn()` with `node path/to/dist/hook.mjs`, verify exit code + parsed output |
| AC9 | Behavioral parity tests compare shell script to TypeScript | `tests/parity/` runs each original `.sh` and new `.mjs` with identical stdin + env; asserts identical exit codes and stdout/stderr content |
| AC10 | `hooks.json` updated to `.mjs` entry points | All 7 `command` fields in `plugins/oma/hooks/hooks.json` reference `hooks/{name}.mjs`; `grep '\.sh' plugins/oma/hooks/hooks.json` returns zero results |
| AC11 | bats tests deleted when parity verified | `e2e/oma-core-loop.bats` is deleted; all original scenarios covered by `vitest e2e/` or `tests/parity/` |
| AC12 | CI runs type check + tests + coverage | `.github/workflows/ci.yml` contains steps for `tsc --noEmit`, `vitest run`, and coverage threshold |
| AC13 | All 7 hooks preserve stdin/stdout protocol | Hooks accept JSON via `readAllStdin()` and output JSON decision via `stdout.write()`; exit code 0 = allow, exit code 2 = block |
| AC14 | Hooks run on WSL/Git Bash Node 18+ | `process.platform` checks used for path normalization; no hardcoded `/` paths for file operations |
| AC15 | Zero runtime npm dependencies in compiled output | `node dist/hooks/approval-gate.mjs` runs with only Node.js built-ins (verifiable via `npm ls` = empty in dist context) |

---

## Implementation Steps

### Step 1 -- Scaffold project infrastructure

**Action**: Create the TypeScript project structure in `plugins/oma/`.

Files to create:
- `plugins/oma/tsconfig.json` -- ESM, Node 18+, strict, outDir `dist`
- `plugins/oma/package.json` -- name `@r3dlex/oh-my-auggie`, type `module`, devDeps `vitest`, `typescript`, `@types/node`; `scripts.prepare` = `tsc`; `scripts.test` = `vitest run`; no `dependencies` (zero runtime deps)
- `plugins/oma/src/` directory structure
- `plugins/oma/tests/` directory structure (unit/, integration/, e2e/, parity/)
- `plugins/oma/tests/setup.ts` -- shared test utilities (temp dir creation via Node `os.tmpdir()`, mock stdin helper)
- `.npmignore` at repo root or in `plugins/oma/`: exclude `src/`, `tests/`, `*.test.ts`, `.github/` from published tarball -- only `dist/` and `package.json` are published

**Update `plugins/oma/hooks/hooks.json`** as part of this step:

The `hooks.json` entry point manifest must be updated to reference the compiled `.mjs` files. Without this change, Auggie will continue to invoke the original shell scripts even after TypeScript compilation succeeds.

In `plugins/oma/hooks/hooks.json`, change all 7 `command` fields from `${PLUGIN_ROOT}/hooks/{name}.sh` to `${PLUGIN_ROOT}/hooks/{name}.mjs`. Verify with:
```bash
grep '\.sh' plugins/oma/hooks/hooks.json
# Must return zero results
```

This update happens in CI before tests run (see Step 14) and must be committed as part of the same PR that adds the TypeScript source.

**Verification**: `tsc --noEmit` exits 0 on an empty `src/index.ts`. `grep '\.sh' plugins/oma/hooks/hooks.json` returns zero results. `cat plugins/oma/package.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.type==='module' && !d.dependencies && d.scripts.prepare==='tsc' ? 'OK' : 'FAIL')"` passes.

---

### Step 2 -- Define shared types and utility library

**Action**: Create `plugins/oma/src/types.ts` and `plugins/oma/src/utils.ts`.

**`src/types.ts`** defines:
```typescript
export interface HookInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  mode?: string;
  agent?: string;
  timestamp?: string;
  content?: string;
  [key: string]: unknown;
}

export interface HookOutput {
  decision: 'allow' | 'block' | 'warn';
  reason?: string;
  systemMessage?: string;
  keywordDetected?: string;
  suggestedCommand?: string;
}

export interface OmaState {
  mode: string;
  active: boolean;
  iteration?: number;
  task?: string;
  [key: string]: unknown;
}

export type ApprovalType = 'Security' | 'DevOps' | 'DBA' | 'Security+DevOps' | '';

export interface ApprovalRecord {
  path: string;
  type: ApprovalType;
  approvedBy: string;
  approvedAt: string; // ISO 8601: "2026-04-04T12:00:00Z"
  expires?: string;   // ISO 8601; absent = never expires
}

export interface ApprovalConfig {
  approvals: ApprovalRecord[];
}
```

**`src/utils.ts`** exports:
- `readAllStdin(): Promise<string>` -- reads `process.stdin` to string (used by all hooks); normalizes CRLF to LF before JSON parsing
- `loadJsonFile<T>(path: string): T | null` -- wraps `fs.readFileSync`, returns null on ENOENT
- `loadOmaState(omaDir: string): OmaState` -- loads `state.json` or returns `{mode:'none',active:false}`
- `loadConfig(omaDir: string): Record<string, unknown>` -- loads `config.json`
- `isEnterpriseProfile(config: Record<string, unknown>): boolean` -- checks `config.profile === 'enterprise'`
- `getFilePathsFromInput(input: HookInput): string[]` -- extracts `file_path`, `path`, `filePath` from tool_input
- `writeJsonFile(path: string, data: unknown): void` -- atomic-ish JSON write via temp file + rename; on Windows, handles cross-filesystem rename by catching the error and falling back to non-atomic write
- `resolveOmaDir(): string` -- returns `process.env.OMA_DIR ?? '.oma'`
- `normalizePath(p: string): string` -- uses `path.resolve(p)` to convert any path (relative, Git Bash-style `/c/...`, WSL `/mnt/c/...`) to an absolute path in native format. See `normalizePath()` Specification section above for per-platform behavior.
- `isGitAvailable(): boolean` -- checks `git` is in PATH using ` Bunyan` (cross-platform: tries `command -v` on Unix, `where` on Windows)

**Approval expiry helper** (`src/utils.ts`):
```typescript
export function isApprovalExpired(record: ApprovalRecord): boolean {
  if (!record.expires) return false; // no expiry field = never expires
  const now = Date.now();
  const expiry = new Date(record.expires).getTime();
  const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
  return now > expiry + CLOCK_SKEW_TOLERANCE_MS;
}
```

**Verification**: `tsc --noEmit` on `src/types.ts` + `src/utils.ts` passes. Unit tests in `tests/unit/utils.test.ts` cover: ENOENT returns null, enterprise true/false, multi-field file path extraction, temp dir creation via `os.tmpdir()`, Git Bash path normalization, ISO 8601 expiry parsing with clock skew tolerance.

---

### Step 3 -- Rewrite `delegation-enforce` TypeScript hook

**Source file**: `plugins/oma/src/hooks/delegation-enforce.ts`
**Compiled to**: `plugins/oma/dist/hooks/delegation-enforce.mjs`

**Logic to implement** (parity with `delegation-enforce.sh`):
1. `readAllStdin()` -> parse `HookInput`
2. Extract `tool_name`
3. Allow if `tool_name` not in `[Edit, Write, remove_files, str-replace-editor, save-file]`
4. Load `state.json` via `loadOmaState()`
5. Block (exit 2 + JSON to stderr) if `mode !== 'none'` and `active === true`
6. Default: exit 0

**Unit tests** (`tests/unit/delegation-enforce.test.ts`):
- `tool_name=Edit, mode=ralph, active=true` -> exit 2
- `tool_name=Edit, mode=none, active=false` -> exit 0
- `tool_name=Glob, mode=ralph, active=true` -> exit 0 (non-blocking tool)
- `tool_name=Write, mode=ultrawork, active=true` -> exit 2
- `tool_name=Bash, mode=ralph, active=true` -> exit 0
- `tool_name=Edit, no state.json` -> exit 0

**E2E tests** (`tests/e2e/delegation-enforce.test.ts`):
- Spawn `node dist/hooks/delegation-enforce.mjs` with stdin JSON, verify exit code

**Parity tests** (`tests/parity/delegation-enforce.test.ts`):
- Run original `hooks/delegation-enforce.sh` and new `dist/hooks/delegation-enforce.mjs` with identical stdin + OMA_DIR
- Assert identical exit codes and stderr content for all unit test inputs
- See Step 14 for the parity test runner infrastructure

**Verification**: `vitest run tests/unit/delegation-enforce.test.ts` passes. `vitest run tests/e2e/delegation-enforce.test.ts` passes. `vitest run tests/parity/delegation-enforce.test.ts` passes (identical outputs). Coverage: 95% branch minimum with all uncovered lines documented.

---

### Step 4 -- Rewrite `stop-gate` TypeScript hook

**Source file**: `plugins/oma/src/hooks/stop-gate.ts`
**Compiled to**: `plugins/oma/dist/hooks/stop-gate.mjs`

**Logic to implement** (parity with `stop-gate.sh`):
1. Load `state.json` via `loadOmaState()`
2. Allow (exit 0) if no state file or empty
3. Allow (exit 0) if `mode !== 'ralph'` or `active !== true`
4. Load `task.log.json`, look for last entry with `"agent":"oma-architect"` and `"status":"PASS"`
5. Allow (exit 0) if architect PASS found
6. Block (exit 2 + JSON to stderr) otherwise, include current iteration

**Unit tests** (`tests/unit/stop-gate.test.ts`):
- `mode=none, active=false` -> exit 0
- `mode=ralph, active=false` -> exit 0
- `mode=autopilot, active=true` -> exit 0
- `mode=ralph, active=true, task.log=[]` -> exit 2
- `mode=ralph, active=true, task.log=[{agent:'oma-architect',status:'PASS'}]` -> exit 0
- `mode=ralph, active=true, task.log=[{agent:'oma-critic',status:'PASS'}]` -> exit 2 (no architect PASS)
- `no state.json` -> exit 0

**Parity tests** (`tests/parity/stop-gate.test.ts`):
- Compare shell and TypeScript outputs for all unit test inputs

**Verification**: 95% branch coverage minimum. All uncovered lines documented. Parity tests pass.

---

### Step 5 -- Rewrite `approval-gate` TypeScript hook

**Source file**: `plugins/oma/src/hooks/approval-gate.ts`
**Compiled to**: `plugins/oma/dist/hooks/approval-gate.mjs`

**Logic to implement** (parity with `approval-gate.sh`):
1. Load `config.json` via `loadConfig()`; skip (exit 0) if not enterprise profile
2. `readAllStdin()` -> parse `HookInput`
3. Extract `tool_name` -> skip (exit 0) if not in `[Edit, Write, remove_files, str-replace-editor, save-file, Bash]`
4. Extract file paths via `getFilePathsFromInput()`
5. For each file path, call `getRequiredApproval(path)`:
   - `*secrets*` / `*secret*` -> `Security+DevOps`
   - `*auth*.ts` / `*auth*` -> `Security`
   - `*config*` / `*/config*` -> `DevOps`
   - `*migration*` / `*/migration*` / `*migrate*` -> `DBA`
   - else -> `""` (no approval needed)
6. For each file requiring approval, load `approvals.json`, find matching `ApprovalRecord`, check `hasValidApproval()`:
   - `hasValidApproval`: record exists with matching `type`, `isApprovalExpired(record) === false`
   - For `Security+DevOps`: requires two separate records, one with `type: 'Security'` and one with `type: 'DevOps'`
7. Block (exit 2) on first unapproved file
8. Exit 0 otherwise

**ApprovalRecord schema** (from `src/types.ts`):
```json
{
  "approvals": [
    {
      "path": "src/**/auth*.ts",
      "type": "Security",
      "approvedBy": "security-team",
      "approvedAt": "2026-04-04T12:00:00Z",
      "expires": "2026-12-31T23:59:59Z"
    }
  ]
}
```

**Expiry semantics**:
- Format: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- Tolerance: 5-minute clock-skew tolerance (approval valid if `now < expires + 5 minutes`)
- Missing `expires`: treated as "never expires" (matching current shell behavior where expiry check was a no-op)
- A record with `type: 'Security+DevOps'` is not valid for dual approval -- requires two separate records

**Key typed helper functions**:
- `getRequiredApproval(filePath: string): ApprovalType`
- `hasValidApproval(filePath: string, required: ApprovalType, approvals: ApprovalRecord[]): boolean`
- `isApprovalExpired(record: ApprovalRecord): boolean` (from `src/utils.ts`)
- `parseApprovalsFile(path: string): ApprovalRecord[]`

**Unit tests** (`tests/unit/approval-gate.test.ts`):
- `getRequiredApproval`: secrets->Security+DevOps, auth->Security, config->DevOps, migration->DBA, non-sensitive->empty
- `hasValidApproval`: dual approval requires both Security AND DevOps entries (separate records); single approval accepts exact match; expired approval -> false
- `isApprovalExpired`: ISO 8601 with 5-min tolerance; missing expires -> false; expired 10min ago -> true; expired 3min ago -> false (within tolerance)
- Enterprise profile block: sensitive path without approval -> exit 2
- Community profile: all paths -> exit 0
- `approvals.json` missing or empty -> exit 2 on sensitive path

**Equivalence classes tested**: security-only, devops-only, dba-only, dual-approval, no-approval, empty-approvals-file, expired-approval, missing-expiry-field.

**Parity tests** (`tests/parity/approval-gate.test.ts`):
- Compare shell and TypeScript for all unit test inputs; note: shell script's expiry check is a no-op, so parity tests use non-expired approvals only for the expiry test case (the TypeScript expiry check is a new feature, not a rewrite of existing behavior)

**Verification**: 95% branch coverage minimum. All uncovered lines documented. Parity tests pass.

---

### Step 6 -- Rewrite `adr-enforce` TypeScript hook

**Source file**: `plugins/oma/src/hooks/adr-enforce.ts`
**Compiled to**: `plugins/oma/dist/hooks/adr-enforce.mjs`

**Logic to implement** (parity with `adr-enforce.sh`):
1. Skip if not enterprise profile (via `loadConfig()`)
2. `HOOK_TYPE` env var: only enforce on `PreToolUse` or `commit-msg`
3. `readAllStdin()` -> parse `HookInput`
4. Run `git diff --cached --name-only` + `git diff HEAD --name-only` via `execSync` (wrapped in try/catch; return empty array on failure). Check `isGitAvailable()` first.
5. `requiresAdr(files: string[]): boolean` -- true if any of:
   - File name matches `/api[-_]?client|fetch|axios|request|http[-_]?client|rest[-_]?client|graphql[-_]?client/i`
   - File name matches `/migration|schema|migrate|db[-_]?schema|table[-_]?schema/i`
   - File name matches `/auth|jwt|oauth|passport|session|acl|permission|role/i`
   - File name matches `/interface[-_]?service|service[-_]?contract|port[-_]?adapter/i`
   - File count > 20
6. `hasAdrReference(commitMsg: string): boolean` -- matches `/ADR-[0-9]+|\.oma\/adr\/[0-9]+-|architectural[-_]?decision/i`
7. Check OMA hook input for embedded ADR reference
8. If ADRs exist in `.oma/adr/` dir and no reference found -> exit 2
9. If no ADR files exist at all -> exit 0 with warn to stderr
10. If reference found -> exit 0

**normalizePath in adr-enforce**: Paths returned by `git diff --name-only` are normalized via `normalizePath()` before pattern matching to ensure consistent behavior across WSL, Git Bash, and Linux/macOS.

**Unit tests** (`tests/unit/adr-enforce.test.ts`):
- `requiresAdr`: URL API client -> true, migration file -> true, auth -> true, interface service -> true, 25 files -> true, README.md -> false
- `hasAdrReference`: `ADR-123` -> true, `.oma/adr/0042-foo.md` -> true, `architectural decision` -> true, `normal commit` -> false
- No ADR files + non-architectural change -> exit 0 (no warning needed)
- ADR files exist + no reference -> exit 2
- ADR files exist + reference present -> exit 0
- `git` not available -> exit 0 gracefully (no crash)
- Detached HEAD -> exit 0 gracefully

**Parity tests** (`tests/parity/adr-enforce.test.ts`):
- Compare shell and TypeScript for all unit test inputs

**Verification**: 95% branch coverage minimum. All uncovered lines documented. Parity tests pass.

---

### Step 7 -- Rewrite `cost-track` TypeScript hook

**Source file**: `plugins/oma/src/hooks/cost-track.ts`
**Compiled to**: `plugins/oma/dist/hooks/cost-track.mjs`

**Logic to implement** (parity with `cost-track.sh`):
1. Determine `hookType` from `HOOK_TYPE` env var (default `PostToolUse`)
2. Parse environment vars OR stdin JSON for: `tool_name`, `model`, `input_tokens`, `output_tokens`, `duration_ms`
3. `estimateCost(model, inputTokens, outputTokens)` -- pricing per million tokens:
   - opus: $15 in / $75 out
   - sonnet: $3 in / $15 out
   - haiku: $0.25 in / $1.25 out
   - gpt-4o/gpt-4o-mini: $2.50 in / $10 out
   - default: $3 in / $15 out
4. Write cost entry to `cost-log.json` via `writeJsonFile()`
5. Always exit 0

**Note on cost-log.json format change**: The shell script uses `sed`-based JSON array appending which produces a specific whitespace format. The TypeScript version uses `JSON.parse()` + array push + `JSON.stringify()` which may produce different whitespace and key ordering. The `tests/parity/cost-track.test.ts` test captures this difference -- if other tools depend on the exact whitespace format of `cost-log.json`, that is a breaking change that should be reviewed by stakeholders before merging.

**Unit tests** (`tests/unit/cost-track.test.ts`):
- `estimateCost`: opus 1M in + 1M out = $90.00; haiku 1M in + 1M out = $1.50; unknown model -> default $18.00
- PostToolUse: records usage and exits 0
- SessionEnd: prints summary to stderr
- No stdin + no env vars -> graceful exit 0

**Parity tests** (`tests/parity/cost-track.test.ts`):
- Note: exact JSON format parity is not expected (see note above). Parity test verifies cost math is identical, not whitespace/key ordering.

**Verification**: 95% branch coverage minimum. All uncovered lines documented.

---

### Step 8 -- Rewrite `keyword-detect` TypeScript hook

**Source file**: `plugins/oma/src/hooks/keyword-detect.ts`
**Compiled to**: `plugins/oma/dist/hooks/keyword-detect.mjs`

**Logic to implement** (parity with `keyword-detect.sh`):
1. Read from `LAST_USER_MESSAGE` env var OR `OMA_DIR/messages.json` (last entry) OR stdin JSON `content` field
2. Keyword list (case-insensitive, first-match wins):
   - `autopilot` -> `/oma:autopilot`
   - `ralph` -> `/oma:ralph`
   - `don't stop` -> `/oma:ralph`
   - `ulw` -> `/oma:ultrawork`
   - `ultrawork` -> `/oma:ultrawork`
   - `ccg` -> `/oma:ccg`
   - `ralplan` -> `/oma:ralplan`
   - `deep interview` -> `/oma:interview`
   - `deslop` -> `/oma:deslop`
   - `anti-slop` -> `/oma:deslop`
   - `canceloma` -> `/oma:cancel`
3. First match: output JSON to stdout and exit 0
4. No match: exit 0

**Note on Unicode handling**: The shell script uses `tr '[:upper:]' '[:lower:]'` for case folding. TypeScript uses `.toLowerCase()` which handles Unicode letters correctly (e.g., `DON'T` -> `don't`). This is a behavioral improvement, not a regression. Parity tests verify that ASCII inputs produce identical outputs; Unicode inputs may differ and the TypeScript behavior is preferred.

**Unit tests** (`tests/unit/keyword-detect.test.ts`):
- Each keyword maps to correct command
- First match wins (keyword list order preserved)
- No match -> exit 0, no stdout
- Empty input -> exit 0, no stdout
- ASCII case variations (`DON'T STOP`, `Don't Stop`) -> `/oma:ralph` (TypeScript preferred behavior)

**Parity tests** (`tests/parity/keyword-detect.test.ts`):
- Compare shell and TypeScript for all ASCII keyword inputs; identical outputs required

**Verification**: 95% branch coverage minimum. All uncovered lines documented. Parity tests pass for ASCII inputs.

---

### Step 9 -- Rewrite `session-start` TypeScript hook

**Source file**: `plugins/oma/src/hooks/session-start.ts`
**Compiled to**: `plugins/oma/dist/hooks/session-start.mjs`

**Logic to implement** (parity with `session-start.sh`):
1. Load `state.json` -> extract `mode`, `active`, `task`
2. If `mode !== 'none'` and `active === true`: output mode restoration context to stdout
3. Load `notepad.json` -> extract `priority` section
4. If `priority` non-empty: output priority context to stdout
5. Output Auggie version if `AUGGIE_VERSION` env var is set
6. All outputs to stdout (not stderr), exit 0

**Unit tests** (`tests/unit/session-start.test.ts`):
- No state -> empty stdout, exit 0
- `mode=ralph, active=true`: stdout contains mode restoration text
- `mode=none`: empty stdout, exit 0
- Priority notepad: stdout includes priority content
- Priority empty/null: skipped

**Parity tests** (`tests/parity/session-start.test.ts`):
- Compare shell and TypeScript for all unit test inputs

**Verification**: 95% branch coverage minimum. All uncovered lines documented. Parity tests pass.

---

### Step 10 -- Set up Vitest configuration and test directory structure

**Action**: Create `plugins/oma/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 95,
        functions: 100,
        lines: 95,
        statements: 95,
      },
      include: ['src/hooks/**/*.ts'],
      exclude: ['src/types.ts', 'src/utils.ts', 'tests/**/*.ts'],
      perFile: true,
    },
  },
});
```

**Coverage gate definition**:
- `branches`, `lines`, `statements`: 95% minimum per file
- `functions`: 100% (all named functions must be called by at least one test)
- Hook source files must meet the threshold. Utility files (`types.ts`, `utils.ts`) are excluded from the threshold but still reported.
- All uncovered lines must have `/* v8 ignore: <specific reason> */` where reason is one of:
  - `unreachable: handled by upstream guard` -- a guard clause upstream prevents this line from being reached
  - `error: fs error path not reproducible in tests` -- error paths that cannot be triggered without mocking the filesystem
  - `platform: only runs on non-Windows` -- platform-specific branches excluded on current platform
  - `git: only runs when git is available` -- git availability check
- Each `/* v8 ignore */` comment must be reviewed in PR. Comments without a specific, justified reason are not accepted.

**Verification**: `vitest run --coverage` produces a coverage report. Uncovered lines are documented. All hook source files show >= 95% branch coverage.

---

### Step 11 -- Write Vitest unit tests for all pure functions

**Location**: `plugins/oma/tests/unit/`

Cover all pure functions across all 7 hooks. Each test file:
- Imports the pure function directly (no subprocess)
- Tests boundary values (empty strings, zero, max values)
- Tests equivalence classes per the Equivalence Class table in Step 11

**Coverage target**: 95% branch, 95% line, 100% function on all `src/hooks/*.ts` files. All uncovered lines documented.

---

### Step 12 -- Write Vitest integration tests (stdin/stdout + file I/O)

**Location**: `plugins/oma/tests/integration/`

Each integration test:
1. Creates a temp directory with a `state.json` or `config.json` matching the scenario (using Node's `os.tmpdir()` or Vitest's `useTempDir()`)
2. Sets `OMA_DIR` to the temp path
3. Imports and calls the hook function directly (not via subprocess) with stdin JSON
4. Verifies exit code and stderr/stdout output content

**Files to create**:
- `tests/integration/delegation-enforce.test.ts`
- `tests/integration/stop-gate.test.ts`
- `tests/integration/approval-gate.test.ts`
- `tests/integration/adr-enforce.test.ts`
- `tests/integration/cost-track.test.ts`
- `tests/integration/keyword-detect.test.ts`
- `tests/integration/session-start.test.ts`

---

### Step 13 -- Write Vitest E2E tests (subprocess spawn)

**Location**: `plugins/oma/tests/e2e/`

Replaces `e2e/oma-core-loop.bats` with Vitest equivalents. Each E2E test:
1. Sets up temp `OMA_DIR` using Node's `os.tmpdir()` (cross-platform; not `mktemp`)
2. Spawns `node dist/hooks/{name}.mjs` via `execa()`
3. Writes JSON to stdin
4. Captures exit code, stdout, stderr
5. Asserts expected values

**Coverage of original bats tests**:
- MCP server JSON-RPC handshake -> covered in integration (existing `.mjs` not rewritten)
- Hook exit codes for all 7 hooks -> E2E tests
- Enterprise profile activation -> integration tests
- Manifest JSON validity -> `vitest e2e/manifest-validity.test.ts`

**Verification**: `vitest run tests/e2e/` passes. All original bats assertions (exit codes, grep checks) covered.

---

### Step 14 -- Behavioral parity test infrastructure and initial parity tests

**Location**: `plugins/oma/tests/parity/`

This step implements the behavioral parity test suite. Before a hook's shell script is considered deprecated, the TypeScript implementation must produce identical outputs (exit code + stderr) to the shell script for the same inputs.

**Infrastructure** (`tests/parity/runner.ts`):
```typescript
// tests/parity/runner.ts
import { execFileSync } from 'child_process';
import { resolve } from 'path';

export interface ParityResult {
  shellExitCode: number;
  tsExitCode: number;
  shellStderr: string;
  tsStderr: string;
  shellStdout: string;
  tsStdout: string;
  identical: boolean;
}

export async function runParity(
  shellScript: string,       // path to original .sh file
  tsBinary: string,          // path to compiled .mjs file
  stdinPayload: HookInput,
  omaDir: string
): Promise<ParityResult> {
  const input = JSON.stringify(stdinPayload);

  const shell = execFileSync('bash', [shellScript], {
    input,
    env: { ...process.env, OMA_DIR: omaDir },
    encoding: 'utf8',
    reject: false,
  });

  const ts = execFileSync('node', [tsBinary], {
    input,
    env: { ...process.env, OMA_DIR: omaDir },
    encoding: 'utf8',
    reject: false,
  });

  return {
    shellExitCode: shell.status ?? 0,
    tsExitCode: ts.status ?? 0,
    shellStderr: shell.stderr,
    tsStderr: ts.stderr,
    shellStdout: shell.stdout,
    tsStdout: ts.stdout,
    identical:
      shell.status === ts.status &&
      shell.stderr.trim() === ts.stderr.trim(),
  };
}
```

**Parity test files** (one per hook):
- `tests/parity/delegation-enforce.test.ts`
- `tests/parity/stop-gate.test.ts`
- `tests/parity/approval-gate.test.ts` (non-expiry inputs only; expiry is new TypeScript feature)
- `tests/parity/adr-enforce.test.ts`
- `tests/parity/cost-track.test.ts` (verifies cost math, not JSON whitespace)
- `tests/parity/keyword-detect.test.ts` (ASCII inputs only)
- `tests/parity/session-start.test.ts`

**When to run parity tests**: Parity tests run in CI alongside unit/integration/e2e tests. A hook's shell script is deleted only in the PR that adds its parity tests and demonstrates identical outputs.

**What counts as identical**:
- Exit code must match exactly
- stderr must match exactly (trimmed of trailing whitespace)
- stdout: varies by hook. For blocking hooks (exit 2), stderr is the authoritative output. For `keyword-detect` and `session-start` (exit 0, stdout), the test documents expected divergence and the TypeScript behavior is accepted.

**Note on `cost-track.json` format**: The parity test for cost-track documents that `JSON.stringify()` output format may differ from the shell script's `sed`-appended format. Cost math (token counts, dollar amounts) must be identical; whitespace and key ordering differences are documented as expected.

---

### Step 15 -- Update `.github/workflows/ci.yml`

Replace bats/shellcheck jobs with Vitest jobs. Update `hooks.json` as a setup step.

**Step 0: Update hooks.json** (runs before any tests):
```yaml
- name: Update hooks.json entry points to .mjs
  run: |
    for hook in session-start delegation-enforce stop-gate approval-gate adr-enforce cost-track keyword-detect; do
      sed -i "s|\${PLUGIN_ROOT}/hooks/\${hook}.sh|\${PLUGIN_ROOT}/hooks/\${hook}.mjs|g" plugins/oma/hooks/hooks.json
    done
    # Verify: no .sh references remain
    if grep -q '\.sh' plugins/oma/hooks/hooks.json; then echo "ERROR: hooks.json still contains .sh references"; exit 1; fi
```

**New `typecheck` job**:
```yaml
- name: TypeScript type check
  run: cd plugins/oma && npx tsc --noEmit
```

**New `vitest-unit` job**:
```yaml
- name: Vitest unit + integration tests
  run: cd plugins/oma && npx vitest run --coverage
```

**New `vitest-e2e` job**:
```yaml
- name: Vitest e2e + parity tests
  run: cd plugins/oma && npx vitest run tests/e2e/ tests/parity/
```

**Windows CI**: The E2E and parity tests require a bash-compatible shell because they spawn `.mjs` files via Node.js. On GitHub Actions `ubuntu-latest`, Node.js + bash are available by default. Windows testing (WSL or Git Bash) is done via:
- **Ubuntu job** (primary): runs all test types including parity tests on `ubuntu-latest` -- sufficient for cross-platform correctness since TypeScript `.mjs` files are platform-agnostic and `normalizePath()` + `path.resolve()` handle path differences
- **Windows CI claim removed**: The plan does not claim a `runs-on: windows-latest` CI job because `windows-latest` in GitHub Actions runs PowerShell, not bash. The Ubuntu job with cross-platform code review and parity tests is the authoritative verification mechanism.

**Updated `validate-manifests` job**: Add check that all `dist/hooks/*.mjs` files exist (npm package integrity).

**Deprecated/removed**: `bats` job (deleted), `shellcheck` job (deleted for hooks; retained for bats test file until it is deleted).

**Verification**: All 3 new CI jobs pass on a branch with the hooks implemented.

---

### Step 16 -- Create root `package.json` for npm distribution

**Action**: Create `package.json` at repo root with:
```json
{
  "name": "@r3dlex/oh-my-auggie",
  "version": "0.3.0",
  "description": "OMA plugin with TypeScript hooks -- Windows-compatible",
  "type": "module",
  "main": "plugins/oma/dist/index.js",
  "exports": {
    ".": {
      "import": "./plugins/oma/dist/index.js"
    }
  },
  "scripts": {
    "test": "cd plugins/oma && vitest run",
    "test:coverage": "cd plugins/oma && vitest run --coverage",
    "build": "cd plugins/oma && tsc",
    "typecheck": "cd plugins/oma && tsc --noEmit"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Note on distribution**: The plugin's `plugins/oma/package.json` is the authoritative one for the Auggie plugin. The root `package.json` exists for npm distribution and local development ergonomics. Vitest is in `devDependencies` only -- consumers of `@r3dlex/oh-my-auggie` do not install devDependencies.

**Verification**: `npm install` at root installs devDeps. `npm run build` runs `tsc` and produces `dist/` output.

---

## Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | `prepare` (dev-time `tsc`) fails on some Node 18 patch versions | Low | High: contributors cannot build | Pin `typescript` as a devDependency. Add Node 18.12, 18.17, 20.x, 22.x to CI matrix. |
| R2 | `process.platform === 'win32'` behavior differs from Linux in path normalization | Medium | Medium: hooks may write to wrong paths on WSL vs Git Bash | All path operations go through `normalizePath()`. Unit tests cover Git Bash-style paths. |
| R3 | 95% branch coverage is achievable but some error paths remain uncovered | Medium | Medium: CI passes but some branches untested | Document uncovered lines with `/* v8 ignore: <reason> */`. PR review verifies each ignore reason is justified. |
| R4 | bats tests deleted before Vitest equivalents exist (coverage gap) | Low | High: regression in behavior not caught | Enforce: bats tests deleted only in the same PR that adds all Vitest tests + parity tests. CI requires all Vitest + parity tests passing before merge. |
| R5 | Conflicting TypeScript versions between root and plugin `package.json` | Low | Low: minor CI noise | Both reference the same `typescript` version range (`^5.4.0`). Use npm dedupe in CI. |
| R6 | `git diff` commands in `adr-enforce` fail silently on detached HEAD | Low | Low: hook allows without checking | Wrap in try/catch. Return empty string on error. Log warning to stderr. Unit test for detached HEAD scenario. |
| R7 | `cost-track.json` format change is a breaking change | Low | Medium: downstream consumers of cost-log.json | Parity test documents expected format difference. If breaking, create an issue before merging and defer format change. |

---

## Verification Steps

| Criterion | Verification Method | Pass Condition |
|-----------|---------------------|----------------|
| AC1 | `ls plugins/oma/src/hooks/*.ts` | 7 files listed |
| AC2 | `node --check plugins/oma/dist/hooks/*.mjs` | All 7 files pass syntax check |
| AC3 | `cd plugins/oma && npx tsc --noEmit` | Exit code 0, zero diagnostics |
| AC4 | Read `plugins/oma/tsconfig.json` | `"module": "NodeNext"`, `"target": "ES2022"`, `"moduleResolution": "NodeNext"`, `"lib": ["ES2022"]` |
| AC5 | `cd plugins/oma && npx vitest run --coverage` | `branches` column shows >= 95.00 for all `src/hooks/*.ts` files; all uncovered lines have documented `/* v8 ignore */` comments |
| AC6 | `vitest run tests/unit/` | All unit tests pass |
| AC7 | `vitest run tests/integration/` | All integration tests pass |
| AC8 | `vitest run tests/e2e/` | All E2E tests pass |
| AC9 | `vitest run tests/parity/` | All parity tests pass (identical exit codes + stderr for shell vs TypeScript) |
| AC10 | `grep '\.sh' plugins/oma/hooks/hooks.json` | Zero results |
| AC11 | `ls e2e/oma-core-loop.bats` | File deleted |
| AC12 | Read `.github/workflows/ci.yml` | Contains `tsc --noEmit`, `vitest run`, coverage threshold steps, and hooks.json update step |
| AC13 | `vitest run tests/e2e/` for each hook | Exit codes match: blocking hooks exit 2 on blocked input, exit 0 on allowed input |
| AC14 | Code review of `normalizePath()` usage | All `fs` operations use normalized paths; no hardcoded `/` in file operations |
| AC15 | `cd plugins/oma && npm ls` | No dependencies listed (only shows root package) |

---

## ADR

**Decision**: Rewrite all 7 OMA shell hooks from bash to TypeScript, compiled to ESM `.mjs`, distributed via npm with committed precompiled output in `dist/` (satisfying zero runtime deps principle) and a `prepare` script for dev-time compilation. bats tests replaced with a Vitest test pyramid (unit + integration + e2e + behavioral parity) enforced by a 95% branch coverage gate (100% enforced via reviewed `/* v8 ignore */` comments) in CI. `hooks.json` updated as an explicit CI step before tests run.

**Drivers**:
- bats CI on Windows requires MSYS2 or Git Bash; TypeScript + Vitest runs on Node 18+ everywhere (WSL, Git Bash, Linux, macOS) with no extra shell layer
- 95% enforceable branch coverage (with documented escape hatch) is achievable; shell scripts have no equivalent coverage tooling
- TypeScript strict mode catches logic errors (null dereferences, type mismatches in JSON parsing) that only surface as runtime bugs in bash
- Committed precompiled output + `prepare` script resolves the tension between the original `postinstall` proposal and the zero-runtime-deps principle

**Alternatives considered**:
1. **Pure bash + MSYS2 path shims**: bats kept as-is, bash scripts enhanced with Windows path detection. **Rejected**: bats-core IS officially supported on Windows via MSYS2 (factual correction to original plan). The real invalidation is that shell scripts cannot achieve enforceable branch coverage -- no equivalent to Vitest's V8 coverage provider exists for bash. MSYS2 is also an extra dependency that pure Node.js avoids.
2. **JavaScript (no TypeScript)**: Rewrite hooks as `.mjs` with JSDoc types. **Rejected**: TypeScript strict mode (`noUncheckedIndexedAccess`, `strictNullChecks`) catches the JSON parsing edge cases in the hooks (e.g., missing fields in hook input), and `tsc --noEmit` provides a zero-cost type-checking gate in CI that JSDoc cannot match.

**Why chosen**: TypeScript + Vitest is the only path that simultaneously delivers Windows compatibility (Vitest runs on Node 18+ everywhere), meaningful enforceable branch coverage, and compile-time type safety for the JSON parsing logic -- all requirements explicitly confirmed by the user.

**Consequences**:
- Positive: Hooks are type-checked, covered, and cross-platform from day one
- Positive: npm distribution ships precompiled `.mjs` with zero runtime dependencies
- Positive: Behavioral parity test suite ensures the TypeScript implementation is verified against the shell scripts before the shell scripts are deleted
- Negative: 95% branch coverage (vs. 100%) means some error paths remain undocumented in coverage reports -- mitigated by the `/* v8 ignore: <reason> */` documentation requirement
- Negative: Two `package.json` files (root + plugin) add maintenance coordination overhead; mitigated by documenting the single source of truth (plugin `package.json`)

**Follow-ups**:
- Evaluate adding a Windows-native CI job via WSL runner (`runs-on: ubuntu-latest` + WSL setup step) to the GitHub Actions matrix to catch real Windows path issues
- Consider migrating the MCP server (`mcp/state-server.mjs`) to TypeScript in a follow-up plan, since it also uses JSON parsing that would benefit from type safety

---

## Expanded Test Plan

### Unit Tests

**Scope**: All pure functions in `src/hooks/*.ts` and `src/utils.ts`.

| File | Functions to Test | Equivalence Classes |
|------|-------------------|---------------------|
| `delegation-enforce.ts` | `isBlockingTool()`, `evaluate()` | blocking tool + active mode; non-blocking tool; inactive mode; no state |
| `stop-gate.ts` | `isRalphMode()`, `hasArchitectPass()`, `evaluate()` | no state; not ralph; ralph no pass; ralph with pass; architect entry present but not PASS |
| `approval-gate.ts` | `getRequiredApproval()`, `hasValidApproval()`, `isApprovalExpired()` | secrets (dual); auth; config; migration; non-sensitive; empty approvals file; expired approval; within clock-skew tolerance; missing expiry field |
| `adr-enforce.ts` | `requiresAdr()`, `hasAdrReference()`, `evaluate()` | API client; migration; auth; interface; >20 files; <20 files; ADR ref in msg; ADR ref in hook input; no ADR dir; git unavailable; detached HEAD |
| `cost-track.ts` | `estimateCost()`, `recordUsage()` | opus; sonnet; haiku; gpt-4o; unknown model; zero tokens; max tokens |
| `keyword-detect.ts` | `detectKeyword()` | each of 11 keywords; no match; empty input; ASCII case variations |
| `session-start.ts` | `buildContext()`, `evaluate()` | active mode + priority; active mode no priority; no state; empty priority |
| `utils.ts` | `readAllStdin()`, `loadOmaState()`, `isEnterpriseProfile()`, `getFilePathsFromInput()`, `writeJsonFile()`, `normalizePath()`, `isApprovalExpired()` | ENOENT; valid JSON; invalid JSON; enterprise profile; community profile; multiple file path keys; Git Bash paths; WSL paths; ISO 8601 expiry; clock-skew tolerance; missing expiry |

**Coverage targets**: 95% branch, 95% line, 100% function on all `src/hooks/*.ts`. All uncovered lines documented with `/* v8 ignore: <reason> */`.

---

### Integration Tests

**Scope**: Each hook exercised with real `fs` operations and simulated stdin.

For each of the 7 hooks:
1. Create temp `OMA_DIR` with scenario-specific state files (using `os.tmpdir()` -- cross-platform)
2. Set `OMA_DIR` env var
3. Call the hook function (imported directly, not via subprocess)
4. Assert exit code and stdout/stderr output

**File locations**:
- `plugins/oma/tests/integration/{hook-name}.test.ts`

---

### E2E Tests

**Scope**: Spawn compiled `.mjs` files as subprocesses, matching the original `e2e/oma-core-loop.bats` test coverage.

**E2E test scenarios** (mapped from bats):

| Original bats test | Vitest E2E equivalent |
|--------------------|-----------------------|
| `Hook: delegation-enforce allows Edit when no state file` | `delegation-enforce.test.ts` -- spawns `node dist/hooks/delegation-enforce.mjs` |
| `Hook: delegation-enforce blocks Edit when mode active` | Same file -- sets `OMA_DIR` + `state.json` |
| `Hook: stop-gate allows stop when no state` | `stop-gate.test.ts` |
| `Hook: stop-gate blocks stop when ralph without architect PASS` | Same file |
| `Hook: stop-gate allows stop when architect PASS exists` | Same file |
| `Enterprise: approval gate blocks secrets` | `approval-gate.test.ts` |
| `Enterprise: approval gate blocks auth changes` | Same file |
| `Enterprise: approval gate blocks migrations` | Same file |
| `Enterprise: approval gate allows community profile` | Same file |
| `Enterprise: adr-enforce allows non-architectural changes` | `adr-enforce.test.ts` |
| MCP server handshake | `mcp-server.test.ts` (import + call directly, no subprocess needed) |
| Manifest JSON validity | `manifest-validity.test.ts` -- `JSON.parse()` each manifest file |

**E2E infrastructure** (`plugins/oma/tests/e2e/helpers/spawn-hook.ts`):
```typescript
export async function spawnHook(
  hookName: string,
  stdinPayload: HookInput,
  omaDir: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return execa('node', [`dist/hooks/${hookName}.mjs`], {
    input: JSON.stringify(stdinPayload),
    env: { ...process.env, OMA_DIR: omaDir },
    reject: false,
  });
}
```

**Observability**: Each E2E test logs `hookName + exitCode + (stderr ? 'ERROR: ' + stderr : 'OK')` to aid CI debugging.

---

### Behavioral Parity Tests

**Scope**: For each hook, run the original shell script and the new TypeScript implementation against identical inputs and verify identical exit codes and stderr content.

**Location**: `plugins/oma/tests/parity/{hook-name}.test.ts`

**Runner**: `tests/parity/runner.ts` (see Step 14 for full implementation)

**Inputs**: Same equivalence class inputs as unit tests.

**Acceptance**: `identical === true` for all inputs. Any divergence requires a documented justification (e.g., Unicode handling improvement in `keyword-detect`, format change in `cost-track`).

**Cost-track exception**: The parity test for cost-track verifies identical cost math outputs; exact JSON whitespace/key ordering is not required (documented as expected divergence).

---

### Observability

**CI reporting**:
- Vitest coverage report published as GitHub Actions artifact (`coverage/` directory)
- Coverage summary printed in CI output as a table
- If coverage threshold fails, CI job fails with exact file:line of uncovered code
- A separate `ci.yml` job runs `vitest run --coverage --reporter=json` and uploads the JSON report for trend tracking

**Coverage threshold** (in `vitest.config.ts`):
```typescript
thresholds: {
  branches: 95,
  functions: 100,
  lines: 95,
  statements: 95,
  perFile: true,
  exclude: ['src/types.ts', 'src/utils.ts', 'tests/**/*.ts'],
}
```

**Pre-mortem (3 failure scenarios)**:

1. **"prepare tsc fails on Node 18.0.0"**: A contributor installs the package on Node 18.0.0 and `tsc` exits with a missing ESM feature error. *Mitigation*: Pin TypeScript to `^5.4.0` (known compatible with Node 18). Add Node 18.0.0 to CI matrix. If it fails, bump minimum to `18.17.0`.

2. **"Coverage gate blocks all PRs due to error branches"**: CI fails because `fs.writeFileSync` error paths (ENOSPC, EPERM, EIO) cannot be triggered in unit tests without mocking. *Mitigation*: Set threshold at 95% branch coverage. Add `/* v8 ignore: error: fs error path not reproducible in tests */` for genuinely untestable error paths with documented rationale reviewed in PR.

3. **"keyword-detect false positive triggers wrong mode"**: A user types "I need to configure the auth settings" and the keyword-detect hook fires for "autopilot" (substring match on "configure") -- blocking a non-matching keyword. *Mitigation*: Unit tests cover all 11 keywords with both positive (match) and negative (similar but non-matching) inputs. Regex uses word boundaries where appropriate.

---

*Plan generated: 2026-04-04*
*Plan revised: 2026-04-04 (addressing architect + critic reviews)*
*Spec source: `.omc/specs/deep-interview-oma-windows-support.md`*
*Critic findings addressed: CRITICAL-1, CRITICAL-2, CRITICAL-3, CRITICAL-4, MAJOR-1, MAJOR-2, MAJOR-3, MAJOR-4*
