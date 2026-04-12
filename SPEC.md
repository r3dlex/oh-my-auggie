# oh-my-auggie Specification

> **Spec status:** v0.2 implementation — Auggie plugin + MCP state server + Enterprise hooks

## Overview

oh-my-auggie (OMA) is a multi-agent orchestration plugin for [Augment Code's `auggie` CLI](https://www.augmentcode.com). It replicates the oh-my-claudecode experience using Auggie's native extension primitives.

## Architecture

```
oh-my-auggie/
├── .augment-plugin/
│   └── marketplace.json           # Auggie marketplace manifest
├── .claude-plugin/
│   └── plugin.json                # Backwards-compatible manifest
├── plugins/
│   └── oma/
│       ├── .augment-plugin/
│       │   ├── plugin.json       # Plugin name, version, entry points
│       │   └── .mcp.json         # MCP server config (${AUGMENT_PLUGIN_ROOT}/mcp/state-server.mjs)
│       ├── agents/                # 19 subagent markdown files
│       │   ├── oma-explorer.md
│       │   ├── oma-planner.md
│       │   ├── oma-executor.md
│       │   ├── oma-architect.md
│       │   └── [15 more in v0.2]
│       ├── commands/              # 44 slash command markdown files
│       │   ├── oma-autopilot.md
│       │   ├── oma-ralph.md
│       │   ├── oma-status.md
│       │   ├── oma-cancel.md
│       │   ├── oma-help.md
│       │   └── [23 more in v0.2]
│       ├── hooks/
│       │   ├── hooks.json         # 6 hook registrations (SessionStart, PreToolUse, Stop, + enterprise)
│       │   ├── session-start.sh
│       │   ├── delegation-enforce.sh
│       │   └── stop-gate.sh
│       ├── rules/
│       │   ├── orchestration.md   # Community rules
│       │   └── enterprise.md      # Enterprise profile (additive only)
│       └── mcp/
│           ├── state-server.mjs   # Zero-dependency Node.js MCP server
│           └── package.json        # {"type":"module"}
├── assets/
│   └── oh-my-auggie.svg
├── e2e/
│   └── oma-core-loop.bats        # 34 test cases
└── .github/workflows/
    └── ci.yml                    # bats + shellcheck + manifest validation
```

## Plugin Primitives

| Primitive | Format | Purpose |
|-----------|--------|---------|
| Subagent | `.md` + YAML frontmatter | Each agent gets own context window |
| Hook | `.sh` shell script | PreToolUse, SessionStart, Stop |
| Custom command | `.md` + YAML frontmatter | Slash commands |
| Rules | `.md` files | Orchestration policy |
| MCP server | stdio Node.js | State persistence |

## State Files

| File | Purpose |
|------|---------|
| `.oma/state.json` | mode, active, task, iteration |
| `.oma/notepad.json` | priority, working, manual sections |
| `.oma/task.log.json` | architect/executor verdict history |
| `.oma/config.json` | community vs enterprise profile |

## MCP Tools

| Tool | Description |
|------|-------------|
| `oma_state_read` | Read a key from state.json |
| `oma_state_write` | Write a key to state.json |
| `oma_mode_get` | Get mode and active status |
| `oma_mode_set` | Set mode and active status |
| `oma_task_log` | Log task completion with agent+status |
| `oma_notepad_read` | Read notepad section |
| `oma_notepad_write` | Write to notepad section |
| `oma_skill_list` | List available OMA skills |
| `oma_skill_inject` | Inject skill context into session |

## Hooks

| Hook | Type | Purpose |
|------|------|---------|
| `session-start` | SessionStart | Inject orchestration context, restore active mode |
| `delegation-enforce` | PreToolUse | Block Edit/Write/remove_files when mode active |
| `stop-gate` | Stop | Block completion in ralph mode without architect PASS |
| `approval-gate` | PreToolUse | Require approval for sensitive paths (enterprise) |
| `adr-enforce` | PreToolUse | Enforce ADR references for architectural changes (enterprise) |
| `cost-track` | PostToolUse | Track model usage and cost per session (enterprise) |

## Profiles

- **Community** (default): Full parallelization, no approval gates, no cost limits
- **Enterprise** (`.oma/config.json`): Cost-aware routing, ADR requirements, approval gates, cost tracking

Enterprise profile activates when `.oma/config.json` contains `"profile": "enterprise"`.

## State Files

| File | Purpose |
|------|---------|
| `.oma/state.json` | mode, active, task, iteration |
| `.oma/notepad.json` | priority, working, manual sections |
| `.oma/task.log.json` | architect/executor verdict history |
| `.oma/config.json` | community vs enterprise profile |
| `.oma/approvals.json` | Enterprise approval records |
| `.oma/cost-log.json` | Enterprise cost tracking per session |
| `.oma/adr/` | Architectural Decision Records directory |

## v0.1 vs v0.2

| Feature | v0.1 | v0.2 |
|---------|------|------|
| Core agents | 4 | 19 |
| Core commands | 5 | 44 |
| Hook-based ADR enforcement | No | Yes (adr-enforce.sh) |
| Hook-based approval gates | No | Yes (approval-gate.sh) |
| Cost tracking | No | Yes (cost-track.sh) |
| Team tmux workers | External CLI | Native |

## Skills

OMA includes a skills system for reusable agent behaviors:

| Skill | Category | Description |
|-------|----------|-------------|
| Skills are defined in | `plugins/oma/skills/*/SKILL.md` | Each skill has YAML frontmatter + usage docs |

Skills are discovered and injected via MCP tools:
- `oma_skill_list` — List all available skills, optionally filtered by category
- `oma_skill_inject` — Inject a skill's context into the current session

## Links

- Augment Code: https://www.augmentcode.com
- auggie CLI docs: https://www.augmentcode.com/docs/cli
- oh-my-auggie: https://github.com/r3dlex/oh-my-auggie
- [Security Policy](SECURITY.md)

---

## Sponsor

**Love oh-my-auggie? Consider sponsoring its development.**

Your sponsorship directly funds the time and energy poured into making multi-agent orchestration accessible to every developer on the Augment Code platform. Every contribution — no matter the size — helps keep the project alive, responsive, and improving.

👉 **[Sponsor on GitHub](https://github.com/sponsors/r3dlex)**

One-time and recurring options available. Sponsors get recognized in the project README and release notes.
