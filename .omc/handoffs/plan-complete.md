## Handoff: plan → team-exec

- **Decided**: TypeScript rewrite of all 7 shell hooks → `.mjs`; Vitest test pyramid replacing bats; npm package with `prepare: tsc` + committed precompiled `.mjs` files; 95% branch coverage gate with bounded `/* v8 ignore */`; `hooks.json` updated as CI Step 0 before tests run.
- **Rejected**: Pure Bash + MSYS2 (no coverage tooling); `postinstall: tsc` model (contradicts zero runtime deps); `windows-latest` CI (PowerShell not bash).
- **Risks**: Uncovered error paths (ENOSPC, EPERM) need `vi.mock` or `/* v8 ignore */`; behavioral parity tests required before shell script deletion; Windows WSL/Git Bash path issues caught via code review not CI.
- **Files**: `.omc/plans/oma-windows-support-ralplan.md`, `architect-review.md`, `critic-review.md`, `open-questions.md`.
- **Remaining**: Full implementation — 15 steps across infrastructure, hook rewrites, testing, CI.

**Team execution scope (15 steps from plan):**
1. Scaffold: `tsconfig.json`, `package.json`, `src/`, `tests/` dirs, `vitest.config.ts`
2. `src/types.ts` + `src/utils.ts` with shared types and utilities
3-9. Rewrite 7 hooks in TypeScript (`delegation-enforce` → `session-start`)
10. Hook up Vitest config with 95% coverage thresholds
11. Unit tests for all pure functions
12. Integration tests (stdin/stdout + file I/O)
13. E2E tests (subprocess spawn) + `tests/parity/` behavioral parity infrastructure
14. Update `hooks.json` CI step + update `.github/workflows/ci.yml`
15. Root `package.json` for npm distribution

**Dependencies**: Steps 3-9 (hooks) depend on Step 1 (scaffold) and Step 2 (shared types). Steps 11-13 depend on Steps 3-9. Step 14 (CI) depends on Steps 10-13.
