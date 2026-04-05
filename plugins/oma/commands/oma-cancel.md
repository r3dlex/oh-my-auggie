---
name: oma-cancel
description: Cancel active OMA mode and clear all state
argument-hint: "[--force|--all]"
allowed-tools:
  - Read
  - Bash
model: haiku4.5
---

## /oma:cancel

**Purpose:** Cancel the active OMA mode and cleanly exit all orchestration.

**Usage:**
- `/oma:cancel` — Cancel current mode (smart detection)
- `/oma:cancel --force` — Force-clear current session state
- `/oma:cancel --all` — Clear all OMA state including cross-session artifacts

**Aliases:** "canceloma", "stopoma"

---

## Smart Cancellation (Default)

Detects which mode is active and cancels it in dependency order:

1. **autopilot/ralph** — clears mode state, preserves resume data for autopilot
2. **ultraqa** — clears QA cycling state
3. **team** — sends shutdown to teammates, waits 15s, calls TeamDelete
4. **ralplan** — preserves plan file, clears mode state

## Force Clear (--force)

Clears current session state plus legacy artifacts:

```bash
# Files removed under --force:
.rm -f .oma/state.json
.rm -f .oma/notepad.json
.rm -f .oma/task.log.json
.rm -f .oma/ultraqa-state.json
.rm -f .oma/ralph-state.json
.rm -f .oma/team-state.json
```

## All Clear (--all)

Clears everything including cross-session state:

```bash
# Additional files removed under --all:
.rm -f .oma/autopilot-state.json
.rm -f .oma/ralplan-state.json
.rm -f .oma/hud-state.json
```

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
