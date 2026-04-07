---
name: oma-help
description: Show all available OMA commands or detailed help for a specific command
argument-hint: "[command]"
allowed-tools:
  - Read
model: haiku4.5
---

## /oma:help

**Purpose:** Display help for all OMA commands or a specific command.

**Usage:**
- `/oma:help` — list all commands
- `/oma:help <command>` — detailed help for a specific command

**Examples:**
- `/oma:help`
- `/oma:help ralph`

---

## Available Commands (v0.1)

### Workflow Commands

| Command | Description |
|---------|-------------|
| `/oma:autopilot <goal>` | Full autonomous execution — plan → implement → verify |
| `/oma:ralph <task>` | Persistence loop — keep working until architect-verified complete |
| `/oma:ultrawork <task>` | High-throughput parallel execution (v0.2) |
| `/oma:team <N> <task>` | Coordinated team of N agents (v0.2 — requires CLI companion) |
| `/oma:plan <task>` | Strategic planning with analyst/architect review (v0.2) |
| `/oma:ralplan <task>` | Consensus planning — Planner/Architect/Critic loop (v0.2) |

### Utility Commands

| Command | Description |
|---------|-------------|
| `/oma:status` | Show current mode, task, and iteration |
| `/oma:cancel` | Cancel active mode and clear state |
| `/oma:help [command]` | Show this help or detailed command help |

### Deferred to v0.2

| Command | Description |
|---------|-------------|
| `/oma:ask <model> <query>` | Query with a specific model |
| `/oma:note <text>` | Write to notepad |
| `/oma:setup` | Install or refresh OMA |
| `/oma:doctor` | Diagnose installation issues |
| `/oma:mcp-setup` | Configure MCP servers |
| `/oma:hud` | Configure HUD display |
| `/oma:trace` | Evidence-driven causal tracing |
| `/oma:release` | Automated release workflow |
| `/oma:session` | Worktree-first dev environment manager |
| `/oma:skill` | Manage skills |
| `/oma:ccg` | Tri-model orchestration (opus + gemini + gpt-5.4) |
| `/oma:ultraqa` | QA cycling: test → verify → fix → repeat |
| `/oma:science` | Science/research workflow |
| `/oma:research` | Parallel research via document-specialist agents |
| `/oma:deepinit` | Generate hierarchical AGENTS.md |
| `/oma:interview` | Socratic requirements gathering |
| `/oma:deslop` | Regression-safe anti-slop cleanup |
| `/oma:visual-verdict` | Structured visual QA |

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
| "autopilot" | `/oma:autopilot` |
| "ralph" | `/oma:ralph` |
| "don't stop" | `/oma:ralph` |
| "ulw" | `/oma:ultrawork` (v0.2) |
| "ccg" | `/oma:ccg` (v0.2) |
| "ralplan" | `/oma:ralplan` (v0.2) |
| "deep interview" | `/oma:interview` (v0.2) |
| "deslop" | `/oma:deslop` (v0.2) |
| "canceloma" | `/oma:cancel` |

---

## Rule Templates

Rule templates are files that Augment Code loads via CLAUDE.md to enforce project conventions — coding style, git workflow, security policies, and architecture patterns.

**Available templates:**

| Template | Description |
|----------|-------------|
| `coding-style.md` | Code formatting, naming conventions, comment standards |
| `git-workflow.md` | Commit style, branch strategy, PR guidelines |
| `security.md` | Security best practices, secrets management |
| `rib-specific.md` | RIB architecture patterns (RIB projects only) |

**Installation path:** `.augment/rules/` in your project

**Install via:** `/oma:setup` — Phase 3.5 walks through interactive template selection

**Flags (non-interactive mode):**
| Flag | Description |
|------|-------------|
| `--verify` | Show what would be installed without installing |
| `--overwrite-existing` | Replace existing rule files |
| `--rename-existing` | Rename existing files with `.bak-` timestamp |
| `--skip-existing` | Skip templates that already exist |

---

## Links

- **Docs:** https://github.com/r3dlex/oh-my-auggie
- **Auggie:** https://www.augmentcode.com
- **archgate CLI:** https://github.com/archgate/cli
