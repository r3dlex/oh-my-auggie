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

**Purpose:** Configure the HUD (heads-up display) for real-time metrics during execution.

**Usage:**
- `/oma:hud on` — Enable HUD
- `/oma:hud off` — Disable HUD
- `/oma:hud config <setting>` — Configure specific element
- `/oma:hud reset` — Reset to defaults

**Examples:**
- `/oma:hud on`
- `/oma:hud config mode ralph`
- `/oma:hud config show-tokens true`
- `/oma:hud reset`

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
/oma:hud on    # Show HUD
/oma:hud off   # Hide HUD
```

### Configure Element
```
/oma:hud config <element> <value>
# Examples:
/oma:hud config tokens on
/oma:hud config opacity 0.5
/oma:hud config position top-left
```

### Reset
```
/oma:hud reset  # Restore all defaults
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
