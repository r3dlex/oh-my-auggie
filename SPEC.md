# oh-my-auggie Specification

> **Spec status:** v0.1 implementation — Auggie plugin + MCP state server

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
│       │   └── .mcp.json         # MCP server config (${PLUGIN_ROOT}/mcp/state-server.mjs)
│       ├── agents/                # 19 subagent markdown files
│       │   ├── oma-explorer.md
│       │   ├── oma-planner.md
│       │   ├── oma-executor.md
│       │   └── oma-architect.md  (v0.1 core; 15 more in v0.2)
│       ├── commands/              # 28 slash command markdown files
│       │   ├── oma-autopilot.md
│       │   ├── oma-ralph.md
│       │   ├── oma-status.md
│       │   ├── oma-cancel.md
│       │   └── oma-help.md       (v0.1 core; 23 more in v0.2)
│       ├── hooks/
│       │   ├── hooks.json         # 3 hook registrations (SessionStart, PreToolUse, Stop)
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

## Hooks

| Hook | Type | Purpose |
|------|------|---------|
| `session-start` | SessionStart | Inject orchestration context, restore active mode |
| `delegation-enforce` | PreToolUse | Block Edit/Write/remove_files when mode active |
| `stop-gate` | Stop | Block completion in ralph mode without architect PASS |

## Profiles

- **Community** (default): Full parallelization, no approval gates, no cost limits
- **Enterprise** (`.oma/config.json`): Cost-aware routing, ADR requirements, approval gates (hooks deferred to v0.2)

## v0.1 vs v0.2

| Feature | v0.1 | v0.2 |
|---------|------|------|
| Core agents | 4 | 19 |
| Core commands | 5 | 28 |
| Hook-based ADR enforcement | No | Yes |
| Hook-based approval gates | No | Yes |
| Cost tracking | No | Yes |
| Team tmux workers | External CLI | Native |

## Links

- Augment Code: https://www.augmentcode.com
- auggie CLI docs: https://www.augmentcode.com/docs/cli
- oh-my-auggie: https://github.com/r3dlex/oh-my-auggie
