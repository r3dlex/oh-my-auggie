---
name: hud
description: HUD statusline and progress display. Use for "show status", "progress", "HUD", and "statusline".
trigger: /oma:hud
---

## Skill: hud

Display heads-up display information during long-running tasks.

## When to Use

- Long-running builds/tests
- Multi-step processes
- Progress monitoring
- Status at a glance
- Resource usage tracking

## HUD Elements

### Progress Bar
- Overall completion
- Current step indicator
- Time elapsed/remaining
- Animated or static

### Status Indicators
- ✅ Pass
- ❌ Fail
- ⚠️ Warning
- ⏳ Running
- ⏹️ Not started

### Metrics
- CPU usage
- Memory usage
- Network I/O
- Disk I/O

### Step List
- Current step highlighted
- Completed steps checked
- Remaining steps dimmed

## Display Modes

### Compact
Single line, minimal info.
```
[████████░░░░░░░░] 47% | step 3/7 | ETA 2m
```

### Standard
Multiple lines, balanced info.
```
┌──────────────────────────────────────┐
│ Building...              [████░░] 50%│
├──────────────────────────────────────┤
│ ✓ Checkout                   0:05    │
│ ► Install dependencies       0:42    │
│ ○ Build project             pending   │
│ ○ Run tests                 pending   │
└──────────────────────────────────────┘
```

### Detailed
Full panel with metrics.
```
┌──────────────────────────────────────┐
│ TASK: Full Build           [3/7] 43% │
├──────────────────────────────────────┤
│ Step              Status    Duration │
│ ──────────────────────────────────── │
│ Checkout          ✅ Done     0:05   │
│ Install           ✅ Done     0:42   │
│ Lint              ⚠️ Warn     0:12   │
│ Build             ► Run      0:23   │
│ Test              ○ Pend              │
│ Package           ○ Pend              │
│ Deploy            ○ Pend              │
├──────────────────────────────────────┤
│ CPU: 45%  MEM: 2.1G  DISK: 120MB/s   │
└──────────────────────────────────────┘
```

## Commands

### Start HUD
```
/oma:hud start {task-name}
```

### Update Progress
```
/oma:hud update {step} {status}
```

### Stop HUD
```
/oma:hud stop
```

### Show Metrics
```
/oma:hud metrics
```

## Output Format

```
## HUD: {task}

### Progress
**Status:** {running|paused|complete}
**Overall:** {percentage}%
**Elapsed:** {time}
**ETA:** {time}

### Steps
| # | Step | Status | Duration |
|---|------|--------|----------|
| 1 | {step} | ✅ | {time} |
| 2 | {step} | ⚠️ | {time} |
| 3 | {step} | ► | - |
```

### Metrics
```
CPU: {percentage}%
Memory: {amount}
Disk: {rate}
```

### Final Status
**Result:** {success|failure|partial}
**Total time:** {duration}
**Issues:** {n}
```

## Constraints

- Don't spam updates
- Keep information scannable
- Show meaningful metrics
- Clean up on exit
- Handle terminal resize
