# Deep Interview Spec: OMA Windows Support via TypeScript Rewrite

## Metadata
- Interview ID: oma-windows-support-001
- Rounds: 4
- Final Ambiguity Score: 18%
- Type: brownfield
- Generated: 2026-04-04
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.85 | 0.35 | 0.298 |
| Constraint Clarity | 0.85 | 0.25 | 0.213 |
| Success Criteria | 0.80 | 0.25 | 0.200 |
| Context Clarity | 0.75 | 0.15 | 0.113 |
| **Total Clarity** | | | **82.4%** |
| **Ambiguity** | | | **17.6%** |

## Goal

Rewrite the OMA plugin hooks (shell scripts) and optionally related tooling into **TypeScript with a full test pyramid** (unit + integration + e2e via Vitest), distributed as a **precompiled npm package** with automatic TypeScript compilation on install (`postinstall`), so that OMA runs natively on Windows via WSL with 100% branch/condition test coverage using TDD workflow.

## Constraints
- Windows execution target: **WSL or Git Bash** (bash-compatible environment) — Auggie itself runs under WSL on Windows
- All hooks rewritten in TypeScript, compiled to `.mjs` for distribution
- Node.js >=18 required (for ESM and TypeScript support)
- Zero new runtime npm dependencies in compiled output (dev dependencies OK)
- Existing `.mjs` CLI files (`cli/oma.mjs`, `utils.mjs`, etc.) remain as-is — already portable
- npm package uses `postinstall` script to compile TypeScript hooks
- bats tests are replaced with Vitest tests (bats doesn't run natively on Windows)

## Non-Goals
- Native Windows without WSL/bash (not in scope)
- Rewriting existing `.mjs` CLI files to TypeScript (already portable and working)
- CommonJS output — all output must be ESM `.mjs`
- TypeScript compilation step for end users (handled by postinstall)

## Acceptance Criteria
- [ ] All 7 hooks rewritten in TypeScript: `approval-gate.ts`, `adr-enforce.ts`, `cost-track.ts`, `delegation-enforce.ts`, `keyword-detect.ts`, `session-start.ts`, `stop-gate.ts`
- [ ] Hooks compiled to `.mjs` via `tsc`; `.mjs` files distributed via npm package
- [ ] `postinstall` script in package.json runs `tsc` on install
- [ ] Full test pyramid implemented with Vitest: unit tests for pure functions, integration tests for file I/O and process spawning, e2e CLI tests for command invocation
- [ ] 100% branch/condition coverage on all hook logic (measured via Vitest coverage report)
- [ ] All 7 hooks have equivalent behavior to the original shell scripts (verified by test parity)
- [ ] TypeScript compiles with `strict: true` and zero errors
- [ ] `tsconfig.json` targets ESM with Node 18+
- [ ] bats tests replaced by equivalent Vitest tests (same coverage of CLI behavior)
- [ ] CI validates: `tsc --noEmit` + `vitest run` + coverage threshold

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| Shell scripts need to run on Windows natively | Asked: WSL-compatible or native? | User confirmed: WSL/Git Bash is fine — Auggie runs under WSL on Windows |
| bats tests work on Windows | bats doesn't run natively on Windows | Replace bats with Vitest e2e tests (run via Node.js, cross-platform) |
| All surfaces need rewriting | Asked: which surfaces? | User confirmed: all surfaces — hooks + tests + CLI |
| TypeScript with build step | Asked: build vs runtime | User confirmed: TypeScript with `tsc` build step |
| npm package distribution | Asked: how to distribute compiled hooks | User confirmed: npm package with postinstall compile |
| 100% branch coverage achievable | Asked: what kind of coverage? | User confirmed: every branch/condition, boundary + equivalence classes |

## Technical Context

### Current Architecture (brownfield)
- **Shell hooks** (7 files in `plugins/oma/hooks/*.sh`): invoked by Auggie at runtime. Receive JSON payload via stdin, write to `.oma/` state files.
- **CLI** (`cli/*.mjs`): already pure Node.js ESM, zero npm deps, portable.
- **MCP server** (`plugins/oma/mcp/state-server.mjs`): already Node.js ESM, portable.
- **Bats tests** (`e2e/*.bats`): integration-level tests using bash `run` semantics. bats doesn't run on Windows.

### Target Architecture
- **Hooks**: TypeScript source → `tsc` compile → `.mjs` output distributed via npm
- **Tests**: Vitest (unit + integration + e2e) replacing bats
- **Package**: `@r3dlex/oh-my-auggie` or similar, with `postinstall: tsc`
- **CI**: `tsc --noEmit` (type check) + `vitest run` (tests) + coverage threshold enforcement

### Hook stdin/stdout Protocol (preserved)
Hooks receive a JSON payload via stdin and output decisions via exit code:
- Exit 0 = allow/proceed
- Exit 2 = block/require approval
- stdout can output a JSON message

This protocol must be preserved in the TypeScript rewrite.

### Equivalence Classes for Hook Logic
Each hook has distinct input categories:
- **approval-gate**: paths matching sensitive patterns (auth, config, migrations, secrets)
- **adr-enforce**: number of files changed + path patterns (architectural decision required if >20 files)
- **cost-track**: model name, token counts, timestamps
- **delegation-enforce**: active mode (ralph/ultrawork/etc), tool being invoked
- **keyword-detect**: detected keyword in tool call output
- **session-start**: session start time, active mode
- **stop-gate**: current mode, agent name

### Test Coverage Strategy
1. **Unit tests**: Pure function tests for each hook's core logic (e.g., `parseApprovalGateInput()`, `detectAdrPattern()`, `classifyCostEntry()`)
2. **Integration tests**: Test hook with real stdin/stdout, verifying exit codes and file writes
3. **E2E tests**: Spawn `node hook.mjs` as subprocess, feed stdin, verify exit + stdout + file state
4. **Coverage gate**: Vitest `coverageThresholds.branch` set to 100%

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Hook | core domain | name, type (PreToolUse/PostToolUse/Stop/SessionStart), stdin schema, exit codes | invoked by Auggie; reads/writes .oma state files |
| HookInput | supporting | mode, agent, tool, arguments, timestamp | parsed by Hook |
| HookOutput | supporting | decision (allow/block), reason, message | written to stdout by Hook |
| OmaState | supporting | mode, iteration, active, task | read by Hooks via grep from .oma/state.json |
| ApprovalRule | core domain | pattern (regex), severity, approvers, description | evaluated by approval-gate |
| CostEntry | core domain | model, inputTokens, outputTokens, timestamp, estimatedCost | written by cost-track hook |
| TeamWorker | core domain | id, pid, status, parent_pid, spawned_at, task | managed by teamSpawn/teamShutdown CLI |
| CLICommand | core domain | name, argv, flags, exitCode | parsed by oma.mjs dispatcher |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 3 | 3 | - | - | N/A |
| 2 | 5 | 2 | 0 | 3 | 60% |
| 3 | 7 | 2 | 0 | 5 | 71% |
| 4 | 8 | 1 | 0 | 7 | 88% |

## Interview Transcript
<details>
<summary>Full Q&A (4 rounds)</summary>

### Round 1
**Q:** Which part are you primarily trying to make work on Windows?
**A:** All of them.

### Round 2
**Q:** "Windows support" can mean two very different things: WSL/Git Bash compatible vs native Windows. Which is it?
**A:** I am more of the second approach, by using a real language to create oma and not just bash.

### Round 3
**Q:** When you say "rewrite everything in Node.js" — does this include making Auggie's hook invocation also work on Windows? (Option A: Node.js hooks invoked by Auggie via WSL)
**A:** A and I am okay on running auggie on Windows only WSL.

### Round 4
**Q:** TypeScript with build step? npm package with postinstall? Any preference on distribution model?
**A:** Any recommendation? I think the npm package makes more sense. (User confirmed: TypeScript with build step + npm package with postinstall)
**A:** Could the plugin files be provided precompiled? (User confirmed: yes, precompiled .mjs files in npm package)
</details>
