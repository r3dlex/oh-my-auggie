# OMA Orchestration Rules (Community Profile)

## Overview

These rules govern how OMA (oh-my-auggie) orchestrates multi-agent workflows within Augment Code. Community profile is the default — no cost limits, no approval gates.

## Core Pipeline

### Orchestration Flow

```
User invokes /oma:autopilot or /oma:ralph
         │
         ▼
   ┌─────────────┐
   │ oma-explorer │  haiku4.5 — map codebase structure
   └──────┬──────┘
          │ (codebase map)
          ▼
   ┌─────────────┐
   │  oma-planner │  claude-opus-4-6 — create 3-6 step plan
   └──────┬──────┘
          │ (plan with acceptance criteria)
          ▼
   User confirms ──────────────────────────────────────────── /oma:ralph skips confirm
          │
          ▼
   ┌─────────────┐     ┌─────────────┐
   │ oma-executor │ ──► │ oma-executor │  parallel execution
   └──────┬──────┘     └──────┬──────┘
          │ (completed)         │
          └──────────┬──────────┘
                     ▼
            ┌─────────────┐
            │  oma-architect │  claude-opus-4-6 — verify implementation
            └──────┬──────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
       PASS               FAIL/PARTIAL
       (done)          → fix → re-verify (ralph loop)
```

## Agent Delegation Rules

| Task Type | Delegate To | Model |
|-----------|------------|-------|
| Codebase search | oma-explorer | haiku4.5 |
| Requirements analysis | oma-explorer | haiku4.5 |
| Task planning | oma-planner | claude-opus-4-6 |
| System design | oma-architect | claude-opus-4-6 |
| Code implementation | oma-executor | sonnet4.6 |
| Architecture verification | oma-architect | claude-opus-4-6 |

## Mode Transitions

### /oma:autopilot
- Entry: `/oma:autopilot <goal>`
- Exit: architect PASS → cleanup → done
- Cancel: `/oma:cancel` → preserve state for resume

### /oma:ralph
- Entry: `/oma:ralph <task>`
- Loop: execute → architect verify → PASS → done
- Block: stop-gate prevents exit without architect PASS
- Max iterations: 100
- Cancel: `/oma:cancel` → clear state

### Mode Priority
1. **ralph** — blocks stop until architect PASS
2. **autopilot** — blocks stop at phase boundaries
3. **plan/ralplan** — blocks until plan confirmed
4. **none** — all tools allowed

## Keyword Triggers

| Keyword | Activates | Mode |
|---------|-----------|------|
| "autopilot" | `/oma:autopilot` | autopilot |
| "ralph" | `/oma:ralph` | ralph |
| "don't stop" | `/oma:ralph` | ralph |
| "ulw" | `/oma:ultrawork` | ultrawork (v0.2) |
| "ccg" | `/oma:ccg` | ccg (v0.2) |
| "ralplan" | `/oma:ralplan` | ralplan (v0.2) |
| "deep interview" | `/oma:interview` | interview (v0.2) |
| "deslop" | `/oma:deslop` | deslop (v0.2) |
| "canceloma" | `/oma:cancel` | cancel |

## Delegation Enforcement

**Rule:** When OMA mode is active, the orchestrator MUST NOT use Edit, Write, or file removal tools directly.

**Exception:** oma-executor is the sole agent permitted to write files during orchestration.

**How enforced:** delegation-enforce.sh PreToolUse hook blocks file operations when mode != none.

## State Directory

- `.oma/state.json` — mode, active, task, iteration
- `.oma/notepad.json` — priority, working, manual sections
- `.oma/task.log.json` — architect/executor verdict history
- `.oma/plans/` — saved execution plans

## Hook Semantics

| Hook | When | Decision |
|------|------|----------|
| session-start | Session start | Context injection |
| delegation-enforce | Before Edit/Write/remove_files | Block if mode active |
| stop-gate | Before agent stop | Block if ralph without PASS |

## Compatibility

- Auggie reads both `.augment-plugin/` and `.claude-plugin/`
- OMA agent names use `oma-` prefix
- OMA MCP tools use `oma_` prefix
- OMA state directory is `.oma/`
- Augment Code compatibility: reads CLAUDE.md alongside AGENTS.md

## Community Defaults

- No cost limits
- No approval gates
- No ADR requirements
- Full parallelization enabled
- All agents available
