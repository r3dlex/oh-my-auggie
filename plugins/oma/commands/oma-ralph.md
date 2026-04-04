---
name: oma-ralph
description: Persistence loop — keeps working until task is complete and verified by architect
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

## /oma:ralph

**Purpose:** Keep working until the task is architect-verified complete.

**Usage:** `/oma:ralph <task>`

**Examples:**
- `/oma:ralph fix all null pointer exceptions in src/auth/`
- `/oma:ralph implement the complete user registration flow`

---

## How It Works

### Ralph Loop

1. **Set mode to "ralph"** via `oma_mode_set`
2. **Set iteration to 1** via `oma_state_write`
3. **Loop** until oma-architect returns PASS:

```
WHILE architect_verdict != PASS:
  a. Spawn oma-executor with task + iteration context
  b. Spawn oma-architect to verify implementation
  c. IF architect verdict == PASS:
       → Exit loop, render final verdict
     ELSE IF architect verdict == FAIL:
       → Increment iteration via oma_state_write
       → Continue to next iteration
     ELSE (PARTIAL):
       → Log partial completion
       → Increment iteration
       → Continue to next iteration
```

### Completion Gates

- **Hard gate:** oma-architect verdict MUST be PASS
- **Max iterations:** 100 (configurable, set via `oma_state_write`)
- **On max iterations:** PARTIAL verdict with summary of what was accomplished

### State Management

- Mode: `ralph`
- Current iteration stored in `.oma/state.json`
- Architect verdict history in `.oma/task.log.json`

## Ralph Cannot Be Bypassed

The **stop-gate.sh** hook blocks agent completion when:
- Mode is `ralph`
- oma-architect has not returned PASS

This means you **cannot** interrupt ralph mid-loop without architect verification.

## Cancel

Run `/oma:cancel` to stop the persistence loop and clear state.

## Constraints

- Only oma-executor writes files
- Stop gate prevents premature exit
- Iteration counter prevents infinite loops
- Architect verdict is the only completion criterion
