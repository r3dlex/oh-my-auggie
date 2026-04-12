<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# hooks

## Purpose
Auggie hook registration configuration. `hooks.json` declares which compiled hook scripts run for each auggie hook lifecycle event (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`). The hook scripts themselves are TypeScript source in `../src/hooks/` and compiled to `../dist/hooks/`.

## Key Files
| File | Description |
|------|-------------|
| hooks.json | Hook registration manifest. Maps lifecycle events to compiled JS scripts in `dist/hooks/`. |

## For AI Agents
### Working In This Directory
After adding a new hook TypeScript file in `../src/hooks/`, register it in `hooks.json` under the appropriate lifecycle event (`SessionStart`, `PreToolUse`, `PostToolUse`, or `Stop`). The hook command path must reference the compiled output: `node ${AUGMENT_PLUGIN_ROOT}/dist/hooks/<name>.js`. Set a `timeout` in milliseconds appropriate to the hook's expected runtime.

Current hook registrations:
- **SessionStart**: `session-start.js` (5000ms)
- **PreToolUse**: `graph-provider-bridge.js`, `delegation-enforce.js`, `approval-gate.js`, `adr-enforce.js` (all 5000ms)
- **PostToolUse**: `post-tool-status.js` (3000ms), `cost-track.js`, `keyword-detect.js`, `audit-log.js` (all 5000ms)
- **Stop**: `stop-gate.js` (5000ms)

### Testing Requirements
After modifying `hooks.json`, run `npm run build` from `plugins/oma/` to ensure the referenced scripts compile successfully. Verify hooks fire correctly in a live auggie session via `/oma:status`.

### Common Patterns
- Multiple hooks can be registered per lifecycle event; they run in array order.
- Keep `timeout` values conservative — hooks that exceed their timeout are skipped silently.
- The `${AUGMENT_PLUGIN_ROOT}` variable is resolved by auggie at runtime.

## Dependencies
### Internal
- `../src/hooks/` — TypeScript source files compiled to `dist/hooks/`
- `../dist/hooks/` — compiled hook scripts referenced by this config (generated, not committed)

### External
- auggie CLI — reads `hooks.json` at plugin load time

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
