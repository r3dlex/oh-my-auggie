<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# benchmarks

## Purpose
Benchmark and smoke-test infrastructure for OMA. Contains a smoke test entry point and a `baselines/` directory with recorded baseline outputs used to detect performance or behavioral regressions.

## Key Files
| File | Description |
|------|-------------|
| smoke-test.ts | Smoke test runner that exercises core OMA functionality end-to-end |
| baselines/smoke-test-baseline.json | Recorded baseline output for the smoke test; used to detect regressions |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| baselines/ | Recorded baseline snapshots compared against current output during smoke tests |

## For AI Agents
### Working In This Directory
Run `npx ts-node benchmarks/smoke-test.ts` from `plugins/oma/` to execute the smoke test. After intentional behavior changes, update `baselines/smoke-test-baseline.json` to reflect the new expected output.

### Testing Requirements
The smoke test is separate from the main `npm test` suite. Run it manually before releasing to catch end-to-end regressions not caught by unit tests.

### Common Patterns
- `smoke-test.ts` exercises the plugin as a whole, not individual units.
- Baseline JSON captures the expected shape of hook outputs and state transitions.
- When updating baselines, commit the updated JSON alongside the code change that caused it.

## Dependencies
### Internal
- `../src/` — plugin source exercised by the smoke test
- `../dist/` — compiled output (run `npm run build` before running smoke tests)

### External
- Node.js >= 18
- ts-node (for running `.ts` directly)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
