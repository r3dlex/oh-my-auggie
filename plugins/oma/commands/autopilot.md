---
name: autopilot
description: Full autonomous execution — expand requirements, plan, implement in parallel, QA, multi-perspective validation
argument-hint: "<goal>"
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

## /autopilot

**Purpose:** Full autonomous execution from idea to working code.

**Usage:** `/autopilot <goal>`

**Examples:**
- `/autopilot add user authentication to the API`
- `/autopilot refactor the payment module`

---

## How It Works

### Phase 1: Explore
Spawn **oma-explorer** (haiku4.5) to map the codebase structure relevant to the goal.

### Phase 2: Plan
Spawn **oma-planner** (claude-opus-4-6) to create a 3-6 step plan with acceptance criteria.

### Phase 3: Confirm
Present the plan to you for approval. Say "yes" or "proceed" to continue.

### Phase 4: Implement
- Independent steps run in parallel via **oma-executor** (sonnet4.6)
- Each oma-executor instance gets its own context window
- oma-executor logs completion via `oma_task_log`

### Phase 5: Verify
Spawn **oma-architect** (claude-opus-4-6) to verify each step against acceptance criteria.

### Phase 6: QA Cycling
If any step fails verification:
1. Fix the issue
2. Re-verify
3. Repeat up to 5 times

### Phase 7: Final Verdict
oma-architect renders: **PASS** / **FAIL** / **PARTIAL**

---

## State Management

- Mode: `autopilot` (set via `oma_mode_set`)
- State persists to `.oma/state.json`
- Cancel with `/cancel`

## Constraints

- oma-executor is the only agent permitted to write files
- All other agents use read-only tools
- Parallel steps maximize throughput
- Escalate to oma-architect after 3 failed fix attempts
