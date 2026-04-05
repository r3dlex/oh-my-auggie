---
name: help
description: Show all available OMA commands or detailed help for a specific command
argument-hint: "[command]"
allowed-tools:
  - Read
model: haiku4.5
---

## /help

**Purpose:** Display help for all OMA commands or a specific command.

**Usage:**
- `/help` — list all commands
- `/help <command>` — detailed help for a specific command

**Examples:**
- `/help`
- `/help ralph`

---

## Available Commands (v0.1)

### Workflow Commands

| Command | Description |
|---------|-------------|
| `/autopilot <goal>` | Full autonomous execution — plan → implement → verify |
| `/ralph <task>` | Persistence loop — keep working until architect-verified complete |
| `/ultrawork <task>` | High-throughput parallel execution (v0.2) |
| `/team <N> <task>` | Coordinated team of N agents (v0.2 — requires CLI companion) |
| `/plan <task>` | Strategic planning with analyst/architect review (v0.2) |
| `/ralplan <task>` | Consensus planning — Planner/Architect/Critic loop (v0.2) |

### Utility Commands

| Command | Description |
|---------|-------------|
| `/status` | Show current mode, task, and iteration |
| `/cancel` | Cancel active mode and clear state |
| `/help [command]` | Show this help or detailed command help |

### Deferred to v0.2

| Command | Description |
|---------|-------------|
| `/ask <model> <query>` | Query with a specific model |
| `/note <text>` | Write to notepad |
| `/setup` | Install or refresh OMA |
| `/doctor` | Diagnose installation issues |
| `/mcp-setup` | Configure MCP servers |
| `/hud` | Configure HUD display |
| `/trace` | Evidence-driven causal tracing |
| `/release` | Automated release workflow |
| `/session` | Worktree-first dev environment manager |
| `/skill` | Manage skills |
| `/ccg` | Tri-model orchestration (opus + gemini + gpt-5.4) |
| `/ultraqa` | QA cycling: test → verify → fix → repeat |
| `/science` | Science/research workflow |
| `/research` | Parallel research via document-specialist agents |
| `/deepinit` | Generate hierarchical AGENTS.md |
| `/interview` | Socratic requirements gathering |
| `/deslop` | Regression-safe anti-slop cleanup |
| `/visual-verdict` | Structured visual QA |

---

## Available Agents (v0.1)

| Agent | Model | Role |
|-------|-------|------|
| `oma-explorer` | haiku4.5 | Codebase search and mapping |
| `oma-planner` | claude-opus-4-6 | Task planning and sequencing |
| `oma-executor` | sonnet4.6 | Code implementation |
| `oma-architect` | claude-opus-4-6 | Architecture and verification |

---

## Keyword Triggers

These words in conversation automatically activate modes:

| Keyword | Activates |
|---------|----------|
| "autopilot" | `/autopilot` |
| "ralph" | `/ralph` |
| "don't stop" | `/ralph` |
| "ulw" | `/ultrawork` (v0.2) |
| "ccg" | `/ccg` (v0.2) |
| "ralplan" | `/ralplan` (v0.2) |
| "deep interview" | `/interview` (v0.2) |
| "deslop" | `/deslop` (v0.2) |
| "canceloma" | `/cancel` |

---

## Links

- **Docs:** https://github.com/r3dlex/oh-my-auggie
- **Auggie:** https://www.augmentcode.com
- **archgate CLI:** https://github.com/archgate/cli
