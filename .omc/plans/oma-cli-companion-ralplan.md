# OMA CLI Companion — Implementation Plan (Revised)

**Plan file:** `.omc/plans/oma-cli-companion-ralplan.md`
**Type:** RALPLAN-DR deliberate mode (brownfield)
**Generated:** 2026-04-04
**Revision note:** Resolves all Architect/Critic blockers from the previous RALPLAN-DR review. See Section 8 for the diff from the prior plan.

---

## 1. Requirements Summary

- **`oma team N "task"`** — Spawn N background `claude-code` CLI workers (headless, `--print --dangerously-skip-permissions`) that execute the task; capture stdout/stderr to `.oma/team/worker-{n}/log.txt`; write per-worker `status.json` under `.oma/team/worker-{n}/status.json`; support `oma team status [--json]` and `oma team shutdown`.

- **`oma hud [--watch]`** — TUI panel showing: current mode + task + iteration, live activity feed from `.oma/team/worker-{n}/log.txt` files (tail of last 3 lines per worker), worker completion count. Cost display is REMOVED (see CRITICAL #2 fix below). `--watch` polls every 1.5 s; plain `oma hud` prints snapshot and exits. Clean Ctrl+C exit.

- **`oma doctor [--ci]`** — Offline diagnostics: (no flag) reads `.oma/state.json` and log files directly, reports last-known state, detects corrupt/missing files; `--install` checks plugin install and manifest validity without Auggie running; `--ci` runs `bats e2e/oma-core-loop.bats`, shellcheck on all `.sh` files, and JSON manifest validation.

- **MCP tools** — Extend `state-server.mjs` with `oma_team_status` and `oma_team_stream` tools so Auggie sessions can poll worker progress over the existing stdio MCP connection.

- **Distribution** — Shell wrapper (`#!/bin/sh` portable, resolves Node.js script relative to itself) requiring Node.js 18+ on the host. No bundler. No npm deps. macOS + Linux.

---

## 2. RALPLAN-DR Summary

### Principles (5)
1. **Same-stack**: Node.js ESM (zero npm deps) + POSIX shell. Same patterns as `state-server.mjs` and hooks.
2. **State-file as integration contract**: All inter-process communication goes through `.oma/team/worker-{n}/*.json` files. Auggie sees workers via MCP polling, never via inbound connections.
3. **Per-worker isolation**: Each worker gets its own directory (`.oma/team/worker-{n}/`). All writes are per-worker, eliminating the race condition on a shared JSON file. A parent aggregator reads them on demand.
4. **CI-native diagnostics**: `oma doctor --ci` mirrors the exact CI pipeline (bats + shellcheck + JSON validation) so failures are reproducible locally.
5. **Additive-only**: The CLI companion does not modify or replace any existing plugin component.

### Decision Drivers (top 3)
- **D1 — Verified worker CLI**: `auggie` has no headless/background mode. Claude Code's `claude-code` CLI with `--print --dangerously-skip-permissions` is the only documented, viable path for spawning background workers.
- **D2 — Concurrent write safety**: Per-worker directories with atomic file writes (write-to-temp + rename) prevent data loss from simultaneous worker updates.
- **D3 — Testability**: `bats` tests must exercise the CLI directly; shell wrapper + ESM script is easier to test than a compiled binary.

### Options Considered

**Option A — Shell wrapper + Node.js ESM script (chosen)**
- `bin/oma` is a 10-line POSIX shell script that sets `OMA_DIR`, resolves the Node.js script relative to its own location, and dispatches subcommands.
- `cli/oma.mjs` is the full Node.js CLI: arg parsing, subcommand routing, all business logic. Zero npm deps.
- Workers: `cli/workers/spawn.mjs` spawns `claude-code --print --dangerously-skip-permissions --no-session-persistence "<task>"` in background.
- Pros: No build step, same stack as codebase, easy to test, trivial to install (copy two files + workers dir).
- Cons: Requires Node.js 18+ on host.

**Option B — `auggie --task "..."` as worker CLI (rejected)**
- The `auggie` CLI (and its `archgate` parent) has no headless, non-interactive, or background mode. Its documented commands are only `init`, `check`, `login`. There is no `--task`, `--agent`, or equivalent flag. This option does not exist.

**Invalidation rationale for Option B:** The `auggie` CLI documentation at `augmentcode.com/docs/cli` shows only interactive commands. The `archgate` source at `cli.archgate.dev` confirms the same. There is zero evidence of a background spawning interface.

**Option C — `pkg` bundler (rejected)**
- Produces 30-60 MB self-contained binary but requires a build pipeline, produces large artifacts, and contradicts "same stack" principle.

**Invalidation rationale for Option C:** The codebase has zero npm deps and is intentionally lightweight. Adding a build pipeline and large binary artifacts for a utility CLI is disproportionate.

---

## 3. Architecture

### CRITICAL #1 Resolution: Worker CLI

The rejected plan assumed `auggie --task "..."` could spawn background workers. Evidence:
- `auggie`/`archgate` CLI only has: `init`, `check`, `login` (confirmed via `cli.archgate.dev` and `augmentcode.com/docs/cli`)
- No `--task`, `--agent`, or headless flag exists
- OMA codebase already references `claude-code` (Claude Code's CLI)

**Resolution:** Workers spawn `claude-code --print --dangerously-skip-permissions --no-session-persistence "<task>"` via Node.js `child_process.spawn`. This is a known, documented, headless invocation pattern for Claude Code. Fallback detection: if `claude-code` is not in `$PATH`, `oma team` prints a clear error with install instructions.

### CRITICAL #2 Resolution: Cost Display Removed

`cost-track.sh` never writes accumulated data to `cost-log.json`. The `record_tool_usage` function calls `update_session_tools` which logs to stderr (`>&2`) and returns the original JSON unchanged. The `write_cost_log` helper is defined but never called with updated data.

**Resolution:** Remove cost display from the HUD spec entirely. The HUD now shows: mode, iteration, task name (from `state.json`), and worker activity feed (from worker log files). A separate `oma cost` command (deferred to v1.1) can display cost data once the hook integration is properly designed with Auggie's actual environment variable contract.

### CRITICAL #3 Resolution: Activity Feed Source Changed

`task.log.json` has no producer. `appendTaskLog()` in `state-server.mjs` is never called by any hook.

**Resolution:** HUD activity feed reads directly from worker log files: for each active worker, read the last 3 lines of `.oma/team/worker-{n}/log.txt`. This is accurate because workers write every line they produce to these log files via `tee`.

### CRITICAL #4 Resolution: Per-Worker Directories

Multiple workers writing to the same `status.json` simultaneously causes data loss.

**Resolution:** Each worker gets its own directory: `.oma/team/worker-{n}/`. Inside:
- `status.json` — written by the worker itself (Node.js atomic write: write to temp + `fsync` + rename)
- `log.txt` — stdout/stderr of the worker process
- `meta.json` — static metadata: worker id, parent_pid, spawned_at, task (truncated)

The `oma_team_status` MCP tool and `oma team status` command aggregate all per-worker `meta.json` files at read time (no concurrent writes to a shared file).

### CRITICAL #5 Resolution: Orphaned Worker Detection

No mechanism to detect when workers outlive their parent Auggie session.

**Resolution:**
1. Each worker writes its parent PID to `worker-{n}/meta.json` on startup.
2. On each `oma team` invocation, scan `.oma/team/worker-{n}/meta.json` for entries whose `parent_pid` no longer exists (`kill -0 <pid>` returns non-zero).
3. If stale workers found: warn the user, print their IDs and last-seen timestamps. Exit with code 1 if `oma team spawn` was called with stale workers still present.
4. `oma team shutdown --stale` flag: forcibly terminates stale workers (SIGTERM, 5s timeout, SIGKILL).

### CRITICAL #6 Resolution: JSON Manipulation in cost-track.sh

`get_or_create_session` uses fragile `grep`/`sed` to manipulate JSON, which breaks on special characters.

**Resolution:** This hook is no longer in the critical path for the HUD (cost display removed from HUD). The hook will be revised in a follow-up iteration (v1.1) once the Auggie environment variable contract for tool usage data is confirmed.

---

## 4. Implementation Steps

### Step 1 — CLI scaffold and shell wrapper

**Files created:**
- `bin/oma` — POSIX shell script (`#!/bin/sh`, no bashisms). Sets `OMA_DIR` from `$PWD/.oma` or `$HOME/.oma`, resolves `cli/oma.mjs` relative to the script's own location using `dirname`, dispatches subcommands via `node`.
- `cli/oma.mjs` — ESM entry point. Parses `--json`, `--watch`, `--ci`, `--install` flags. Routes to subcommand handlers. Exits 0/1/2.
- `cli/utils.mjs` — Shared utilities: `resolveOmaDir()`, `atomicWrite(path, data)`, `readJsonSafe(path, fallback)`, `ansiBox(lines, width=80)`.

**Acceptance criteria:**
- `bin/oma --help` prints a usage summary listing all three commands and flags.
- `node cli/oma.mjs --help` works identically.
- `bin/oma` is executable (`chmod +x`).
- Shell script uses `#!/bin/sh` (not `#!/usr/bin/env node`). All Node.js code runs from `cli/oma.mjs`.

---

### Step 2 — `oma team` subcommand

**Files created:**
- `cli/commands/team.mjs` — `teamSpawn(N, task, opts)`, `teamStatus(jsonFlag)`, `teamShutdown(opts)`, `detectStaleWorkers()`.
- `cli/workers/wrapper.mjs` — Worker entry point. Called by `teamSpawn` via `child_process.spawn`. Accepts `--id <n> --oma-dir <path> --task <escaped-task>`.

**Logic — `teamSpawn`:**
1. Resolve `OMA_DIR` (walk up from `$PWD` for `.oma/`, fallback `$HOME/.oma`).
2. Create `.oma/team/` if absent.
3. Scan existing `worker-{n}/` dirs. Run `detectStaleWorkers()`: for each, `kill -0 <parent_pid>` (from `meta.json`). If stale and called without `--force`: print warning and exit 1.
4. Determine next worker ID (max existing + 1).
5. For each worker `i` in `[id, id+N-1]`:
   - Create `.oma/team/worker-{i}/`.
   - Write `.oma/team/worker-{i}/meta.json` (id, parent_pid: `$$`, spawned_at, task truncated to 200 chars).
   - Spawn `claude-code --print --dangerously-skip-permissions --no-session-persistence "<escaped-task>"` as background child process (detached: `child.unref()`, `stdio: ['pipe', 'pipe', 'pipe']`).
   - Stream stdout+stderr to `.oma/team/worker-{i}/log.txt` via `fs.createWriteStream`.
   - Pipe a JSON status update to the worker process stdin when it starts (worker writes its own initial `status.json`).
   - Write `.oma/team/worker-{i}/status.json` with `{status: "running", pid, started_at}`.
6. Write `.oma/team/status.json` (aggregated, safe to write sequentially since it's only written by the parent CLI, not workers).

**Logic — `teamStatus`:**
1. Read all `worker-{n}/meta.json` files from `.oma/team/`.
2. For each, read `worker-{n}/status.json` and last 3 lines of `log.txt`.
3. Return tabular text or JSON.

**Logic — `teamShutdown`:**
1. Read all `worker-{n}/status.json` files.
2. For each running worker: send SIGTERM. After 5s, send SIGKILL.
3. Remove all `worker-{n}/` directories.
4. Remove `.oma/team/status.json`.

**Atomic write helper** (used in all worker status writes):
```javascript
// Write to temp file in same dir, then rename (atomic on POSIX)
const tmp = path + '.tmp.' + process.pid;
writeFileSync(tmp, JSON.stringify(data), 'utf8');
fsyncSync(openSync(tmp, 'r+'));   // optional safety
renameSync(tmp, path);
```

**Acceptance criteria:**
- `bin/oma team 2 "echo hello"` creates `.oma/team/worker-1/` and `.oma/team/worker-2/` with `meta.json`, `status.json`, `log.txt`.
- `claude-code` not in `$PATH`: prints friendly error with install instructions, exits 2.
- `bin/oma team status` shows running workers with last 3 log lines.
- `bin/oma team status --json` returns valid JSON.
- `bin/oma team shutdown` terminates workers and removes directories.
- With stale workers present, `oma team spawn` warns and exits 1; `oma team spawn --force` proceeds after printing stale warning.
- `oma team shutdown --stale` cleans up stale workers even if parent PID is dead.

---

### Step 3 — `oma hud` subcommand

**Files created:**
- `cli/commands/hud.mjs` — `hudSnapshot()`, `hudWatch(intervalMs=1500)`.

**Logic — `hudSnapshot`:**
- Reads `.oma/state.json` (mode, iteration, task) and all `worker-{n}/status.json` and `worker-{n}/log.txt` (last 3 lines each).
- Renders a fixed-width (80-char) ANSI box-drawing panel:
  ```
  ┌─ OMA HUD ──────────────────────────────────────────────────────┐
  │ Mode:     ralph       Iteration: 3/6                            │
  │ Task:     fix auth bug                                          │
  │ Workers:  1/3 running   [running] [running] [done]              │
  │ ── Activity ────────────────────────────────────────────────── │
  │ [worker-1] worker done: test suite PASS (12 tests)              │
  │ [worker-2] + implement OAuth refresh token                       │
  │ [worker-3] worker done: linter fixes applied                    │
  └──────────────────────────────────────────────────────────────────┘
  ```
- Cost display is NOT shown (CRITICAL #2 resolution: hook does not write meaningful data).
- Missing files: show `n/a` for missing fields, never crash.

**Logic — `hudWatch`:**
- Loops `hudSnapshot()` every 1500 ms via `setInterval`.
- Registers `process.on('SIGINT')` and `process.on('SIGTERM')` for clean exit (exit code 0, print newline).

**Acceptance criteria:**
- `bin/oma hud` renders panel and exits within 200 ms.
- `bin/oma hud --watch` updates every ~1.5 s; Ctrl+C exits with code 0 and prints a newline.
- HUD shows "no state" when `.oma/state.json` does not exist.
- HUD shows "no active team" when `.oma/team/` does not exist.
- HUD degrades gracefully if any worker dir is corrupt or missing.

---

### Step 4 — `oma doctor` subcommand

**Files created:**
- `cli/commands/doctor.mjs` — `doctorOffline()`, `doctorInstall()`, `doctorCI()`.

**Logic — `doctorOffline`:**
- Reads `.oma/state.json` (handles missing/corrupt gracefully).
- Reads last 5 entries from each `worker-{n}/log.txt`.
- Returns mode, iteration, last worker activity, team summary.
- Exit 0 if all readable, exit 1 if some missing, exit 2 if critical files absent.

**Logic — `doctorInstall`:**
- Checks `plugins/oma/.augment-plugin/plugin.json` exists and parses.
- Checks `plugins/oma/mcp/state-server.mjs` is readable.
- Checks `plugins/oma/hooks/hooks.json` parses and lists all registered hook types.
- Validates all JSON manifests (`plugin.json`, `hooks.json`, `.mcp.json`, `marketplace.json`).
- Exit 0 on all pass.

**Logic — `doctorCI`:**
- Spawns `bats e2e/oma-core-loop.bats` from repo root.
- Runs `shellcheck plugins/oma/hooks/*.sh` (each file individually, ignores SC1090).
- Runs JSON manifest validation loop (same logic as bats tests).
- Reports pass/fail per step.
- Exit code matches worst failure (2 > 1 > 0).

**Acceptance criteria:**
- `bin/oma doctor` (no Auggie running) prints state report and exits 0.
- `bin/oma doctor --install` reports which files pass/fail.
- `bin/oma doctor --ci` runs full CI suite and exits non-zero if any test fails.

---

### Step 5 — MCP server team tools

**File modified:**
- `plugins/oma/mcp/state-server.mjs` — Add two new tool entries: `oma_team_status` and `oma_team_stream`.

**Logic — `oma_team_status`:**
- Reads all `worker-{n}/meta.json` and `worker-{n}/status.json` from `.oma/team/`.
- Returns `{ok, workers: [{id, status, pid, parent_pid, spawned_at, log_path}]}`.
- Gracefully handles missing team directory (`ok: true, workers: []`).

**Logic — `oma_team_stream`:**
- Reads all `worker-{n}/status.json` from `.oma/team/`.
- Returns `{ok, streams: [{id, status, excerpt}]}` where `excerpt` is last 20 lines of `log.txt`.
- Gracefully handles missing files (`ok: false, error: "..."` does not crash; returns `ok: true` with empty excerpt).

**Acceptance criteria:**
- `tools/list` now includes `oma_team_status` and `oma_team_stream`.
- Both tools return valid JSON and handle missing team files gracefully (never throw; return `ok: false` with error message).
- Existing bats tests continue to pass (no regression in existing 7 tools).

---

### Step 6 — Bats e2e tests for CLI

**File created:**
- `e2e/oma-cli.bats` — 15–20 bats tests covering all three commands in a temp state dir.

**Tests:**
- `oma team 2 "echo test"` creates correct per-worker directories and files.
- `oma team status` and `oma team status --json` return correct output.
- `oma team shutdown` cleans up.
- `oma team spawn` with stale workers warns and exits 1.
- `oma team spawn --force` proceeds past stale workers.
- `oma hud` exits cleanly and produces ANSI output (lasts < 200ms).
- `oma hud --watch` starts and exits on SIGINT with exit code 0.
- `oma doctor` handles missing state files without crashing.
- `oma doctor --install` reports pass/fail.
- `oma doctor --ci` runs bats and reports exit code.

**Note:** Tests mock `claude-code` with a local shell script that echoes and exits 0, placed in a temp `$PATH` directory, so tests run without requiring actual Claude Code installation.

---

### Step 7 — CI integration

**File modified:**
- `.github/workflows/ci.yml` — Add a new `cli` job alongside `bats`, `shellcheck`, `validate-manifests`. Runs `e2e/oma-cli.bats`.

---

## 5. Acceptance Criteria

### `oma team N "task"`
- [ ] `oma team 3 "fix the login bug"` creates `.oma/team/` with `worker-1/`, `worker-2/`, `worker-3/` each containing `meta.json`, `status.json`, `log.txt`.
- [ ] Each worker log captures the worker's stdout/stderr.
- [ ] `claude-code` not in `$PATH`: exits 2 with a helpful error message.
- [ ] `oma team status` outputs a readable table: worker id, status (running/done/error), PID, last 3 log lines.
- [ ] `oma team status --json` outputs valid JSON with the same data.
- [ ] `oma team shutdown` terminates all running workers and removes directories.
- [ ] Stale workers (dead parent PID) detected on next `oma team` call: warning printed, exits 1.
- [ ] `oma team shutdown --stale` forcibly terminates stale workers.
- [ ] If team dir does not exist, `oma team status` exits 0 with "no active team" message.

### `oma hud [--watch]`
- [ ] `oma hud` renders current mode, iteration, task name, worker statuses, and last 3 activity lines per worker, then exits 0.
- [ ] `oma hud --watch` re-renders every ~1.5 s until Ctrl+C; Ctrl+C exits with code 0.
- [ ] All data read from `.oma/state.json` and `.oma/team/worker-{n}/*` directly; no MCP connection required.
- [ ] HUD degrades gracefully if any file is missing or corrupt (shows "n/a" for missing fields, does not crash).
- [ ] Cost/token data is NOT displayed (CRITICAL #2 resolution).

### `oma doctor [--ci]`
- [ ] `oma doctor` (offline): reads state files directly, reports mode/iteration, last worker activity. Exit 0 if all readable, exit 1 if some missing, exit 2 if critical files absent.
- [ ] `oma doctor --install`: checks plugin manifest, MCP server file, all JSON manifests. Reports pass/fail per file.
- [ ] `oma doctor --ci`: runs `bats e2e/oma-core-loop.bats`, shellcheck on `plugins/oma/hooks/*.sh`, and JSON manifest validation. Reports pass/fail per step.
- [ ] Exit code reflects worst failure across all checks.

---

## 6. Risks and Mitigations

### Risk 1 — `claude-code` CLI availability
Workers spawn `claude-code` via `--print --dangerously-skip-permissions`. If not in `$PATH`, workers fail immediately.

**Mitigation:** `oma team spawn` checks `which claude-code` before spawning any workers. If not found, prints a clear error with install instructions (`brew install claude-code` / `npm install -g @anthropic-ai/claude-code`) and exits 2. `doctor --install` optionally checks `claude-code --version` and warns if not found.

### Risk 2 — Worker log file accumulation on crash
If a worker process is killed (OOM, SIGKILL), its `status.json` may remain "running" forever.

**Mitigation:** `detectStaleWorkers()` checks parent PID liveness. `teamSpawn` refuses to proceed past stale workers without `--force`. `teamShutdown --stale` handles this cleanup path explicitly.

### Risk 3 — `.oma/` directory in wrong location
If the user runs `oma` from a subdirectory, `OMA_DIR` resolves to a different path than the active Auggie session (which writes to the repo root).

**Mitigation:** `bin/oma` walks up from `$PWD` to find the nearest ancestor containing `.oma/`. Falls back to `$HOME/.oma` if none found. Prints a warning if the resolved OMA_DIR differs from `$PWD/.oma` (when both exist). Documents the expected usage: run `oma` from the same directory as the Auggie session.

### Risk 4 — MCP polling latency for worker status
Auggie polls `oma_team_status` on an interval; there may be a 5–30 s lag before a worker completion is reflected.

**Mitigation:** Workers write `status.json` on every status change (start, done, error). The MCP tool does a direct file read with no caching. Document this latency explicitly in the HUD output and in the command help.

### Risk 5 — `pkg` bundler temptation from reviewers
Future contributors may propose bundling to avoid Node.js dependency.

**Mitigation:** This ADR documents why shell wrapper is chosen. The constraint is recorded in the plan and in `CLAUDE.md`. If a user community requests a bundled binary, revisit with a dedicated ADR after v1 ships.

### Risk 6 — `cost-track.sh` never writes data (follow-up)
The hook's `record_tool_usage` function logs to stderr but never calls `write_cost_log` with updated data.

**Mitigation:** This is documented as a v1.1 follow-up. The HUD cost display has been removed from v1 scope. The hook will be revised once Auggie's actual environment variable contract for PostToolUse data (model name, token counts, duration) is confirmed.

---

## 7. Verification Steps

1. **`node cli/oma.mjs --help`** — prints all three subcommands and all flags.
2. **`bin/oma --help`** — identical output to step 1.
3. **`node e2e/oma-cli.bats`** — all tests pass (with mocked `claude-code` in `$PATH`).
4. **`bats e2e/oma-cli.bats`** — all tests pass via bats runner.
5. **`oma doctor`** (no `.oma/` present) — exits 0, prints "no state file found" gracefully.
6. **`oma doctor --install`** — runs against actual plugin files; all pass.
7. **`oma hud`** — renders ANSI panel within 200 ms and exits.
8. **`oma team status`** (no team) — exits 0, prints "no active team".
9. **`bats e2e/oma-core-loop.bats`** — existing tests still pass (no regression).
10. **`shellcheck plugins/oma/hooks/*.sh`** — no errors.
11. **MCP `tools/list`** via `printf` + `node state-server.mjs` — includes `oma_team_status` and `oma_team_stream`.
12. **`gh run view`** (CI) — all four jobs (`bats`, `shellcheck`, `validate-manifests`, `cli`) pass on the PR branch.

---

## 8. Changes from Previous Plan

| Issue | Previous Plan | Revised Plan |
|-------|--------------|--------------|
| **CRITICAL #1** Worker CLI | `auggie --task "..."` (unverified) | `claude-code --print --dangerously-skip-permissions --no-session-persistence "<task>"` (verified) |
| **CRITICAL #2** Cost display | HUD reads `cost-log.json` (always empty) | Cost display removed from HUD; deferred to v1.1 |
| **CRITICAL #3** task.log.json | HUD reads `task.log.json` (no producer) | HUD reads last 3 lines of `worker-{n}/log.txt` (workers produce this) |
| **MAJOR #4** Race condition | Shared `status.json` | Per-worker `worker-{n}/status.json` with atomic rename writes |
| **MAJOR #5** Orphaned workers | None | Parent PID tracking + `kill -0` stale detection + `--stale` shutdown |
| **MAJOR #6** sed JSON fragility | `cost-track.sh` sed manipulation | Hook revision deferred to v1.1 (hook no longer in critical path) |
| **Minor** Shebang | `#!/usr/bin/env node` for shell script | `#!/bin/sh` for shell wrapper; all logic in Node.js ESM |
| **ADR** | Option B invalidation missing | Added explicit invalidation of `auggie --task` (Option B), which does not exist |

---

## ADR

**Decision:** Use shell wrapper (`#!/bin/sh` + Node.js ESM CLI) for distribution. Workers invoke `claude-code --print --dangerously-skip-permissions` headlessly. Do not bundle with `pkg` or `nexe`. Do not use `auggie` as a worker CLI (no headless mode exists).

**Drivers:** D1 — `auggie` has no background/headless CLI interface; Claude Code's `claude-code` CLI with `--print` is the only verified path. D2 — per-worker directories eliminate concurrent-write race conditions. D3 — same lightweight stack as the rest of OMA (zero npm deps). D4 — easier bats testing of the live script. D5 — smaller distribution footprint.

**Alternatives considered:**
- `auggie --task "..."`: No such interface exists. The `auggie`/`archgate` CLI only has `init`, `check`, `login`. No `--task`, `--agent`, or headless flag. Rejected — does not exist.
- `pkg` bundler: Requires build pipeline, produces 30–60 MB artifacts, pkg is semi-maintained. Rejected — disproportionate for a utility CLI.
- `nexe`: Similar to pkg. Rejected.

**Why chosen:** The combination of `claude-code --print` (documented, headless invocation) + per-worker directories (concurrent-safe) + shell wrapper (zero build) satisfies all hard constraints with no unverified assumptions.

**Consequences:**
- Users must have both Node.js 18+ and Claude Code CLI installed. This adds one new requirement (Claude Code CLI) compared to Auggie-only usage.
- Workers run in the same repo directory as the parent Auggie session. They are independent processes with no shared context.

**Follow-ups:**
- v1.1: Fix `cost-track.sh` to properly write accumulated cost data to `cost-log.json`. Requires confirming Auggie's actual PostToolUse environment variable contract (model name, token counts, duration).
- If a user community requests a bundled binary, revisit with a dedicated ADR after v1 ships.
- Consider auto-install script that detects Node.js + Claude Code CLI versions and installs them if missing (defer to a future iteration).
