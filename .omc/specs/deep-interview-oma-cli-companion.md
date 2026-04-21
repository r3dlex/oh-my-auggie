# Deep Interview Spec: OMA CLI Companion

## Metadata
- Interview ID: oma-tech-stack-001
- Rounds: 6
- Final Ambiguity Score: 18%
- Type: brownfield
- Generated: 2026-04-04
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.88 | 0.35 | 0.31 |
| Constraint Clarity | 0.88 | 0.25 | 0.22 |
| Success Criteria | 0.72 | 0.25 | 0.18 |
| Context Clarity | 0.85 | 0.15 | 0.13 |
| **Total Clarity** | | | **0.84** |
| **Ambiguity** | | | **18%** |

## Goal
Build the OMA CLI companion (`oma`) — a Node.js + shell CLI tool that provides out-of-session observability and orchestration for Auggie/OMA workflows. Three core capabilities: parallel team execution, persistent HUD overlay, and offline diagnostics. Replaces the previously planned Elixir/Burrito stack.

## Constraints
- Auggie is MCP-client-only: plugins cannot open inbound MCP connections to Auggie. MCP streaming approach is invalid.
- Auggie has no native tmux integration. tmux panes cannot appear inside Auggie's UI.
- OMA codebase is 100% Node.js (MCP stdio server, zero npm deps) + shell hooks. CLI companion must use the same stack.
- State files (`.oma/*.json`) are the integration point between Auggie sessions and the CLI.
- Enterprise profile is additive-only (existing constraint from v0.1).
- No new runtime dependencies — must work on macOS + Linux.

## Non-Goals
- Elixir/Burrito is explicitly rejected — wrong stack for this codebase.
- tmux-native Auggie integration is not possible (no such Auggie primitive).
- Replacing or modifying the existing Auggie plugin is out of scope.
- MCP client connections to Auggie are not supported by the plugin model.

## Acceptance Criteria

### `oma team N "task"`
- [ ] `oma team 3 "fix the login bug"` spawns 3 background processes
- [ ] Each worker runs `auggie` CLI with appropriate agent/task arguments
- [ ] stdout/stderr captured to `.oma/team/worker-{1,2,3}.log`
- [ ] `oma team status` reads logs and returns JSON: worker id, status (running/done/error), stdout excerpt
- [ ] `oma team status --json` returns machine-readable full output
- [ ] `oma team shutdown` terminates all running workers and cleans up log files
- [ ] MCP state server exposes `oma_team_status` and `oma_team_stream` tools
- [ ] Auggie session can poll `oma_team_status` via existing MCP connection to see worker progress

### `oma hud --watch`
- [ ] TUI panel appears in terminal, showing:
  - Current mode + task name + iteration count
  - Token usage + estimated cost (from `.oma/cost-log.json`)
  - Live activity feed (agent verdicts, tool calls from `.oma/task.log.json`)
  - Worker status (N of M completed, if team workers are running)
- [ ] Updates via polling every 1-2 seconds (reads `.oma/state.json`, `.oma/cost-log.json`, `.oma/task.log.json`)
- [ ] `oma hud` (non-watch) prints current state snapshot and exits
- [ ] Clean exit on Ctrl+C

### `oma doctor`
- [ ] `oma doctor` (offline): checks when MCP server is not running
  - Reads `.oma/state.json`, `.oma/*.log` directly
  - Reports last known state, active mode, recent verdicts
  - Detects corrupt or missing state files
- [ ] `oma doctor --install`: checks without Auggie running
  - Verifies OMA plugin is installed (`plugins/oma/.augment-plugin/plugin.json` exists)
  - Verifies MCP server binary is present and executable
  - Validates all JSON manifests (plugin.json, hooks.json, .mcp.json, marketplace.json)
- [ ] `oma doctor --ci`: runs CI self-check
  - Runs bats e2e tests (`bats e2e/oma-core-loop.bats`)
  - Runs shellcheck on all `.sh` files
  - Validates JSON manifests
  - Reports pass/fail with the same output CI would show

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| Elixir/Burrito for CLI companion | Never justified; codebase is Node.js+shell | Rejected. Use same stack: Node.js CLI + shell. |
| MCP streaming to Auggie | Auggie is MCP-client-only; cannot receive inbound connections | Rejected. Workers write to state files; Auggie polls MCP tools. |
| tmux panes visible in Auggie | Auggie has no native tmux integration | Rejected. tmux panes are user-terminal only; Auggie session sees workers via MCP polling. |

## Technical Context

### Integration Architecture
```
Auggie Session (plugin process)
  └── MCP state-server.mjs (stdio)
        ├── reads: .oma/state.json, .oma/notepad.json, .oma/task.log.json
        └── exposes: oma_team_status, oma_team_stream (NEW tools)

CLI Companion (user terminal, independent process)
  ├── oma team N "task"
  │     ├── spawns: N background `auggie` CLI processes
  │     ├── writes: .oma/team/worker-{1,2,3}.log
  │     └── writes: .oma/team/status.json (polled by MCP tools)
  ├── oma hud --watch
  │     └── polls: .oma/state.json, .oma/cost-log.json, .oma/task.log.json every 1-2s
  └── oma doctor
        └── reads: .oma/*.json, runs bats/shellcheck (no Auggie needed)
```

### Tech Stack
| Component | Technology | Why |
|-----------|------------|-----|
| CLI entry point | Node.js (ESM) | Same as MCP server; zero deps |
| Distribution | Shell wrapper + Node.js script OR `pkg`/`nexe` bundler | Standalone binary, no Node.js install required |
| HUD TUI | `watch` + shell + ANSI styling OR Node.js blessed | Simple polling approach |
| Team worker spawning | `child_process.spawn` in Node.js OR `nohup` shell | Background process management |
| State file polling | Shell scripts (for doctor/hud) + Node.js (for team) | Consistent with existing hooks |

### State Files Used
| File | Read By | Written By |
|------|---------|------------|
| `.oma/state.json` | hud, doctor | MCP server, CLI companion |
| `.oma/task.log.json` | hud (live feed) | MCP server |
| `.oma/cost-log.json` | hud (token count) | cost-track hook |
| `.oma/team/status.json` | MCP tools | CLI companion (team) |
| `.oma/team/worker-{n}.log` | `oma team status` | Worker processes |

### Auggie Plugin Constraints (verified)
- Auggie acts as MCP **client** only. Cannot accept inbound MCP connections.
- No tmux integration in Auggie's plugin model.
- OMA MCP server runs as stdio subprocess of Auggie session.
- Hooks fire on SessionStart, PreToolUse, PostToolUse, Stop events.

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| CLI_Companion | core domain | entrypoint: oma, stack: Node.js+shell, distribution: pkg/nexe | reads: State_Store, spawns: Worker_Process, invokes: MCP_tools |
| MCP_Server | core domain | transport: stdio, runtime: Node.js ESM, tools: state+mode+team | reads: State_Store, exposes: MCP_tools |
| Worker_Process | core domain | id, status, log_path, parent_session | spawned_by: CLI_Companion, writes: Team_State, writes: Worker_Log |
| Team_State | core domain | workers: Worker[], status: running/done/error, started_at | written_by: Worker_Process, read_by: MCP_tools |
| HUD_Overlay | core domain | display: TUI, refresh: 1-2s polling, content: [mode, tokens, activity, workers] | reads: State_Store, reads: Cost_Log, reads: Task_Log |
| Diagnostic_Report | core domain | categories: [state, install, ci], exit_code: int | generated_by: Doctor |
| State_Store | supporting | path: .oma/*.json, format: JSON | written_by: [MCP_Server, Worker_Process, CLI_Companion], read_by: [HUD, Doctor, MCP_tools] |
| Auggie_Plugin | external system | type: MCP client, session: isolated process | hosts: MCP_Server, no tmux, no inbound MCP |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 8 | 8 | - | - | N/A |
| 2 | 8 | 0 | 0 | 8 | 100% |
| 3 | 9 | 1 (MCP_Client) | 0 | 8 | 89% |
| 4 | 11 | 2 (Team_State_File, OMA_Team_Tools) | 0 | 9 | 82% |
| 5 | 11 | 0 | 0 | 11 | 100% |
| 6 | 11 | 0 | 0 | 11 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (6 rounds)</summary>

### Round 1
**Q:** What specific capability does a separate CLI binary provide?
**A:** (1) Spawning Claude Code workers in separate tmux panes, (2) A persistent HUD overlay that's always visible outside of Auggie sessions, (3) Offline diagnostics when the MCP server isn't running
**Ambiguity:** 65% (Goal: 0.48, Constraints: 0.42, Criteria: 0.28, Context: 0.68)

### Round 2
**Q:** What would oma team 3 "fix the login bug" look like if it worked?
**A:** 3 background processes with stdout captured to log files, oma team status --json shows results, but stdout outputs gathered and shown in Auggie as sub-agents running in the background
**Ambiguity:** 58% (Goal: 0.60, Constraints: 0.45, Criteria: 0.35, Context: 0.50)

### Round 3
**Q:** What is the mechanism for showing worker stdout in Auggie as sub-agents?
**A:** MCP streaming — CLI companion opens MCP connection to Auggie and streams log output as a tool result
**Ambiguity:** 52% (Goal: 0.72, Constraints: 0.50, Criteria: 0.38, Context: 0.55)

### Round 4
**Q:** Given Auggie is MCP-client-only, what alternative mechanism?
**A:** Workers write to .oma/team/*.json, MCP state server exposes oma_team_status/oma_team_stream, Auggie session polls via existing MCP connection
**Ambiguity:** 40% (Goal: 0.75, Constraints: 0.70, Criteria: 0.40, Context: 0.72)

### Round 5
**Q:** What should the HUD TUI panel show and how does it update?
**A:** HUD shows: mode+task+iteration, token usage+cost, live activity feed, worker status. Updates via polling every 1-2 seconds. Tech stack: Node.js + shell (same as codebase, not Elixir)
**Ambiguity:** 31% (Goal: 0.85, Constraints: 0.85, Criteria: 0.55, Context: 0.82)

### Round 6
**Q:** What should offline diagnostics cover?
**A:** All of the above: (1) MCP server down - reads state files directly, (2) Auggie not running - checks plugin install and manifest validity, (3) CI/self-verification - runs bats tests, shellcheck, manifest validation
**Ambiguity:** 18% (Goal: 0.88, Constraints: 0.88, Criteria: 0.72, Context: 0.85)
</details>
