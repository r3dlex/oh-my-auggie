# VS Code Extensions for oh-my-githubcopilot, oh-my-gemini, oh-my-auggie

**Date:** 2026-04-21
**Status:** Draft
**Complexity:** HIGH
**Estimated scope:** ~15 new files per extension, 1 shared library package, 3 CI workflow updates

---

## Context

A reference VS Code extension exists at `jmstar85-oh-my-githubcopilot/vscode-omg/` (published as v1.1.7). The `oh-my-githubcopilot` fork already has a working `vscode-omp/` (v0.1.0) that evolved beyond the reference with multi-directory state support (`.omx/` + `.omp/`), agent discovery from three directories, and a Plans tree panel. Neither oh-my-gemini nor oh-my-auggie have VS Code extensions yet.

The core requirement is **real-time visualization of running agents and task progress** -- richer than the reference's workflow mode/phase display. Each repo writes state in different locations and formats.

---

## RALPLAN-DR Summary

### Principles

1. **Real-time first** -- File watchers must propagate state changes to UI within 1 second of disk write.
2. **State-format agnostic core** -- The shared library reads any `*-state.json` / `.jsonl` format and normalizes to a common ViewModel.
3. **Zero-config activation** -- Extensions activate on startup and auto-detect state directories; no user configuration required to see running workflows.
4. **Repo-owned extensions** -- Each extension lives inside its repo so CI, versioning, and release are self-contained.
5. **Additive over rewrite** -- Build on vscode-omp patterns (already proven), do not redesign from scratch.

### Decision Drivers

1. **State file divergence** -- oh-my-githubcopilot uses `.omx/state/` + `.omp/state/`, oh-my-gemini uses `.omg/state/`, oh-my-auggie uses `.oma/state.json` + `.oma/sessions/` + `.oma/events/*.jsonl` + `.oma/team/worker-N/status.json`.
2. **Agent format divergence** -- githubcopilot: `.copilot/agents/`, `.github/agents/`, `agents/` (*.md). Gemini: `agents/*.md` (flat). Auggie: `plugins/oma/agents/` (if present) + no `.github/agents/` convention.
3. **Subagent/task tracking** -- oh-my-gemini has `subagent-tracker.json` + `.ndjson` events. oh-my-auggie has `oma-contracts` with `SuperOmaEvent` in `.oma/events/{sessionId}.jsonl`. oh-my-githubcopilot has no explicit subagent tracker (workflow state only).

### Viable Options

#### Option A: Monorepo with shared `@omc/vscode-core` package (Recommended)

Create a new `packages/vscode-core/` in a shared location (or within each repo as a git submodule / npm package) containing the normalized state reader, TreeView base classes, and file watcher utilities. Each repo's `vscode-{prefix}/` imports from it.

| Pros | Cons |
|------|------|
| Single source of truth for TreeView providers, state normalization, status bar logic | Adds a cross-repo dependency to manage |
| Bug fixes propagate to all three extensions | Versioning requires coordination |
| ~60% code reuse (tree views, status bar, file watcher setup) | Initial setup cost to extract and publish |

#### Option B: Fork-and-diverge (copy vscode-omp into each repo, customize)

Copy the existing `vscode-omp/` into oh-my-gemini as `vscode-omg/` and oh-my-auggie as `vscode-oma/`, then customize state readers and agent discovery per repo.

| Pros | Cons |
|------|------|
| Zero cross-repo dependency | Triple maintenance burden for shared logic |
| Each repo evolves independently | Bug fixes must be applied three times |
| Fastest to ship v0.1.0 | Drift guaranteed within weeks |

#### Option C: Single multi-backend extension

One VS Code extension that auto-detects which orchestrator is active and renders accordingly.

| Pros | Cons |
|------|------|
| Single install for users who use multiple tools | Massive `package.json` with all three command sets |
| No code duplication | Activation logic complex; testing matrix explodes |
| | Violates repo-owned principle; where does it live? |

**Decision: Option A** -- The monorepo-with-shared-core approach. However, to ship quickly, Phase 1 uses Option B (fork vscode-omp) and Phase 2 extracts the shared core once patterns stabilize across all three. This avoids premature abstraction while keeping the long-term architecture clean.

### ADR

- **Decision:** Fork vscode-omp per repo now (Phase 1), extract shared `@omc/vscode-core` library later (Phase 2).
- **Drivers:** State file divergence requires per-repo adapters; agent formats differ; shipping speed matters.
- **Alternatives considered:** Single multi-backend extension (rejected: violates repo-owned principle, complex activation), pure shared lib from day 1 (rejected: premature abstraction before patterns stabilize).
- **Why chosen:** Balances speed-to-ship with long-term maintainability. Phase 1 delivers working extensions in each repo within days. Phase 2 deduplicates once interfaces are proven.
- **Consequences:** Short-term code duplication across three repos. Requires discipline to keep adapters similar enough to extract later.
- **Follow-ups:** After all three v0.1.0 ship, create `@omc/vscode-core` extraction task.

---

## Work Objectives

1. Ship `vscode-omg/` in oh-my-gemini with real-time workflow + subagent visualization
2. Ship `vscode-oma/` in oh-my-auggie with real-time workflow + super-oma session/worker visualization
3. Enhance `vscode-omp/` in oh-my-githubcopilot with richer task-level detail (it already exists but lacks subagent tracking)
4. Add CI jobs for VSIX build+test in oh-my-gemini and oh-my-auggie

---

## State File Mapping

### oh-my-githubcopilot (vscode-omp, already exists)

| File pattern | Content | Watch glob |
|---|---|---|
| `.omx/state/*-state.json` | WorkflowState (mode, active, phase, iteration) | `.omx/**/*.json` |
| `.omp/state/*-state.json` | Legacy fallback | `.omp/**/*.json` |
| `.omx/state/sessions/{id}/*-state.json` | Per-session workflow state | (covered by glob above) |
| `.omx/plans/*.md` | Plan artifacts | `.omx/plans/**/*` |
| `.copilot/agents/*.md`, `.github/agents/*.md`, `agents/*.md` | Agent definitions | Already watched |

### oh-my-gemini (vscode-omg, NEW)

| File pattern | Content | Watch glob |
|---|---|---|
| `.omg/state/*-state.json` | WorkflowState (mode, active, current_phase, iteration) | `.omg/**/*.json` |
| `.omg/state/sessions/{id}/*-state.json` | Per-session workflow state | (covered) |
| `.omg/state/subagent-tracker.json` | **TrackedAgentRecord** map: id, type, status (running/completed/failed), teamName, startedAt | `.omg/state/subagent-tracker.json` |
| `.omg/state/subagent-tracker.ndjson` | Event stream: start/stop events per agent | `.omg/state/subagent-tracker.ndjson` |
| `.omg/state/tokens/usage.ndjson` | Token usage tracking | `.omg/state/tokens/**` |
| `.omg/plans/*.md` | Plan artifacts | `.omg/plans/**/*` |
| `.omg/state/team/{name}/events/task-lifecycle.ndjson` | Team task lifecycle events | `.omg/state/team/**/*.ndjson` |
| `agents/*.md` | 36 agent definitions (flat dir, description in frontmatter) | `agents/**/*.md` |

### oh-my-auggie (vscode-oma, NEW)

| File pattern | Content | Watch glob |
|---|---|---|
| `.oma/state.json` | OmaStateContract: schema_version, mode, active, iteration, maxIterations, task | `.oma/state.json` |
| `.oma/sessions/registry.json` | Session registry: active_session_id, sessions[] | `.oma/sessions/**/*.json` |
| `.oma/sessions/{id}/session.json` | SessionMetadataContract: session_id, created_at, leader_pane_id, degraded | (covered) |
| `.oma/sessions/{id}/topology.json` | TopologyContract: panes[] with role, status | (covered) |
| `.oma/sessions/{id}/panes.json` | PaneMetadataContract[] | (covered) |
| `.oma/events/{sessionId}.jsonl` | SuperOmaEvent stream: mode_changed, worker_spawned, worker_status, tool_started/finished | `.oma/events/**/*.jsonl` |
| `.oma/team/worker-N/status.json` | WorkerStatusContract: state, current_task_id | `.oma/team/**/*.json` |
| `.oma/team/worker-N/meta.json` | Worker metadata | (covered) |
| `.oma/plans/*.md` | Plan artifacts (via `.omc/plans/` from OMC layer) | `.oma/plans/**/*` + `.omc/plans/**/*` |
| `.omc/state/*-state.json` | OMC-layer state (when running with oh-my-claudecode) | `.omc/**/*.json` |

---

## Guardrails

### Must Have
- Real-time TreeView updates when state files change (< 1s latency)
- Running agents shown with spinning icon, completed with checkmark, failed with error icon
- Status bar showing active mode + phase (matching reference pattern)
- VSIX packages buildable via `npm run package` in each extension dir
- CI job that builds + packages VSIX on every push/PR
- Unit tests for state reader/adapter (vitest, matching existing test patterns)

### Must NOT Have
- No cross-repo npm dependencies in Phase 1 (copy, don't link)
- No WebView panels (TreeViews only -- keep it lightweight)
- No terminal integration or command execution from the extension (read-only visualization)
- No telemetry or analytics

---

## Task Flow

### Step 1: Scaffold vscode-omg for oh-my-gemini

**Acceptance criteria:**
- Directory `oh-my-gemini/vscode-omg/` exists with `package.json`, `tsconfig.json`, `src/extension.ts`
- `package.json` declares publisher `r3dlex`, display name `oh-my-gemini (OMG)`, engine `^1.96.0`
- Three TreeView panels registered: `omg.workflows`, `omg.agents`, `omg.subagents`
- Commands: `omg.initWorkspace`, `omg.clearState`, `omg.healthCheck`, `omg.showStatus`
- Activity bar icon with OMG branding
- `esbuild` compile script matching vscode-omp pattern
- `npm run compile` succeeds, `npm run package` produces `.vsix`

**Key files to create:**
```
vscode-omg/
  package.json          (adapt from vscode-omp, change prefix omg -> omg, add subagents view)
  tsconfig.json         (copy from vscode-omp)
  src/
    extension.ts        (adapt from vscode-omp)
    adapters/
      state-reader.ts   (read .omg/state/*-state.json, same WorkflowStateSummary interface)
      subagent-reader.ts (NEW: read .omg/state/subagent-tracker.json, parse TrackedAgentRecord)
    commands/
      clear-state.ts
      health-check.ts
      initialize.ts
      show-status.ts
    ui/
      tree-view.ts      (WorkflowTreeProvider + AgentTreeProvider + SubagentTreeProvider)
      status-bar.ts
    mcp/
      provider.ts       (register omg-cli-tools MCP server)
  resources/icons/
  vitest.config.ts
  test/unit/
```

**State reader specifics for oh-my-gemini:**
- `STATE_DIRECTORY_CANDIDATES = ['.omg/state']`
- Agent discovery: single `agents/` dir (36 `.md` files with `description:` frontmatter)
- SubagentTreeProvider reads `.omg/state/subagent-tracker.json`, displays each agent with status icon:
  - `$(sync~spin)` for running
  - `$(pass)` for completed
  - `$(error)` for failed
  - Shows `teamName` as description when present

### Step 2: Scaffold vscode-oma for oh-my-auggie

**Acceptance criteria:**
- Directory `oh-my-auggie/vscode-oma/` exists with full scaffold
- `package.json` declares publisher `r3dlex`, display name `oh-my-auggie (OMA)`
- Four TreeView panels: `oma.workflows`, `oma.agents`, `oma.sessions`, `oma.workers`
- Commands: `oma.initWorkspace`, `oma.clearState`, `oma.healthCheck`, `oma.showStatus`
- Dual state dir support: watches both `.oma/` and `.omc/`
- `npm run compile` succeeds, `npm run package` produces `.vsix`

**Key files to create:**
```
vscode-oma/
  package.json
  tsconfig.json
  src/
    extension.ts
    adapters/
      state-reader.ts     (read .oma/state.json -- single file, not dir of *-state.json)
      session-reader.ts   (NEW: read .oma/sessions/registry.json + per-session artifacts)
      worker-reader.ts    (NEW: read .oma/team/worker-N/{status,meta}.json)
      event-reader.ts     (NEW: parse .oma/events/{sessionId}.jsonl, SuperOmaEvent format)
      omc-state-reader.ts (read .omc/state/*-state.json for OMC layer state)
    commands/
      clear-state.ts
      health-check.ts
      initialize.ts
      show-status.ts
    ui/
      tree-view.ts        (WorkflowTreeProvider + AgentTreeProvider + SessionTreeProvider + WorkerTreeProvider)
      status-bar.ts
    mcp/
      provider.ts
  resources/icons/
  vitest.config.ts
  test/unit/
```

**State reader specifics for oh-my-auggie:**
- Primary state: `.oma/state.json` (single file with `OmaStateContract` shape: mode, active, iteration, maxIterations, task)
- Session tree: reads `.oma/sessions/registry.json` for active session, then `session.json` + `topology.json` per session. Shows pane roles and health.
- Worker tree: scans `.oma/team/worker-N/` directories, reads `status.json` (WorkerStatusContract) and `meta.json`. Displays worker state and current_task_id.
- Event parsing: reads `.oma/events/{activeSessionId}.jsonl` for recent SuperOmaEvent entries (last 20). Shows tool_started/worker_spawned in the session detail view.
- OMC overlay: also watches `.omc/state/*-state.json` for when oh-my-claudecode is layered on top.

### Step 3: Enhance vscode-omp in oh-my-githubcopilot

**Acceptance criteria:**
- Existing `vscode-omp/` gains a new "Tasks" TreeView panel (or enhanced workflow detail)
- If `.omx/state/subagent-tracker.json` exists (future OMC feature), display it
- Plan panel already exists -- verify it works correctly
- Status bar shows iteration count when available (already partially implemented)
- No regressions: existing unit tests still pass

**Key changes:**
- Add optional SubagentTreeProvider (graceful no-op if tracker file absent)
- Ensure `.omx/plans/` watcher is working (already present)
- Add `contextValue` to workflow items for future context menu actions

### Step 4: Add CI workflows for VSIX build

**Acceptance criteria:**
- `oh-my-gemini/.github/workflows/ci.yml` has a `vscode-omg` job (matching the pattern in oh-my-githubcopilot's CI)
- `oh-my-auggie/.github/workflows/ci.yml` has a `vscode-oma` job
- Jobs: `npm ci` -> `npm run compile` -> `npm test --if-present` -> `npm run package` -> upload VSIX artifact
- VSIX artifact uploaded with `retention-days: 1`

**CI job template (adapt per repo):**
```yaml
vscode-{prefix}:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: "22"
        cache: "npm"
        cache-dependency-path: vscode-{prefix}/package-lock.json
    - run: cd vscode-{prefix} && npm ci
    - run: cd vscode-{prefix} && npm run compile
    - run: cd vscode-{prefix} && npm test --if-present
    - run: cd vscode-{prefix} && npm run package --if-present
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: vscode-{prefix}-artifacts
        path: vscode-{prefix}/*.vsix
        if-no-files-found: ignore
```

### Step 5: Unit tests for state readers

**Acceptance criteria:**
- Each extension has `test/unit/state-reader.test.ts` with vitest
- Tests cover: empty state dir, malformed JSON, active workflow parsing, multiple workflows sorting
- oh-my-gemini: additional `test/unit/subagent-reader.test.ts` testing TrackedAgentRecord parsing
- oh-my-auggie: additional `test/unit/session-reader.test.ts` and `test/unit/worker-reader.test.ts`
- All tests pass with `npm test`

---

## Success Criteria

1. **All three extensions compile and package** -- `npm run package` produces a `.vsix` in each extension dir
2. **Real-time workflow visualization** -- Changing a `*-state.json` file triggers TreeView refresh within 1 second
3. **Agent listing** -- Each extension discovers and displays agents from repo-specific locations
4. **oh-my-gemini subagent tracking** -- Running/completed/failed agents visible in dedicated panel
5. **oh-my-auggie session/worker tracking** -- Active super-oma sessions, worker states, and event stream visible
6. **Status bar** -- Shows active mode, phase, and iteration count per repo's state format
7. **CI green** -- VSIX build job passes on push/PR in all three repos
8. **Unit tests pass** -- State reader tests cover happy path + error cases

---

## File Paths Reference

| Item | Path |
|---|---|
| Reference extension (jmstar85) | `/Users/andreburgstahler/Ws/Personal/AiTool/jmstar85-oh-my-githubcopilot/vscode-omg/` |
| Existing vscode-omp | `/Users/andreburgstahler/Ws/Personal/AiTool/oh-my-githubcopilot/vscode-omp/` |
| New vscode-omg target | `/Users/andreburgstahler/Ws/Personal/AiTool/oh-my-gemini/vscode-omg/` |
| New vscode-oma target | `/Users/andreburgstahler/Ws/Personal/AiTool/oh-my-auggie/vscode-oma/` |
| oma-contracts (type defs) | `/Users/andreburgstahler/Ws/Personal/AiTool/oh-my-auggie/packages/oma-contracts/` |
| Gemini agent definitions | `/Users/andreburgstahler/Ws/Personal/AiTool/oh-my-gemini/agents/` |
| Gemini subagent tracker | `oh-my-gemini/src/hooks/subagent-tracker/index.ts` (defines TrackedAgentRecord) |
| Gemini worktree paths | `oh-my-gemini/src/lib/worktree-paths.ts` (defines OmcPaths with .omg root) |
| Auggie super-oma utils | `oh-my-auggie/cli/super-utils.mjs` (defines session/worker/event paths) |
| Auggie OMA state utils | `oh-my-auggie/plugins/oma/src/utils.ts` (defines resolveOmaDir, loadOmaState) |
| Auggie contracts types | `oh-my-auggie/packages/oma-contracts/index.d.mts` (OmaStateContract, WorkerStatusContract, SuperOmaEvent) |
| GH Copilot CI workflow | `oh-my-githubcopilot/.github/workflows/ci.yml` (has vscode-omp job already) |
| Gemini CI workflow | `oh-my-gemini/.github/workflows/ci.yml` (needs vscode-omg job) |
| Auggie CI workflow | `oh-my-auggie/.github/workflows/ci.yml` (needs vscode-oma job) |
