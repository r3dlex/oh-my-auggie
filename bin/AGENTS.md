<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# bin

## Purpose
CLI entrypoints for oh-my-auggie. Contains the executable(s) that are placed on `PATH` and invoked by end users. Changes here affect the public CLI interface directly.

## Key Files
| File | Description |
|------|-------------|
| oma | Shell executable entrypoint for the `oma` CLI command |

## For AI Agents
### Working In This Directory
These are CLI entrypoints. Any change to files in `bin/` alters the interface that users and scripts invoke. Keep entrypoints thin — delegate logic to `cli/` modules rather than implementing it here.

### Testing Requirements
Verify that the entrypoint correctly delegates to `cli/oma.mjs` after changes. E2E bats tests in `e2e/` cover the full invocation path.

### Common Patterns
- Entrypoints should be executable (`chmod +x`) and start with an appropriate shebang

## Dependencies
### Internal
- `cli/oma.mjs` — main CLI implementation

### External
- None

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
