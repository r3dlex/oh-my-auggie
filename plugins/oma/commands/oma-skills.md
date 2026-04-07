---
name: oma-skills
description: List all available OMA skills and their descriptions
argument-hint: ""
allowed-tools:
  - Read
  - Bash
model: haiku4.5
---

## /oma:skills

**OMA Skills Index** — 37 command files, 32 skill directories.

This is the primary OMA skills index. Individual skill docs are in `commands/oma-{name}.md` and `skills/{name}/SKILL.md`.

---

## Execution Modes

| Command | Description | Trigger Keyword |
|---------|-------------|-----------------|
| `/oma:ask <model> <query>` | Query with a specific model — get a targeted answer from a named model | `ask` |
| `/oma:autopilot <goal>` | Full autonomous execution — explore, plan, implement in parallel, QA, multi-perspective validation | `autopilot` |
| `/oma:ralph <task>` | Persistence loop — keeps working until task is complete and verified by architect | `ralph`, "don't stop" |
| `/oma:ralphthon <task>` | Autonomous hackathon lifecycle — PRD via deep-interview, ralph loop execution, auto-hardening | — |
| `/oma:ultraqa <target>` | QA cycling — test, verify, fix, repeat until quality passes | `ultraqa` |
| `/oma:ultrawork <task>` | High-throughput parallel subagent execution — spawn multiple agents simultaneously | `ulw` |
| `/oma:team <N> <task>` | Coordinated team of N agents working in parallel (requires external oma CLI companion) | `team` |
| `/oma:ccg <task>` | Tri-model orchestration — synthesize opus + gemini + gpt-5.4 perspectives, finalize in sonnet | `ccg` |

---

## Planning

| Command | Description | Trigger Keyword |
|---------|-------------|-----------------|
| `/oma:plan <task>` | Strategic planning with analyst/architect review — structured approach for complex tasks | `plan` |
| `/oma:ralplan <task>` | Consensus planning — Planner/Architect/Critic multi-agent loop until consensus is reached | `ralplan` |
| `/oma:deep-interview [--quick\|--standard\|--deep] [--autoresearch] <idea>` | Socratic deep interview with mathematical ambiguity scoring — thorough requirements before execution | `deep interview` |

---

## Skill Management

| Command | Description | Trigger Keyword |
|---------|-------------|-----------------|
| `/oma:skills` | Display all available OMA skills and their descriptions | `skills` |
| `/oma:skillify [--project\|--user] [path]` | Phase 2 skillify — audit a codebase and migrate OMC skills to OMA format | `skillify` |
| `/oma:skill <action> [skill-name]` | Manage OMA skills — list, add, remove, search, and edit skills | `skill` |
| `/oma:learner <skill-name>` | Extract learned skill from conversation — create reusable skill from demonstrated expertise | `learner` |

---

## Session Tools

| Command | Description | Trigger Keyword |
|---------|-------------|-----------------|
| `/oma:note <section> <text>` | Write to notepad — priority, working memory, or manual notes | `note` |
| `/oma:writer-memory <action> [content]` | Agentic memory for writers — persistent context across writing sessions | `writer-memory` |
| `/oma:notifications <action> [channel]` | Configure notifications — Telegram, Discord, and Slack alerts for OMA events | `notifications` |
| `/oma:trace <event-id>` | Evidence-driven causal tracing — trace decision paths to understand outcomes | `trace` |

---

## Development

| Command | Description | Trigger Keyword |
|---------|-------------|-----------------|
| `/oma:session-search <query> [--since <date>] [--project <path>] [--limit <n>] [--json] [--case-sensitive]` | Search across all session history — find past decisions, code, and context quickly | `session-search` |
| `/oma:teleport <ref>` | Create git worktrees instantly — for issues, PRs, and features in isolation | — |
| `/oma:wait [subcommand]` | Rate limit monitoring and auto-resume — wait for Claude API limits to clear | — |
| `/oma:visual-verdict <baseline> <candidate>` | Structured visual QA — compare screenshots, validate UI changes, and report regressions | `visual-verdict` |

---

## Setup / Admin

| Command | Description | Trigger Keyword |
|---------|-------------|-----------------|
| `/oma:doctor [component]` | Diagnose OMA installation issues — check plugin health, dependencies, and configuration | `doctor` |
| `/oma:setup [options]` | Install or refresh OMA — set up plugin, hooks, agents, and skills | `setup` |
| `/oma:mcp-setup <action> [server-name]` | Configure MCP servers — add, remove, and manage Model Context Protocol server connections | `mcp-setup` |
| `/oma:config <subcommand>` | View, set, or reset OMA configuration (global or local) | `config` |

---

## Meta Commands

| Command | Description | Trigger Keyword |
|---------|-------------|-----------------|
| `/oma:help [command]` | Show all available OMA commands or detailed help for a specific command | `help` |
| `/oma:status` | Show the current OMA mode, active task, and iteration count | `status` |
| `/oma:cancel [--force\|--all]` | Cancel active OMA mode and clear all state | `canceloma` |
| `/oma:interview <topic>` | Socratic requirements gathering — ask probing questions to extract complete requirements | `interview` |
| `/oma:deepinit [project-root]` | Generate hierarchical AGENTS.md — comprehensive multi-agent architecture document | — |
| `/oma:deslop <target>` | Regression-safe anti-slop cleanup — identify and fix low-quality AI artifacts, verbose patterns | `deslop` |
| `/oma:release <version-or-scope>` | Automated release workflow — versioning, changelog, tagging, and publication | — |
| `/oma:hud [element] [value]` | Configure HUD display — customize heads-up display for real-time execution metrics | `hud` |

---

## Short Aliases Table

Use `/oma:<alias>` or the short form. All aliases also work as bare `/<alias>`.

| Short Alias | Full Command | Description |
|-------------|--------------|-------------|
| `/ask` | `/oma:ask <model> <query>` | Query with a specific model |
| `/ralph` | `/oma:ralph <task>` | Persistence loop — keep working until verified complete |
| `/ultraqa` | `/oma:ultraqa <target>` | QA cycling — test, verify, fix, repeat |
| `/ulw` | `/oma:ultrawork <task>` | High-throughput parallel execution |
| `/team` | `/oma:team <N> <task>` | Coordinated N-agent team |
| `/plan` | `/oma:plan <task>` | Strategic planning |
| `/cancel` | `/oma:cancel [--force\|--all]` | Cancel active mode and clear state |
| `/doctor` | `/oma:doctor [component]` | Diagnose OMA installation |
| `/setup` | `/oma:setup [options]` | Install or refresh OMA |
| `/mcp-setup` | `/oma:mcp-setup <action> [server]` | Configure MCP servers |
| `/help` | `/oma:help [command]` | Show all commands or help for one |
| `/skills` | `/oma:skills` | Display all OMA skills |
| `/skillify` | `/oma:skillify [--project\|--user] [path]` | Audit codebase, migrate OMC skills to OMA |
| `/status` | `/oma:status` | Show current mode, task, iteration |
| `/deslop` | `/oma:deslop <target>` | Regression-safe anti-slop cleanup |
| `/deep-interview` | `/oma:deep-interview [--quick\|--standard\|--deep] [--autoresearch] <idea>` | Socratic deep interview with ambiguity scoring |
| `/hud` | `/oma:hud [element] [value]` | Configure HUD display |
| `/interview` | `/oma:interview <topic>` | Socratic requirements gathering |
| `/learner` | `/oma:learner <skill-name>` | Extract learned skill from conversation |
| `/note` | `/oma:note <section> <text>` | Write to notepad |
| `/notifications` | `/oma:notifications <action> [channel]` | Configure notification channels |
| `/ralplan` | `/oma:ralplan <task>` | Consensus planning loop |
| `/release` | `/oma:release <version-or-scope>` | Automated release workflow |
| `/research` | `/oma:research <query>` | Parallel research via document-specialist agents |
| `/science` | `/oma:science <topic>` | Science/research workflow |
| `/session` | `/oma:session <action> [worktree-name]` | Worktree-first dev environment manager |
| `/session-search` | `/oma:session-search <query> [...]` | Search session history |
| `/skill` | `/oma:skill <action> [skill-name]` | Manage skills |
| `/trace` | `/oma:trace <event-id>` | Evidence-driven causal tracing |
| `/visual-verdict` | `/oma:visual-verdict <baseline> <candidate>` | Structured visual QA |
| `/writer-memory` | `/oma:writer-memory <action> [content]` | Persistent writer memory |
| `/ccg` | `/oma:ccg <task>` | Tri-model orchestration |
| `/deepinit` | `/oma:deepinit [project-root]` | Generate AGENTS.md |
| `/wait` | `/oma:wait [subcommand]` | Rate limit monitoring and auto-resume |
| `/autopilot` | `/oma:autopilot <goal>` | Full autonomous execution |
| `/config` | `/oma:config <subcommand>` | View, set, or reset OMA configuration |
| `/ralphthon` | `/oma:ralphthon <task>` | Autonomous hackathon lifecycle |
| `/teleport` | `/oma:teleport <ref>` | Create git worktrees instantly |

---

## 32 Skill Directories by Category

### Execution Modes (6)

| Skill | Description |
|-------|-------------|
| `ask` | Query with a specific model — get a targeted answer from a named model |
| `ccg` | Tri-model orchestration — synthesize opus + gemini + gpt-5.4 perspectives, finalize in sonnet |
| `deep-interview` | Socratic deep interview with mathematical ambiguity scoring — thorough requirements before execution |
| `ralplan` | Consensus planning — Planner/Architect/Critic multi-agent loop until consensus is reached |
| `ultraqa` | QA cycling — test, verify, fix, repeat until quality passes |
| `ultrawork` | High-throughput parallel subagent execution — spawn multiple agents simultaneously |

### Planning (1)

| Skill | Description |
|-------|-------------|
| `plan` | Strategic planning with analyst/architect review — structured approach for complex tasks |

### Skill Management (2)

| Skill | Description |
|-------|-------------|
| `learner` | Extract learned skill from conversation — create reusable skill from demonstrated expertise |
| `skill` | Manage OMA skills — list, add, remove, search, and edit skills |

### Session Tools (4)

| Skill | Description |
|-------|-------------|
| `note` | Write to notepad — priority, working memory, or manual notes |
| `notifications` | Configure notifications — Telegram, Discord, and Slack alerts for OMA events |
| `session` | Worktree-first dev environment manager — create, manage, and switch development worktrees |
| `writer-memory` | Agentic memory for writers — persistent context across writing sessions |

### Research (4)

| Skill | Description |
|-------|-------------|
| `deep-dive` | Deep-dive research — intensive investigation into a specific topic with evidence chains |
| `research` | Parallel research via document-specialist agents — gather comprehensive information quickly |
| `science` | Science/research workflow — hypothesis → experiment → analysis → conclusion |
| `trace` | Evidence-driven causal tracing — trace decision paths to understand outcomes |

### Setup / Admin (4)

| Skill | Description |
|-------|-------------|
| `doctor` | Diagnose OMA installation issues — check plugin health, dependencies, and configuration |
| `hud` | Configure HUD display — customize heads-up display for real-time execution metrics |
| `mcp-setup` | Configure MCP servers — add, remove, and manage Model Context Protocol server connections |
| `setup` | Install or refresh OMA — set up plugin, hooks, agents, and skills |

### Utility (11)

| Skill | Description |
|-------|-------------|
| `debug` | Debugging assistance — structured root cause analysis and fix verification |
| `deslop` | Regression-safe anti-slop cleanup — identify and fix low-quality AI artifacts |
| `external-context` | External context retrieval — fetch project-relevant information from external sources |
| `interview` | Socratic requirements gathering — ask probing questions to extract complete requirements |
| `ralph` | Persistence loop — keeps working until task is complete and verified by architect |
| `remember` | Structured memory — append entries with auto-prune and retrieval |
| `release` | Automated release workflow — versioning, changelog, tagging, and publication |
| `self-improve` | Self-improvement — identify and fix weaknesses in OMA's own tooling |
| `team` | Coordinated team of N agents working in parallel |
| `verify` | Verification — cross-check implementation against acceptance criteria |
| `visual-verdict` | Structured visual QA — compare screenshots, validate UI changes, report regressions |

---

## Phase 2 Deferred: HUD Statusline Script

> **HUD Phase 2 (statusline script) deferred pending Auggie statusLine API research.**

The `hud-wrapper.sh` script exists at `~/.claude/hud-wrapper.sh` and is referenced in `oma-setup.md` for Auggie settings.json integration. Phase 2 implementation requires confirming the Auggie `statusLine` API field location and format before the statusline wrapper can be registered in settings.

---

## Available Agents

| Agent | Model | Role |
|-------|-------|------|
| `oma-explorer` | haiku4.5 | Codebase search and mapping |
| `oma-planner` | opus | Task planning and sequencing |
| `oma-executor` | sonnet4.6 | Code implementation |
| `oma-architect` | opus | Architecture and verification |
| `oma-critic` | opus | Risk assessment and alternative analysis |

## Links

- **Docs:** https://github.com/r3dlex/oh-my-auggie
- **Auggie:** https://www.augmentcode.com
- **archgate CLI:** https://github.com/archgate/cli