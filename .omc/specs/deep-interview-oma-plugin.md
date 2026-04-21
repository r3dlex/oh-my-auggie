# Deep Interview Spec: oh-my-auggie (OMA) Plugin

## Metadata
- Type: greenfield
- Generated: 2026-04-04
- Threshold: 0.2
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.95 | 0.40 | 0.38 |
| Constraint Clarity | 0.90 | 0.30 | 0.27 |
| Success Criteria | 0.60 | 0.30 | 0.18 |
| **Total Clarity** | | | **0.83** |
| **Ambiguity** | | | **17%** |

## Goal
Build oh-my-auggie (OMA) as a native Auggie CLI marketplace plugin that provides multi-agent orchestration for Auggie users — delivering the full oh-my-claudecode experience adapted for Auggie's extension primitives (subagents, hooks, custom commands, skills, rules, MCP servers).

## Constraints
- Plugin-only distribution via GitHub marketplace (`auggie plugin marketplace add`)
- Auggie has no tmux integration — team workers require external CLI companion
- MCP state server must be zero-dependency Node.js stdio
- All hooks are shell scripts (.sh with shebang)
- Must be backwards compatible with .claude-plugin format
- Enterprise profile only *adds* rules — never removes or restricts community features

## Non-Goals
- CLI companion (PR2) is not in scope for PR1
- Auggie plugin SDK (Node.js/Burrito) is not needed for PR1 — pure markdown/shell is sufficient
- No tmux, no multi-process workers in PR1

## Acceptance Criteria

### PR1: OMA Plugin (formerly PR2)
**Hard gates (must pass to ship):**

1. **5 core commands** implemented and functional:
   - `/oma:autopilot` — full autonomous execution
   - `/oma:ralph` — persistence loop until architect-verified complete
   - `/oma:status` — show active mode and task
   - `/oma:cancel` — cancel active mode
   - `/oma:help` — list all commands

2. **4 core subagents** implemented with YAML frontmatter:
   - `oma-explorer` (haiku4.5, read-only tools)
   - `oma-planner` (claude-opus-4-6, read-only)
   - `oma-executor` (sonnet4.6, full tools)
   - `oma-architect` (claude-opus-4-6, read-only)

3. **Full autonomous loop** works end-to-end:
   - User invokes `/oma:autopilot "goal"` → Explorer → Planner → Executor → Architect → verdict

4. **MCP state server** fully implemented (zero npm deps):
   - `oma_state_read / oma_state_write`
   - `oma_mode_get / oma_mode_set`
   - `oma_task_log`
   - State persists to `.oma/state.json`

5. **Hooks implemented:**
   - `delegation-enforce.sh` (PreToolUse, blocks direct edits when mode active)
   - `stop-gate.sh` (Stop, blocks completion when ralph active without architect PASS)
   - `session-start.sh` (SessionStart, injects context + restores mode)

6. **Repository structure** matches spec with valid manifests

**Deferred to v0.2:**
- Remaining 10 workflow commands (ultrawork, team, ccg, ultraqa, plan, ralplan, science, research, deepinit, deslop, visual-verdict)
- Remaining 15 subagents (analyst, verifier, tracer, debugger, security, code-reviewer, test-engineer, designer, writer, qa, scientist, doc-specialist, git-master, simplifier, critic)
- `keyword-detect.sh` (PostToolUse hook)
- Enterprise profile rules
- Skill definitions (commands work without them via direct delegation)

### PR2: OMA CLI Companion
**Hard gates:**
- `oma team N "task"` spawns N worker panes via tmux
- `oma team status [--json]` shows worker status
- `oma team shutdown [--force]` stops workers
- `oma hud --watch` displays live HUD in companion tmux pane
- `oma doctor [--team]` diagnostic checks

## Implementation Steps

### PR1 Phases
1. Repository scaffold + manifests (marketplace.json, plugin.json, .mcp.json)
2. MCP state server (state-server.mjs, package.json)
3. 4 core subagent definitions (agents/*.md)
4. 5 core slash commands (commands/*.md)
5. 3 hook scripts (session-start.sh, delegation-enforce.sh, stop-gate.sh)
6. hooks.json configuration
7. Orchestration rules (rules/orchestration.md)
8. README with installation instructions
9. bats e2e tests for core loop
10. shellcheck on all .sh files

### PR2 Phases
1. Elixir umbrella scaffold (mix new --umbrella oma)
2. OmaCore.Worker + WorkerSupervisor GenServers
3. OmaCore.Tmux (tmux session management)
4. OmaCore.Worktree (git worktree isolation)
5. `oma team` command
6. `oma hud` command
7. `oma doctor` command
8. Burrito build for macOS + Linux

## Technical Notes
- Model mapping: haiku→haiku4.5, sonnet→sonnet4.6, opus→claude-opus-4-6
- Add gemini-3.1-pro for explorer (92% of sonnet cost)
- State: `.oma/state.json`, `.oma/notepad.json`, `.oma/skills/`
- MCP stdio transport, no external npm dependencies
