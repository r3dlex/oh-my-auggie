---
name: cancel
description: Cancel active OMA mode and clear all state
argument-hint: ""
allowed-tools:
  - Read
  - Bash
model: haiku4.5
---

## /cancel

**Purpose:** Cancel the active OMA mode and cleanly exit all orchestration.

**Usage:** `/cancel`

**Aliases:** "canceloma", "stopoma"

---

## What Gets Cancelled

| Mode | State Cleared | Preserve Progress |
|------|---------------|-------------------|
| autopilot | phase, mode, task | Yes (resume possible) |
| ralph | mode, iteration, task | No |
| ultrawork | mode, parallel tasks | No |
| plan | mode | Yes (plan file preserved) |
| ralplan | mode | Yes (plan file preserved) |

## How It Works

1. **Read current state** via `oma_state_read`
2. **Set mode to "none"** and `active: false` via `oma_mode_set`
3. **Clear session state** via `oma_state_write` for relevant keys
4. **Confirm cancellation** to you

## Output

```
✓ OMA mode cancelled
  Previous mode: {mode}
  State cleared: {what was cleared}
  Ready for new task.
```

## Emergency Fallback

If MCP tools are unavailable, state can be cleared directly:

```bash
rm -f .oma/state.json
rm -f .oma/notepad.json
rm -f .oma/task.log.json
```

## Constraints

- Only clears OMA state — does not affect git state
- Does not kill subprocesses spawned outside OMA
- Resume is only possible for autopilot and plan modes
