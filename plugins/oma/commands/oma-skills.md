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

**OMA Skills Index** — 39 command files, 34 skill directories.

This is the primary OMA skills index. Individual skill docs are in `commands/oma-{name}.md` and `skills/{name}/SKILL.md`.

---

## Skills Index (34 skills)

| Skill | Description | Trigger |
|-------|-------------|---------|
| **ask** | Query with a specific model — get a targeted answer | /oma:ask |
| **ccg** | Concurrency codegen — generate parallel task code from a dependency graph | /oma:ccg |
| **debug** | Debugging workflow — isolate and diagnose failures | /oma:debug |
| **deep-dive** | Deep exploration — thorough investigation of a topic or codebase area | /oma:deep-dive |
| **deepinit** | Deep initialization — comprehensive first-time setup interview | /oma:deepinit |
| **deep-interview** | Socratic requirements gathering — iteratively expose assumptions | /oma:deep-interview |
| **deslop** | Anti-slop cleaner — remove verbose, repetitive, and low-value AI content | /oma:deslop |
| **doctor** | Health check — diagnose OMA installation and configuration issues | /oma:doctor |
| **external-context** | External context injection — bring in docs, issues, or external data | /oma:external-context |
| **hud** | Heads-up display — live progress and metrics for running modes | /oma:hud |
| **improve-codebase-architecture** | Architectural improvement via organic friction detection | /oma:improve-architecture |
| **interview** | Socratic requirements gathering — iteratively expose assumptions | /oma:interview |
| **learner** | Teach a concept — structured learning session with quizzes | /oma:learner |
| **mcp-setup** | MCP server setup — configure Model Context Protocol servers | /oma:mcp-setup |
| **note** | Quick note — append to working memory with auto-prune | /oma:note |
| **notifications** | Notification management — view and manage OMA notifications | /oma:notifications |
| **plan** | Create a comprehensive work plan with structured deliberation | /oma:plan |
| **ralplan** | RALPLAN consensus — multi-perspective plan review with Planner/Architect/Critic | /oma:ralplan |
| **release** | Release orchestrator — manage versioning and release workflow | /oma:release |
| **remember** | Remember — store and retrieve persistent context across sessions | /oma:remember |
| **research** | Deep research — investigate topics with evidence chains | /oma:research |
| **science** | Hypothesis testing — structured experimentation framework | /oma:science |
| **self-improve** | Self-improvement — analyze and improve OMA's own behavior | /oma:self-improve |
| **session** | Session manager — save, restore, and manage OMA sessions | /oma:session |
| **setup** | Initial setup — configure OMA for first use | /oma:setup |
| **skill** | Skill management — list, add, remove, edit, and sync skills | /oma:skill |
| **skillify** | Create a new skill from a repeated task pattern | /oma:skillify |
| **tdd** | Test-Driven Development — red-green-refactor with vertical slices | /oma:tdd |
| **trace** | Execution trace — detailed timeline of agent decisions and actions | /oma:trace |
| **ultraqa** | QA cycling — test, verify, fix, repeat until quality passes | /oma:ultraqa |
| **ultrawork** | Parallel execution — run multiple independent agents simultaneously | /oma:ultrawork |
| **verify** | Verification — evidence-based completion checks against acceptance criteria | /oma:verify |
| **visual-verdict** | Visual verification — side-by-side before/after comparison | /oma:visual-verdict |
| **writer-memory** | Working memory — append structured entries with auto-prune | /oma:writer-memory |

---

## Utility Commands

These are read-only command wrappers with no skill directory:

| Command | Description |
|---------|-------------|
| `/oma:version` | Print current OMA version from package.json |
| `/oma:whatsnew` | Show changelog entries since last release |
| `/oma:status` | Show current OMA mode and state |
| `/oma:help` | Show all available commands |
| `/oma:cancel` | Cancel active mode and clear state |
| `/oma:team` | Coordinated team of N agents |
| `/oma:ralph` | Persistence loop — keep working until done |
| `/oma:autopilot` | Full autonomous pipeline |

---

## Directories

| Directory | Purpose |
|-----------|---------|
| `benchmarks/` | Hook and agent performance benchmarks with baseline tracking |
| `examples/` | Runnable TypeScript examples demonstrating OMA API usage |

---

## Short Aliases

`/ask`, `/ccg`, `/debug`, `/deep-dive`, `/deepinit`, `/deep-interview`, `/deslop`, `/doctor`, `/external-context`, `/hud`, `/improve-architecture`, `/interview`, `/learner`, `/mcp-setup`, `/note`, `/notifications`, `/plan`, `/ralplan`, `/ralph`, `/release`, `/remember`, `/research`, `/science`, `/self-improve`, `/session`, `/setup`, `/skill`, `/skillify`, `/tdd`, `/trace`, `/ultraqa`, `/ultrawork`, `/verify`, `/visual-verdict`, `/writer-memory`

Use `/oma:help <command>` for details on a specific command.
