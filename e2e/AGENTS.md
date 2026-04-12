<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# e2e

## Purpose
End-to-end tests for oh-my-auggie using bats (Bash Automated Testing System). Tests in this directory validate the full invocation path of the `oma` CLI, including hook integration and actual command output, rather than isolated unit behaviour.

## Key Files
| File | Description |
|------|-------------|
| oma-cli.bats | bats test suite covering CLI command behaviour and hook output |

## For AI Agents
### Working In This Directory
Run `bats e2e/oma-cli.bats` from the repo root to execute the suite. Tests validate actual hook output and real CLI invocations — do not mock the CLI or the hooks when writing new tests here. Add new `.bats` files for new feature areas; keep existing test files focused on their existing scope.

### Testing Requirements
- bats must be installed (`brew install bats-core` on macOS)
- Run from repo root so that relative paths to `bin/oma` resolve correctly
- All tests must pass before merging changes to `bin/` or `cli/`

### Common Patterns
- Each `@test` block invokes the real `oma` binary and asserts on stdout/stderr/exit code
- Use `run` + `assert_output` / `assert_success` bats helpers

## Dependencies
### Internal
- `bin/oma` — the binary under test
- `cli/` — implementation exercised by tests

### External
- [bats-core](https://github.com/bats-core/bats-core) — Bash Automated Testing System

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
