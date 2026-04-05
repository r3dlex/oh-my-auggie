---
name: hud
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

## /hud

**Purpose:** Configure the HUD (heads-up display) for real-time metrics during execution.

**Usage:**
- `/hud on` — Enable HUD
- `/hud off` — Disable HUD
- `/hud config <setting>` — Configure specific element
- `/hud reset` — Reset to defaults

**Examples:**
- `/hud on`
- `/hud config mode ralph`
- `/hud config show-tokens true`
- `/hud reset`

---

## HUD Elements

### Available Elements

| Element | Values | Default | Description |
|---------|--------|---------|-------------|
| `mode` | on/off | on | Show current mode |
| `iteration` | on/off | on | Show iteration count |
| `tokens` | on/off | off | Show token usage |
| `time` | on/off | on | Show elapsed time |
| `agents` | on/off | on | Show active agents |
| `progress` | on/off | on | Show task progress |

### Display Position
- `position`: `top-right` (default), `top-left`, `bottom-right`, `bottom-left`

### Transparency
- `opacity`: 0.0 - 1.0 (default 0.8)

---

## Commands

### Enable/Disable
```
/hud on    # Show HUD
/hud off   # Hide HUD
```

### Configure Element
```
/hud config <element> <value>
# Examples:
/hud config tokens on
/hud config opacity 0.5
/hud config position top-left
```

### Reset
```
/hud reset  # Restore all defaults
```

---

## Configuration

Stored in `.oma/hud.json`:
```json
{
  "enabled": true,
  "position": "top-right",
  "opacity": 0.8,
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

### Constraints

- HUD requires terminal support (ANSI codes)
- Some elements may impact performance
- Token counting requires API access
