---
name: oma-hud
description: Configure HUD display — customize heads-up display for real-time execution metrics
argument-hint: "[element] [value]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

## /oma:hud

Configure the HUD (heads-up display) for real-time execution metrics.

---

## Quick Commands

| Command | Description |
|---------|-------------|
| `/oma:hud on` | Enable HUD |
| `/oma:hud off` | Disable HUD |
| `/oma:hud start <task-name>` | Start HUD for a named task |
| `/oma:hud update <step> <status>` | Update step progress (run/pass/fail/warn) |
| `/oma:hud stop` | Stop HUD |
| `/oma:hud metrics` | Show system resource metrics |
| `/oma:hud config <element> <value>` | Configure a specific element |
| `/oma:hud reset` | Reset to defaults |
| `/oma:hud preset <name>` | Apply a display preset (see below) |

---

## Auto-Setup

> **Note:** Auggie compatibility — OMA HUD is designed for terminal ANSI output. Auggie may not support the `statusLine` API used by some HUD renderers. If statusline rendering is not available, the HUD falls back to inline markdown output. Phase 2: Actual statusline script implementation deferred pending Auggie statusLine API research.

To enable HUD on session start, add to `.oma/config.json`:

```json
{
  "hud": {
    "enabled": true,
    "preset": "focused",
    "position": "top-right"
  }
}
```

Or run on demand: `/oma:hud on` followed by `/oma:hud start <task>`.

---

## Display Presets

### Minimal
Single-line progress bar, no metrics. Good for constrained terminals.
```
[████████░░░░░░░░] 47% | step 3/7 | ETA 2m
```

**Config:**
```json
{ "preset": "minimal", "elements": { "mode": false, "iteration": false, "tokens": false, "time": true, "agents": false, "progress": true } }
```

### Focused
Balanced display: progress bar, current step, elapsed time, agent count.
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

**Config:**
```json
{ "preset": "focused", "elements": { "mode": true, "iteration": true, "tokens": false, "time": true, "agents": true, "progress": true } }
```

### Full
Full panel including resource metrics (CPU, memory, disk I/O).
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

**Config:**
```json
{ "preset": "full", "elements": { "mode": true, "iteration": true, "tokens": true, "time": true, "agents": true, "progress": true } }
```

---

## Display Elements

### Available Elements

| Element | Values | Default | Description |
|---------|--------|---------|-------------|
| `mode` | on/off | on | Show current mode (ralph, ultrawork, etc.) |
| `iteration` | on/off | on | Show iteration count |
| `tokens` | on/off | off | Show token usage |
| `time` | on/off | on | Show elapsed time |
| `agents` | on/off | on | Show active agents |
| `progress` | on/off | on | Show task progress bar |

### Display Position

- `position`: `top-right` (default), `top-left`, `bottom-right`, `bottom-left`

### Transparency

- `opacity`: 0.0 - 1.0 (default 0.8)

---

## Color Coding

| Status | Symbol | Color | Usage |
|--------|--------|-------|-------|
| Running | `►` | Yellow/amber | Active step in progress |
| Pass/Done | `✓` or `✅` | Green | Step completed successfully |
| Fail | `✗` or `❌` | Red | Step failed |
| Warning | `⚠️` | Yellow | Step completed with warnings |
| Pending | `○` | Dim/gray | Step not yet started |
| Not Started | `⏹️` | Gray | Step inactive |

---

## Configuration Schema

Stored in `.oma/hud.json`:

```json
{
  "enabled": true,
  "position": "top-right",
  "opacity": 0.8,
  "preset": "focused",
  "elements": {
    "mode": true,
    "iteration": true,
    "tokens": false,
    "time": true,
    "agents": true,
    "progress": true
  }
}
```

### Configure Element
```
/oma:hud config <element> <value>
# Examples:
/oma:hud config tokens on
/oma:hud config opacity 0.5
/oma:hud config position top-left
/oma:hud config preset full
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| HUD not visible | Auggie does not support ANSI statusline | Use inline markdown output mode (`/oma:hud format markdown`) |
| HUD flickers | Rapid update cadence | Reduce update frequency; use `/oma:hud config rate 5000` (5s minimum) |
| HUD covers output | Opacity too high | `/oma:hud config opacity 0.5` |
| HUD position wrong | Terminal not detected | `/oma:hud config position top-right` explicitly |
| HUD persists after task | Cleanup not called | `/oma:hud stop` explicitly at end of session |

> **Phase 2 note:** Actual statusline script implementation is deferred pending Auggie statusLine API research. See `.oma/plans/` for the deferred implementation plan.

---

## Constraints

- Don't spam updates — minimum 3-second interval between HUD refreshes
- Keep information scannable — no full-width dumps blocking terminal
- Show meaningful metrics only when actively running
- Clean up on exit — always call `/oma:hud stop` at session end
- Handle terminal resize — HUD should not overflow if terminal is < 80 cols wide