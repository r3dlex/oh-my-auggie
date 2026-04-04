---
name: oma-ultrawork
description: High-throughput parallel subagent execution — spawn multiple agents simultaneously for maximum speed
argument-hint: "<task>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
  - Task
model: sonnet4.6
---

## /oma:ultrawork

**Purpose:** Execute multiple independent tasks in parallel using subagents, maximizing throughput.

**Usage:** `/oma:ultrawork <task>`

**Examples:**
- `/oma:ultrawork implement all five API endpoints in parallel`
- `/oma:ultrawork write tests for services: auth, billing, notifications`

---

## How It Works

### Parallelization Strategy

1. **Analyze** the task for independent sub-tasks
2. **Decompose** into 2-8 parallel work items
3. **Spawn** oma-executor subagents simultaneously
4. **Collect** results as each completes
5. **Merge** outputs into unified result

### Subagent Management

- **Max concurrent:** 8 subagents (configurable)
- **Context sharing:** Each subagent gets independent context window
- **Conflict resolution:** Last-write-wins for overlapping file changes
- **Error handling:** Failed subagents retry once, then report failure

### State Management

- Mode: `ultrawork`
- State persists to `.oma/state.json`
- Cancel with `/oma:cancel` stops all subagents

### Constraints

- Subtasks must be truly independent (no shared mutable state)
- File conflicts are auto-detected and flagged
- Results are not verified — use `/oma:ultraqa` for QA cycling
