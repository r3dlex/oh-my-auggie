# Test Specification — super-oma

## Scope
Verification for the `super-oma` architecture and the first implementation phases (contracts + supervisor MVP).

## Test Matrix

### 1. Contracts and schema validation
- Validate existing `.oma/state.json` parsing against schema.
- Validate `.oma/team/worker-*/status.json` parsing against schema.
- Validate `session.json`, `panes.json`, and `topology.json` schema.
- Validate event JSONL line schema.
- Validate schema-version compatibility between contracts and emitted artifacts.
- Validate schema version compatibility / migration handling between OMA and `super-oma`.

### 2. Command manifest
- Generate a manifest from `plugins/oma/commands/*.md`.
- Verify required fields: name, description, aliases if present, mode impact.
- Verify build/install fails loudly on malformed required command metadata.

### 3. Supervisor / tmux logic
- Compute expected pane layout from configuration.
- Verify reconcile behavior when HUD pane is missing.
- Verify no destructive action against leader pane during reconcile.
- Verify degraded response when tmux is unavailable.

### 4. HUD rendering
- Render minimal HUD from state-only fixtures.
- Render richer HUD from state + event fixtures.
- Verify truncation, empty states, and error states.

### 5. Event ingestion
- Append synthetic hook events to JSONL.
- Verify hook-side event emission remains additive and low-latency under failure conditions.
- Verify timeline ordering using `seq` + timestamp.
- Verify deduping or recovery behavior for partial/corrupt lines.
- Verify hook emission stays within a bounded latency budget so observability does not materially slow Auggie hook execution.

### 6. End-to-end session flows
- `super-oma up`
- `super-oma attach`
- `super-oma status`
- `super-oma hud --watch`
- `super-oma reconcile`
- `super-oma doctor`

## Acceptance Tests
1. Start managed session and confirm pane metadata files are written.
2. Confirm HUD shows mode + task from `.oma/state.json`.
3. Confirm synthetic tool events appear in activity view.
4. Kill HUD pane and confirm `reconcile` restores it.
5. Run without tmux and confirm `status` / `doctor` still work.
6. Confirm OMA commands are launched/presented without semantic drift.
7. Confirm reconcile does not restart, resize destructively, or otherwise interfere with the leader Auggie pane.

## Evidence Required
- unit test output
- integration test output
- tmux pane list / reconcile evidence
- screenshots or terminal captures of HUD updates
- doctor/status output in degraded mode

## Not In Scope For MVP Verification
- PTY-embedded Auggie shell
- ACP/SDK-native replacement client
- replacing OMA team orchestration semantics
