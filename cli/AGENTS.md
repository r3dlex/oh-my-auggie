<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# cli

## Purpose
CLI companion implementation for oh-my-auggie. Contains the main entry module, shared utilities, and subcommand/worker modules that back the `oma` binary. This is where the bulk of the CLI logic lives.

## Key Files
| File | Description |
|------|-------------|
| oma.mjs | Main CLI entry module; parses arguments and dispatches to commands |
| utils.mjs | Shared utility functions used across CLI modules |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| commands/ | Individual subcommand implementations (doctor, hud, team, wrapper) |
| workers/ | Background worker modules used by CLI commands |

## For AI Agents
### Working In This Directory
Read existing patterns in `commands/` before adding new subcommands. New commands should follow the same module shape as the existing four (`doctor.mjs`, `hud.mjs`, `team.mjs`, `wrapper.mjs`). Shared helpers belong in `utils.mjs`.

### Testing Requirements
E2E bats tests in `e2e/oma-cli.bats` cover CLI integration. Run them with `bats e2e/oma-cli.bats` from the repo root to verify CLI behaviour after changes.

### Common Patterns
- Modules use `.mjs` (ES module) extension
- Commands are thin dispatchers; heavy logic lives in workers or utilities

## Dependencies
### Internal
- `bin/oma` — entrypoint that loads `cli/oma.mjs`

### External
- Node.js (ES modules)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
