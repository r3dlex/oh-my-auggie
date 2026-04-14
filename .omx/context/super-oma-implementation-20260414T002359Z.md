# Context Snapshot — super-oma implementation

## Task statement
Implement all phases of the approved super-oma plan inside oh-my-auggie, using a team execution lane and preserving OMA compatibility.

## Desired outcome
A release-ready implementation of super-oma with tmux supervisor, HUD/status/session UX, contracts, tests, docs, changelog, version bump, CI readiness, and release-prep documentation.

## Known facts / evidence
- Approved plan exists in `.omx/plans/prd-super-oma.md` and `.omx/plans/test-spec-super-oma.md`.
- `oh-my-auggie` already has `cli/oma.mjs`, `cli/commands/{team,hud,doctor}.mjs`, and plugin hooks/state under `plugins/oma/`.
- Existing plugin source is TypeScript in `plugins/oma/src/`; CLI companion is ESM `.mjs`.
- Team request explicitly requires an ultraqa-style verification pass between phases and release-readiness work at the end.

## Constraints
- Follow approved boundary: super-oma wraps Auggie + OMA; do not rewrite OMA semantics.
- Keep shared contracts data-only.
- Maintain degraded mode and non-destructive reconcile behavior.
- Ensure release docs, changelog, CI, and coverage targets are addressed before merge/release readiness claim.

## Unknowns / open questions
- Exact repo packaging layout for new super-oma packages/modules.
- Existing CI gaps needed to hit coverage thresholds and release readiness.

## Likely codebase touchpoints
- `cli/`
- `bin/`
- `plugins/oma/src/hooks/`
- `plugins/oma/package.json`
- repo root `package.json`
- `README.md`, `CHANGELOG.md`, `SPEC.md`, `CONTRIBUTING.md`, possibly other release docs
