<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# tests

## Purpose
Test suites for OMA. Organized into `unit/`, `e2e/`, and `parity/` subdirectories. Unit tests cover individual hook and utility logic; e2e tests run full plugin scenarios; parity tests ensure behavioral consistency across changes. Uses vitest as the test runner.

## Key Files
| File | Description |
|------|-------------|
| setup.ts | Global test setup (vitest configuration, shared fixtures) |
| hooks-setup.ts | Setup helpers specific to hook tests |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| unit/ | Isolated unit tests for hooks (`hooks/`) and skills (`skills/`) |
| e2e/ | End-to-end scenario tests for full plugin behavior |
| parity/ | Behavioral parity tests ensuring consistency across refactors |

## For AI Agents
### Working In This Directory
Run `npm test` from `plugins/oma/` to execute all tests. Run `npm run test:watch` for watch mode. Coverage reports go to `coverage/` (run `npm run coverage`).

When adding a new hook in `src/hooks/`, add a corresponding test file at `tests/unit/hooks/<hook-name>.test.ts`. When adding a skill helper in `src/skills/`, add tests at `tests/unit/skills/<skill-name>.test.ts`.

### Testing Requirements
All tests must pass before submitting a PR. The `unit/hooks/` directory contains one test file per hook:
- `adr-enforce.test.ts`, `adr-enforce-pure.test.ts`, `approval-gate.test.ts`, `audit-log.test.ts`
- `cost-track.test.ts`, `delegation-enforce.test.ts`, `graph-provider-bridge.test.ts`
- `keyword-detect.test.ts`, `post-tool-status.test.ts`, `release.test.ts`
- `session-start.test.ts`, `stop-gate.test.ts`

The `unit/skills/` directory contains `frontmatter-validate.test.ts`. The `unit/` root contains `utils.test.ts`. The `parity/` directory contains `runner.ts`.

### Common Patterns
- Tests import hook functions directly and call them with mocked auggie payloads.
- Shared test helpers live in `unit/helpers/`.
- Parity tests use `runner.ts` to replay recorded sessions and compare outputs.

## Dependencies
### Internal
- `../src/` — source files under test

### External
- vitest — test runner
- Node.js >= 18

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
