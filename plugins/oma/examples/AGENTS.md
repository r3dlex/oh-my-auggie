<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# examples

## Purpose
Example TypeScript files demonstrating how to use OMA programmatically. Covers basic plugin usage, advanced delegation patterns, and the delegation enforcer hook in action.

## Key Files
| File | Description |
|------|-------------|
| basic-usage.ts | Introductory example showing minimal OMA plugin setup and command invocation |
| advanced-usage.ts | Advanced patterns: multi-agent delegation, state management, and orchestration modes |
| delegation-enforcer-demo.ts | Demonstrates the delegation-enforce hook blocking direct writes during orchestration |

## For AI Agents
### Working In This Directory
Examples are not compiled as part of the main build. They are reference material for contributors and users. When adding a new example, keep it self-contained and add a comment header describing what it demonstrates.

### Testing Requirements
Examples are not part of the automated test suite. Verify manually by running with `npx ts-node <file>.ts` or by reviewing that they import correctly from `../src/`.

### Common Patterns
- Examples import directly from `../src/` (not from `dist/`) so they reflect current source.
- Each file focuses on a single concept; avoid combining unrelated features in one example.

## Dependencies
### Internal
- `../src/` — source modules imported by examples

### External
- TypeScript / ts-node (for manual execution)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
