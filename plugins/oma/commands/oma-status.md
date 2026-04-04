---
name: oma-status
description: Show the current OMA mode, active task, and iteration count
argument-hint: ""
allowed-tools:
  - Read
model: haiku4.5
---

## /oma:status

**Purpose:** Display current OMA mode, active task, and iteration status.

**Usage:** `/oma:status`

---

## How It Works

Reads from `.oma/state.json` via `oma_state_read` to display:

- **Mode:** none | autopilot | ralph | ultrawork | team | plan | ralplan
- **Active:** true | false
- **Task:** current task description (if any)
- **Iteration:** current iteration number (for ralph mode)

## Output Format

```
╔══════════════════════════════════════╗
║  OMA Status                           ║
╠══════════════════════════════════════╣
║  Mode:      {mode}                   ║
║  Active:    {true|false}            ║
║  Task:      {task description}       ║
║  Iteration: {n}                       ║
╚══════════════════════════════════════╝
```

## When Mode is "none"

```
║  Mode:      idle                     ║
║  Active:    false                    ║
║  Task:      —                        ║
║  Iteration: —                        ║
```

## Deferred Modes

If mode is set but not yet implemented (v0.2):
```
║  Mode:      {deferred_mode} [v0.2]  ║
```

## State Source

Reads from `.oma/state.json` using `oma_state_read`:
- `mode` key: current orchestration mode
- `active` key: whether mode is currently running
- `task` key: current task description
- `iteration` key: current iteration count (ralph mode)
