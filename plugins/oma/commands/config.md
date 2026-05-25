---
command: /oma:config
description: View, set, or reset OMA configuration (global or local)
triggers: config, oma config, cfg
---

[EXECUTING /oma:config — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

# /oma:config

Manages OMA's two-tiered configuration system.

## Two-Tiered Model

- **Global config**: `~/.oma/config.json` -- system-wide defaults, applies to all projects
- **Local config**: `.oma/config.json` -- project-specific overrides
- **Merge order**: Defaults <- Global <- Local (local wins on conflict)
- **Exception**: `profile` is global-only -- local cannot override it

## Subcommands

### `get <key>`

Reads a config value from the merged config.

**Examples:**
- `/oma:config get profile` -- returns `"default"` or `"enterprise"`
- `/oma:config get hud.style` -- returns `"default"`, `"compact"`, or `"minimal"`
- `/oma:config get orchestration.mode` -- returns current default orchestration mode
- `/oma:config get paths.omaDir` -- returns global OMA directory path (expanded)

**Output**: Returns the value as a JSON string or "not set" if the key has no value.

### `set <key> <value> [--local]`

Writes a config value.

**Examples:**
- `/oma:config set hud.style compact` -- sets HUD to compact style (global)
- `/oma:config set hud.enabled false --local` -- disables HUD for this project only
- `/oma:config set orchestration.maxIterations 200` -- sets max iterations to 200
- `/oma:config set profile enterprise` -- sets enterprise profile (global only)

**Behavior:**
- Default scope is global (`~/.oma/config.json`).
- Use `--local` to write to project-level `.oma/config.json`.
- Nested keys supported via dot notation (`hud.style`, `orchestration.mode`).
- Profile can only be set globally (local scope with `profile` key prints a warning).

**Output**: Confirmation with the updated full config.

### `reset [--global] [--local]`

Resets config files to defaults.

**Examples:**
- `/oma:config reset --global` -- removes `~/.oma/config.json`, reverts to defaults
- `/oma:config reset --local` -- removes `.oma/config.json`, reverts to global defaults
- `/oma:config reset` -- resets both (with confirmation prompt)

**Behavior:**
- Removing a config file causes `getMergedConfig()` to fall back to the next tier.
- Reset is irreversible (no backup).

### `list [--scope global|local|merged]`

Lists config values.

**Examples:**
- `/oma:config list` -- shows merged config (all tiers combined)
- `/oma:config list --scope global` -- shows global config only
- `/oma:config list --scope local` -- shows local config only

**Output**: Formatted table of key-value pairs with scope indicators.

## Configuration Schema Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `version` | string | `"1.0"` | Config format version |
| `hud.enabled` | boolean | `true` | Show HUD on startup |
| `hud.style` | string | `"default"` | HUD display style: `default`, `compact`, `minimal` |
| `orchestration.mode` | string | `"ralph"` | Default orchestration mode |
| `orchestration.maxIterations` | number | `100` | Max iterations per mode |
| `paths.omaDir` | string | `"~/.oma"` | Global OMA directory |
| `paths.plansDir` | string | `"~/.oma/plans"` | Plans directory |
| `profile` | string | `"default"` | OMA profile: `default` or `enterprise` (global-only) |
| `graph.provider` | string | `"graphwiki"` | Knowledge graph tool: `graphwiki`, `graphify`, or `none` |
| `hooks.costTracking` | boolean | `false` | Emit per-tool credit/cost estimates to agent context |
| `hooks.statusMessages` | boolean | `false` | Inject OMA status (mode, tasks, notepad) into agent context after each tool |

## Hooks Configuration

Two hooks inject context into the agent after each tool call. Both are **disabled by default** to keep the agent context clean.

| Hook | Config key | What it does |
|------|-----------|--------------|
| `cost-track` | `hooks.costTracking` | Estimates credit/USD cost per tool call and writes to `.oma/cost-log.json` |
| `post-tool-status` | `hooks.statusMessages` | Injects OMA mode, task progress, notepad priority, and graph provider into agent context |

Enable either globally:

```bash
/oma:config set hooks.costTracking true
/oma:config set hooks.statusMessages true
```

Or per-project (`.oma/config.json`):

```json
{
  "hooks": {
    "costTracking": true,
    "statusMessages": true
  }
}
```

## Profile Behavior

The `profile` key controls enterprise features:

- **`default`**: Community mode -- all standard OMA features, no enterprise hooks enforced.
- **`enterprise`**: Enterprise mode -- ADR enforcement required for architectural changes, approval gates for sensitive paths, cost tracking enabled.

**Important**: `profile` can only be set in the global config (`~/.oma/config.json`). Setting `profile` in a local config is ignored with a warning. This prevents users from bypassing enterprise policies by creating a local config.

Example:
```
$ oma config get profile
"default"

$ oma config set profile enterprise
Config updated: profile = "enterprise" (global)

$ oma config set profile default --local
WARNING: profile is global-only and cannot be overridden locally.
Current profile remains: "enterprise"
```

## Cross-Platform Notes

- Global config path resolves via `os.homedir()`: Windows `C:\Users\<user>\.oma`, Unix `~/.oma`.
- The `expandTilde()` utility normalizes `~/.oma` for all platforms.
- Paths in the config file (e.g., `paths.omaDir`) are expanded at runtime, not stored expanded.
