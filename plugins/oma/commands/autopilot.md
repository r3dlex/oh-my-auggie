---
name: autopilot
description: Full autonomous execution — expand requirements, plan, implement in parallel, QA, multi-perspective validation
argument-hint: "<goal>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
  - Task
model: sonnet4.6
---

[EXECUTING /oma:autopilot — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:autopilot

**Purpose:** Full autonomous execution from idea to working code.

**Usage:** `/oma:autopilot <goal>`

**Examples:**
- `/oma:autopilot add user authentication to the API`
- `/oma:autopilot refactor the payment module`

---

## How It Works

### Phase 1: Explore
Spawn **explorer** (haiku4.5) to map the codebase structure relevant to the goal.

### Phase 2: Plan
Spawn **planner** (claude-opus-4-7) to create a 3-6 step plan with acceptance criteria.

### Phase 3: Confirm
Present the plan to you for approval. Say "yes" or "proceed" to continue.

### Phase 4: Implement
- Independent steps run in parallel via **executor** (sonnet4.6)
- Each executor instance gets its own context window
- executor logs completion via `oma_task_log`

### Phase 5: Verify
Spawn **architect** (claude-opus-4-7) to verify each step against acceptance criteria.

### Phase 6: QA Cycling
If any step fails verification:
1. Fix the issue
2. Re-verify
3. Repeat up to 5 times

### Phase 7: Final Verdict
architect renders: **PASS** / **FAIL** / **PARTIAL**

---

## State Management

- Mode: `autopilot` (set via `oma_mode_set`)
- State persists to `.oma/state.json`
- Cancel with `/oma:cancel`

## Constraints

- executor is the only agent permitted to write files
- All other agents use read-only tools
- Parallel steps maximize throughput
- Escalate to architect after 3 failed fix attempts

---

## <Do_Not_Use_When>

- **When the codebase is unmapped and you are unsure of the scope.** Autopilot assumes a goal that is at least partially addressable — if the codebase structure is completely unknown and the goal is vague, explore first with `/oma:explore` before invoking autopilot.
- **When a single, tightly-scoped change is needed.** For one-line fixes, config updates, or single-file edits, invoke `executor` directly. Autopilot's 7-phase pipeline adds unnecessary overhead.
- **When you need to stay in a specific tool context.** Autopilot may spawn agents that switch contexts mid-task. If the task must remain in the current CLI session, use `executor` directly instead.
- **When git safety requirements cannot be met.** Autopilot runs agent writes freely. If your repository has pre-commit hooks, branch restrictions, or gpg-sign requirements that cannot be satisfied by spawned agents, do not use autopilot.
- **When the task is exploratory or research-only.** Autopilot optimizes for code delivery. Research tasks, audits, or analysis without code output are better handled by `explorer` or `analyst`.

---

## <Tool_Usage>

Autopilot orchestrates multiple OMA agents across its phases:

| Phase | Agent | Role |
|-------|-------|------|
| Explore | `explorer` | Maps relevant codebase structure (haiku4.5, read-only) |
| Plan | `planner` | Creates 3-6 step plan with acceptance criteria (opus, read-only) |
| Implement | `executor` | Writes all code, one step per instance (sonnet4.6, write) |
| Verify | `architect` | Validates each step against acceptance criteria (opus, read-only) |
| QA | `qa` | Runs tests, reports failures, triggers fix loops (sonnet4.6, read-only) |

**Delegation rules during autopilot:**
- Only `executor` instances write files — never delegate write authority to other agents
- If a spawned `executor` hits an unknown dependency, pause that step and escalate to `architect` before continuing
- If `qa` reports a build failure, do not spawn new implement steps until the failure is diagnosed

---

## <Examples>

### Good: Multi-step feature with clear boundaries
**Scenario:** "Add OAuth2 login to the API, including token refresh and revocation."
**Outcome:** `planner` produces 5 steps (OAuth setup, token endpoint, refresh handler, revocation endpoint, integration tests). `executor` instances implement each in parallel. `architect` verifies all 5 against acceptance criteria. PASS rendered.

### Good: Cross-system refactor with test coverage
**Scenario:** "Migrate the data layer from Sequelize to Prisma across all services."
**Outcome:** Plan breaks the migration into schema, model files, query changes, and test updates. Parallel executors handle each. QA catches a breaking change in one service and flags it; executor fixes it, re-verifies. Final PASS.

### Bad: Vague goal without scope
**Scenario:** "Make the app better."
**Outcome:** `planner` produces a plan with ambiguous steps. Implementers make arbitrary changes. `architect` cannot evaluate against criteria. Autopilot loops in QA indefinitely or renders PARTIAL with no useful output. Do not use autopilot for open-ended directives.

### Bad: Already in the middle of active work
**Scenario:** `executor` is mid-implementation and you invoke autopilot on the same directory.
**Outcome:** Race condition between executor state and autopilot state. State file collisions cause one agent to clobber the other's progress. Cancel the active mode first with `/oma:cancel` before starting autopilot.

---

## <Escalation_And_Stop_Conditions>

### When to Continue
- All parallel `executor` steps are in progress or completing
- `qa` reports test failures that map to specific fixable issues
- `architect` returned PARTIAL — iterate on remaining criteria

### When to Stop and Escalate
- **3 consecutive QA fix attempts fail on the same issue** — escalate to `architect` to reassess the plan
- **`planner` produces more than 10 steps** — the goal is likely too large; cancel and refine the goal
- **`explorer` finds no relevant files** — the goal may be mis-targeted; clarify the scope before proceeding
- **Any spawned agent reports an unknown dependency** — pause that step, escalate to `architect`

### When to Cancel Entirely
- User revokes approval during Phase 3 (Confirm)
- The goal changes mid-run to something incompatible with the current plan
- `architect` renders FAIL after exhausting fix iterations (5 QA cycles x 3 fix attempts)

---

## <Final_Checklist>

- [ ] `architect` rendered **PASS** on the final verdict
- [ ] All plan steps marked verified in `.oma/task.log.json`
- [ ] No pending spawned agents — verify with `oma_state_read` (mode should be `none` or `complete`)
- [ ] Build and test output available and passing (checked by `qa`)
- [ ] State file `.oma/state.json` shows `active: false` after cancel
- [ ] If task was partially completed, summary written to `.oma/notepad.json` for resume
- [ ] No leftover debug code (`console.log`, `TODO`, `HACK`, `debugger`) in modified files — grep check run
