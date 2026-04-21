# oh-my-auggie (OMA) for VS Code

Visualize oh-my-auggie agents and workflows directly in VS Code.

## What it does

- **Active Workflows** panel: shows current OMA mode, active/stopped state, iteration count, and task summary read from `.oma/state.json`
- **Agents** panel: graceful empty state (oh-my-auggie does not expose agent tracking in a local JSON file)
- **Tasks** panel: graceful empty state (task tracking is handled via Claude Code native tools)
- **Status bar**: shows `OMA: idle` or `OMA: {mode} active` with a spinning icon

## Panels

| Panel | Source |
|-------|--------|
| Active Workflows | `.oma/state.json` — mode, active flag, iteration, task |
| Agents | Not available (shows placeholder) |
| Tasks | Not available (shows placeholder) |
