<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# src

## Purpose
TypeScript source for OMA hooks and skill helpers. Compiled by `npm run build` (runs `tsc`) to `dist/`. Contains hook implementations for all auggie lifecycle events (SessionStart, PreToolUse, PostToolUse, Stop), shared utilities, and TypeScript types used across the plugin.

## Key Files
| File | Description |
|------|-------------|
| index.ts | Main entry point; exports plugin registration |
| types.ts | Shared TypeScript type definitions used across hooks and utilities |
| utils.ts | Shared helper functions (state I/O, frontmatter parsing, etc.) |
| setup-rules.ts | Logic for installing/updating policy rule files |
| hooks/adr-enforce.ts | PreToolUse: blocks architectural changes without an ADR |
| hooks/approval-gate.ts | PreToolUse: enterprise gate blocking changes to sensitive paths |
| hooks/audit-log.ts | PostToolUse: appends tool-use records to the audit log |
| hooks/cost-track.ts | PostToolUse: tracks token spend per session |
| hooks/delegation-enforce.ts | PreToolUse: blocks Edit/Write when orchestration mode is active |
| hooks/graph-provider-bridge.ts | PreToolUse: injects graph provider context into tool calls |
| hooks/keyword-detect.ts | PostToolUse: detects magic keywords and activates skills |
| hooks/post-tool-status.ts | PostToolUse: injects status context after tool execution |
| hooks/session-start.ts | SessionStart: displays HUD and loads notepad context |
| hooks/stop-gate.ts | Stop: blocks session stop without architect PASS in ralph mode |
| skills/ralplan.ts | Skill helper logic for the ralplan consensus planning workflow |
| skills/ultrawork.ts | Skill helper logic for the ultrawork parallel execution workflow |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| hooks/ | One TypeScript file per auggie hook event handler |
| skills/ | TypeScript helpers for complex skill workflows |

## For AI Agents
### Working In This Directory
After changing any `.ts` file, run `npm run build` from `plugins/oma/` to compile. The compiled output lands in `dist/hooks/` and `dist/skills/`. Run `npm test` to verify no regressions. Do NOT create child `AGENTS.md` files for `hooks/` or `skills/` subdirectories.

### Testing Requirements
Unit tests for each hook live in `../tests/unit/hooks/`. Run `npm test` from `plugins/oma/`. All tests must pass before submitting a PR.

### Common Patterns
- Hook files export a single default async function that receives the auggie hook payload.
- Hooks read/write state via utilities in `utils.ts`.
- `types.ts` is the single source of truth for shared interfaces — add new types there, not inline.

## Dependencies
### Internal
- `../tests/` — unit and integration tests for all hook implementations
- `../hooks/hooks.json` — maps compiled hook scripts to lifecycle events

### External
- TypeScript / `tsc` — compilation
- vitest — test runner (via `npm test`)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
