<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# scripts

## Purpose
Utility and release scripts for oh-my-auggie. Scripts here automate tasks that support development, CI, and release workflows. They are intended to be run from the repo root rather than from within this directory.

## Key Files
| File | Description |
|------|-------------|
| release.ts | Release automation script for publishing new versions |
| validate-agents-md.sh | Validates AGENTS.md completeness and file count consistency across the repo |

## For AI Agents
### Working In This Directory
Always run scripts from the repo root (e.g., `bash scripts/validate-agents-md.sh`). Scripts should be self-contained and exit with a non-zero code on failure so they are safe to use in CI. New scripts must include a usage comment at the top.

### Testing Requirements
- `validate-agents-md.sh` exits 0 when all checks pass and 1 when mismatches are found — use it to verify AGENTS.md coverage after adding or removing directories
- New scripts should be smoke-tested locally before committing

### Common Patterns
- Shell scripts use `set -euo pipefail` and a `#!/usr/bin/env bash` shebang
- TypeScript scripts (`.ts`) are run via `tsx` or `ts-node`

## Dependencies
### Internal
- Operates on repo-wide file structure (reads AGENTS.md files, etc.)

### External
- bash, find, wc (standard POSIX tools)
- tsx / ts-node for TypeScript scripts

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
