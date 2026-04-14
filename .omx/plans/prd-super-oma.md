# PRD / Architecture Plan — super-oma

## Summary
`super-oma` is a standalone CLI/TUI supervisor that runs **on top of Auggie + OMA**. It does not replace Auggie's executor or OMA's plugin/workflow semantics. Instead, it adds a modern session shell around them: tmux-managed panes, a persistent HUD/statusline, an activity feed, command simplification, session attach/reconcile, and better operational ergonomics.

## Problem
`oh-my-auggie` already provides strong workflow semantics through the OMA plugin, but its current sidecar CLI/HUD is lightweight compared to the more integrated HUD/tmux experience available in `oh-my-codex`. Users want a more modern runtime shell around Auggie without rewriting Auggie itself or discarding OMA marketplace/plugin compatibility.

## Goals
1. Provide a wrapper-first UX around Auggie + OMA with tmux-driven session management.
2. Surface current mode, task, worker/session activity, commands, and tool/step traces in a stable HUD.
3. Keep OMA as the plugin/workflow layer and reuse existing `.oma` state where possible.
4. Ship as a separate binary (`super-oma`) while remaining in the same repo/package family as OMA.
5. Degrade gracefully when tmux or rich hook events are unavailable.

## Non-goals
- Rewriting Auggie's internal TUI.
- Replacing OMA command semantics or implementing a second orchestration framework.
- Making `super-oma` a hard dependency for existing `oma` users.
- Depending on undocumented Auggie screen layout or brittle terminal scraping for core correctness.

## Principles
1. **Wrapper, not rewrite** — Auggie remains the execution engine; OMA remains the workflow/plugin layer.
2. **Contracts over coupling** — shared code is limited to schemas, discovery helpers, and parsers; no cross-package runtime entanglement.
3. **Graceful degradation** — state-only mode must still work without tmux or rich hook events.
4. **Observability first** — structured events and pane/session metadata precede advanced UI chrome.
5. **Opt-in adoption** — existing `oma` flows remain valid; `super-oma` is an additive path.
6. **Bounded hook impact** — any new OMA hook emission must stay additive, lightweight, versioned, and low-latency so Auggie sessions are not penalized by UI-side observability work.

## Decision Drivers
1. **Robustness against Auggie UI change** — avoid building on internal TUI rendering assumptions.
2. **Speed to value** — reuse current OMA hook/state surfaces and proven tmux/HUD patterns from OMX.
3. **Standalone evolution** — allow `super-oma` to mature without forcing wholesale OMA/OMX dependency sharing.
4. **Operational safety** — reconcile, attach, and recovery flows must not disrupt the leader Auggie pane during normal session repair.

## RALPLAN-DR Viable Options

### Option A — tmux supervisor + sidecar HUD (Recommended)
`super-oma` launches and supervises a tmux topology where Auggie runs in one pane and HUD/activity panes run alongside it. It reads `.oma/state.json`, `.oma/team/*`, and new additive event logs emitted by OMA hooks.

**Pros**
- Most robust path; avoids nesting TUIs.
- Builds directly on current OMA CLI/state/hook model.
- Keeps responsibilities clean: `super-oma` observes/displays/manages panes; OMA executes workflows.
- Compatible with incremental rollout.

**Cons**
- UX is multi-pane rather than a single embedded app surface.
- Requires tmux for the best experience.

### Option B — PTY-hosted wrapper that embeds Auggie in a custom TUI shell
`super-oma` owns the full terminal and runs Auggie in an embedded PTY viewport with custom chrome around it.

**Pros**
- Highest perceived polish.
- Can feel like one cohesive product.

**Cons**
- High fragility.
- Considerably more engineering complexity around fullscreen terminal behavior.
- More likely to break on Auggie rendering changes.

### Option C — ACP/SDK-native custom client
Build a new client on Auggie ACP/SDK surfaces and reconstitute the desired runtime without using Auggie's interactive TUI directly.

**Pros**
- Cleanest long-term architecture.
- Maximum control over UI and orchestration shell.

**Cons**
- Largest scope.
- Risks feature-parity drift from Auggie interactive mode.
- Delays user value.

## Recommendation
Adopt **Option A** for v1. Treat Option B as an experimental phase and Option C as a possible long-term evolution only if Auggie ACP/SDK reaches the needed parity.

## ADR
### Decision
Build `super-oma` as a **tmux-based standalone supervisor** that wraps Auggie + OMA, consumes additive OMA contracts/events, and provides HUD/status/session control without changing OMA's underlying workflow semantics.

### Drivers
- Preserve compatibility with OMA plugin/marketplace installation.
- Deliver a usable status/HUD/session layer quickly.
- Minimize fragility versus embedding Auggie.

### Alternatives considered
- PTY-embedded custom TUI shell.
- ACP/SDK-native replacement client.
- Expanding the existing `oma` CLI in-place instead of creating a separate binary.

### Why chosen
It offers the strongest balance of speed, robustness, and architectural cleanliness. It also keeps a path open to richer future integration without betting the whole product on undocumented terminal behavior.

### Consequences
- Best UX requires tmux.
- Event quality becomes important; OMA hooks need to emit cleaner structured telemetry.
- `super-oma` will own topology, HUD rendering, and session UX, but not core workflow semantics.

### Follow-ups
1. Add structured event emission from OMA hooks.
2. Add machine-readable command metadata for OMA commands.
3. Implement `super-oma` tmux supervisor and HUD.
4. Add reconcile/doctor flows for pane/session recovery.
5. Evaluate a PTY-embedded shell after v1 stabilizes.

## Ownership Boundaries
### OMA owns
- Auggie plugin registration and marketplace install.
- Hook execution inside Auggie.
- Existing slash command/workflow semantics (`/oma:*`).
- Existing `.oma` state files and plugin configuration.

### super-oma owns
- tmux session/pane topology.
- HUD/activity rendering.
- simplified command launcher surface.
- session attach/reconcile UX.
- additive session registry and UI state.

### Shared contracts package owns
- JSON schemas.
- parsers/validators.
- command discovery helpers.
- event type definitions.
- schema versions / compatibility helpers.

**Rule:** shared contracts are **data-only**; no tmux logic, rendering, or orchestration lives there.

## Acceptance Criteria
1. `super-oma` can launch a tmux-backed Auggie session without changing OMA command semantics.
2. `super-oma status` and `super-oma doctor` work when tmux is unavailable, using `.oma` state only.
3. Structured hook events enrich the HUD/activity experience when available, but are not required for correctness.
4. Reconcile flows can restore missing HUD/inspector panes without restarting or mutating the leader Auggie pane.
5. Existing `oma` users can continue using current entrypoints without installing or invoking `super-oma`.

## Fallback Matrix
### Tier 1 — state-only
Available without tmux and without structured hook events.
- Read `.oma/state.json`
- Read `.oma/team/*/status.json`
- Show static `super-oma status`
- Show minimal `super-oma doctor`

### Tier 2 — state + structured events
Adds hook-emitted JSONL events.
- Live activity feed
- command/tool timeline
- per-pane/session summaries
- better statusline context

### Tier 3 — full tmux UX
Best experience.
- leader pane running Auggie
- bottom HUD pane
- optional right-side inspector/log pane
- session attach/reconcile/resume flows

## Concrete Package / Module Layout
Recommended repo layout inside `oh-my-auggie`:

```text
packages/
  oma-contracts/
    src/
      state-schema.ts
      event-schema.ts
      command-manifest.ts
      session-schema.ts
  super-oma-core/
    src/
      session-registry.ts
      event-store.ts
      command-catalog.ts
      mode-model.ts
      health.ts
  super-oma-tmux/
    src/
      topology.ts
      panes.ts
      reconcile.ts
      launch.ts
  super-oma-ui/
    src/
      hud-renderer.ts
      activity-renderer.ts
      statusline.ts
      inspector.ts
  super-oma-cli/
    src/
      index.ts
      commands/
        up.ts
        attach.ts
        status.ts
        hud.ts
        sessions.ts
        team.ts
        doctor.ts
        run.ts
plugins/oma/
  src/hooks/
    emit-event.ts (new helper)
    ...existing hooks
```

## Session / tmux Model
### Primary topology
For `super-oma up`:
- **Pane A (leader):** `auggie`
- **Pane B (bottom HUD):** `super-oma hud --watch`
- **Pane C (optional inspector):** `super-oma sessions inspect --watch`

### Stored topology metadata
Per session, write additive metadata under:
```text
.oma/sessions/<session-id>/
  session.json
  panes.json
  topology.json
```

Fields include:
- tmux session name
- pane ids
- cwd
- started_at
- active mode
- attached command profile
- health/reconcile status

### Reconcile model
`super-oma reconcile` should:
- detect missing HUD pane
- recreate HUD pane if missing
- resize panes to preferred layout
- mark degraded mode if tmux session is missing
- never destroy Auggie leader pane without explicit user action

## State + Event Model
### Existing inputs to consume
- `.oma/state.json`
- `.oma/notepad.json`
- `.oma/team/worker-*/meta.json`
- `.oma/team/worker-*/status.json`
- `.oma/team/worker-*/log.txt`

### New additive event stream
Write JSONL under:
```text
.oma/events/<session-id>.jsonl
```

Event schema (minimum):
- `ts`
- `session_id`
- `source` (`hook`, `super-oma`, `tmux`, `user`)
- `kind` (`mode_changed`, `command_detected`, `tool_started`, `tool_finished`, `worker_spawned`, `worker_status`, `session_started`, `session_stopped`, `warning`, `error`)
- `mode`
- `command`
- `tool_name`
- `agent`
- `pane_id`
- `status`
- `message`
- `seq`

### Event producers
Prefer additive changes in OMA hooks:
- `session-start.ts`
- `post-tool-status.ts`
- `audit-log.ts`
- `keyword-detect.ts`
- future `session-end.ts` if Auggie supports it cleanly

## Command Surface
### Core lifecycle
- `super-oma up` — create or attach to tmux topology around Auggie
- `super-oma attach` — attach to existing managed tmux session
- `super-oma status` — show current health and mode
- `super-oma hud` — render/watch HUD
- `super-oma reconcile` — restore missing HUD/inspector panes
- `super-oma doctor` — diagnose install, tmux, hooks, state, sessions

### Session + activity
- `super-oma sessions list`
- `super-oma sessions inspect <id>`
- `super-oma events tail [--session <id>]`
- `super-oma panes list`

### Workflow launcher convenience
- `super-oma run ralplan "..."`
- `super-oma run ralph "..."`
- `super-oma run team "..."`
- `super-oma run command /oma:status`

These should inject commands into the leader pane or print exact command strings to run. They should not redefine what those OMA commands mean.

## Command Catalog Strategy
Do not parse freeform markdown on every UI refresh. Instead:
1. Generate a **machine-readable OMA command manifest** from `plugins/oma/commands/*.md` during build or install.
2. Store it as a JSON artifact consumed by `super-oma-core`. Manifest generation must fail loudly in build/install flows if required metadata is malformed.
3. Include command name, aliases, description, mode impact, and help text.

## Phased Implementation Plan
### Phase 0 — contracts and telemetry foundation
- Define shared schemas for state/events/session metadata.
- Add additive structured event emitter helper to OMA hooks.
- Generate command manifest from OMA commands.
- Keep existing `oma` CLI working unchanged.

### Phase 1 — standalone supervisor MVP
- Create `super-oma up`, `attach`, `status`, `hud`, `doctor`, `reconcile`.
- Support tmux topology with leader + HUD panes.
- Read existing `.oma` state and new events.
- Minimal modern HUD: mode, task, recent commands, worker states, latest tool activity.

### Phase 2 — richer operational shell
- Add inspector pane and session registry.
- Add event timeline and filtered views.
- Add launcher conveniences (`super-oma run ...`).
- Add pane-aware statusline rendering and better recovery flows.

### Phase 3 — multi-session / team ergonomics
- Support named session profiles.
- Add pane templates for planning/execution/verification lanes.
- Integrate with OMA team surfaces without replacing their semantics.
- Add optional command palette / quick actions.

### Phase 4 — experimental embedded shell (optional)
- Prototype PTY-hosted embedded Auggie mode behind a feature flag.
- Evaluate whether stability justifies continued investment.

## Acceptance Criteria
1. A user can install OMA as before and independently invoke `super-oma`.
2. `super-oma up` launches a stable tmux topology with Auggie + HUD.
3. HUD reflects mode/task/worker/activity using `.oma` state plus additive events.
4. If the HUD pane dies, `super-oma reconcile` restores it without killing the leader pane.
5. If tmux is unavailable, `super-oma status` and `super-oma doctor` still work in degraded mode.
6. Existing `/oma:*` commands remain the source of workflow behavior.
7. `super-oma` can present the available OMA commands from a manifest rather than brittle ad-hoc parsing.

## Verification Strategy
### Unit
- schema validation for state/event/session files
- schema-version compatibility checks across contracts and emitted artifacts
- command manifest parsing/generation
- tmux topology planning logic
- HUD rendering from mocked state/event inputs

### Integration
- create a temporary `.oma/` fixture and verify `status`, `hud`, `doctor`
- verify event ingestion from JSONL fixtures
- verify `reconcile` recreates missing HUD pane metadata

### End-to-end
- spawn tmux session in CI-compatible environment where possible
- launch `super-oma up`
- verify leader pane remains alive
- verify HUD pane appears and updates from synthetic events
- verify attach/reconcile flows

### Manual / operator
- run with real Auggie + OMA install
- trigger `/oma:ralplan`, `/oma:ralph`, `/oma:team`, `/oma:status`
- confirm activity feed and mode/status update correctly

## Available Agent Types for Execution
- `architect` — boundaries, packaging, contracts, tmux model
- `planner` — sequencing and milestone refinement
- `executor` — implementation of CLI/core/ui modules
- `debugger` — pane/session/reconcile failures
- `test-engineer` — fixture/e2e coverage and CI harness
- `verifier` — acceptance validation and evidence gathering
- `writer` — docs, install/migration guidance
- `critic` — challenge design drift or boundary violations

## Suggested Staffing Guidance
### If executing with `ralph`
Use one persistent owner with targeted consults:
1. `architect` (high) — finalize contracts and boundaries
2. `executor` (high) — implement Phase 0/1
3. `test-engineer` (medium) — lock verification path
4. `verifier` (high) — confirm tmux/HUD evidence before completion

### If executing with `team`
Suggested lanes:
- **Lane 1 — contracts/hooks**: `architect` + `executor` (high)
- **Lane 2 — supervisor/tmux core**: `executor` (high)
- **Lane 3 — HUD/UI rendering**: `executor` or `designer` + `executor` (medium/high)
- **Lane 4 — tests/verification**: `test-engineer` + `verifier` (medium/high)
- **Lane 5 — docs/adoption**: `writer` (medium)

## Launch Hints for Later Execution
- Sequential path: `$ralph "Implement Phase 0 and Phase 1 of super-oma per .omx/plans/prd-super-oma.md and .omx/plans/test-spec-super-oma.md"`
- Parallel path: `$team 4:executor "Implement super-oma per .omx/plans/prd-super-oma.md with contracts, tmux supervisor, HUD, and tests"`

## Team Verification Path
Before declaring implementation complete:
1. schema/unit tests green
2. command-manifest generation verified
3. tmux supervisor integration verified in fixture or live environment
4. HUD updates from state + events verified
5. reconcile flow demonstrated
6. degraded no-tmux mode demonstrated
7. docs updated for install/use/boundaries
