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

## <Do_Not_Use_When>
- Short, trivial tasks (single command, under 30 seconds)
- Single-file edits with no multi-step process
- Quick lookups or searches that complete in one turn
- When terminal does not support ANSI rendering (fall back to inline markdown)
- Interactive terminal workflows where HUD output would interfere

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

## <Examples>

### Good Usage

**Long multi-step build pipeline:**
```
Agent: Start HUD for the build pipeline
OMA: [HUD starts with Standard display]
OMA: [████████░░░░░░░░] 47% | step 3/7 | ETA 2m

Agent: Update to Lint step
OMA: Step 4 of 7: Running lint...
```

**Multi-agent task with progress:**
```
Agent: Start HUD for orchestration
OMA: [HUD shows active agents, iteration count, progress]
OMA: [mode: ralph | iter: 3/100 | agents: 4 | ETA: ~4m]
```

### Bad Usage

**Trivial one-step task:**
```
Agent: Start HUD for git status check
OMA: [HUD shows for 0.2s then disappears — overhead > value]
```

**Spamming updates:**
```
Agent: /oma:hud update step1 run
Agent: /oma:hud update step2 run  <- 200ms later
Agent: /oma:hud update step3 run  <- 150ms later
OMA: [Terminal flickers from rapid redraws]
```

## Constraints

- Don't spam updates
- Keep information scannable
- Show meaningful metrics
- Clean up on exit
- Handle terminal resize

## <Final_Checklist>

Before ending a session with HUD active:

- [ ] Run `/oma:hud stop` or `/oma:hud off`
- [ ] Verify no HUD residue in terminal output
- [ ] Confirm `.oma/hud.json` state is clean (last run not persisting stale data)
- [ ] For long tasks (>5 min): note final status in task log before stopping HUD
- [ ] If Auggie statusline was used (Phase 2 feature): verify cleanup in Auggie session state

> **Phase 2 note:** Actual statusline script implementation is deferred pending Auggie statusLine API research. See `.oma/plans/` for the deferred implementation plan.