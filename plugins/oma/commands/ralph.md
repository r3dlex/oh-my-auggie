---
name: ralph
description: Persistence loop — keeps working until task is complete and verified by architect
argument-hint: "<task>"
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

[EXECUTING /oma:ralph — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:ralph

**Purpose:** Keep working until the task is architect-verified complete.

**Usage:** `/oma:ralph <task>`

**Examples:**
- `/oma:ralph fix all null pointer exceptions in src/auth/`
- `/oma:ralph implement the complete user registration flow`

---

## How It Works

### Ralph Loop

1. **Set mode to "ralph"** via `oma_mode_set`
2. **Set iteration to 1** via `oma_state_write`
3. **Loop** until architect returns PASS:

```
WHILE architect_verdict != PASS:
  a. Spawn executor with task + iteration context
  b. Spawn architect to verify implementation
  c. IF architect verdict == PASS:
       → Exit loop, render final verdict
     ELSE IF architect verdict == FAIL:
       → Increment iteration via oma_state_write
       → Continue to next iteration
     ELSE (PARTIAL):
       → Log partial completion
       → Increment iteration
       → Continue to next iteration
```

### Completion Gates

- **Hard gate:** architect verdict MUST be PASS
- **Max iterations:** 100 (configurable, set via `oma_state_write`)
- **On max iterations:** PARTIAL verdict with summary of what was accomplished

### State Management

- Mode: `ralph`
- Current iteration stored in `.oma/state.json`
- Architect verdict history in `.oma/task.log.json`

## Ralph Cannot Be Bypassed

The **stop-gate.sh** hook blocks agent completion when:
- Mode is `ralph`
- architect has not returned PASS

This means you **cannot** interrupt ralph mid-loop without architect verification.

## Cancel

Run `/oma:cancel` to stop the persistence loop and clear state.

## Constraints

- Only executor writes files
- Stop gate prevents premature exit
- Iteration counter prevents infinite loops
- Architect verdict is the only completion criterion

---

## <Do_Not_Use_When>

- **When the task is complete in a single pass.** If `architect` can fully verify the implementation on the first attempt, ralph adds no value — it is designed for iterative refinement, not one-shot tasks.
- **When you need human approval between iterations.** Ralph loops without pausing for user input. If you want to review each iteration before the next starts, use `/oma:autopilot` instead, which includes a confirm phase.
- **When the task outcome is not objectively verifiable.** Ralph requires `architect` to render PASS/FAIL. Tasks without clear acceptance criteria (e.g., "improve performance", "make it cleaner") will cause ralph to loop indefinitely or exhaust iterations without a verdict.
- **When the codebase is not already explored.** If the relevant files are unmapped, `executor` will waste iterations exploring instead of implementing. Run `explorer` first or use `/oma:autopilot` which includes exploration.
- **When you need to interrupt mid-loop for any reason.** The stop-gate prevents interruption without architect PASS. If you may need to cancel mid-execution, do not use ralph — use `executor` directly with manual oversight.

---

## <Examples>

### Good: Stub-to-verified implementation
**Scenario:** "Implement the complete user registration flow."
**Outcome:** First `executor` iteration produces the skeleton. `architect` returns PARTIAL with missing email verification and password strength validation. Second iteration adds both. Architect returns PASS. Ralph exits.

### Good: Bug fix with verification gate
**Scenario:** "Fix all null pointer exceptions in src/auth/."
**Outcome:** `executor` patches three NPEs. `architect` runs static analysis and finds two more in related files. Second iteration fixes those. Architect returns PASS. Ralph exits.

### Bad: Subjective code quality request
**Scenario:** "Make the code cleaner."
**Outcome:** `architect` cannot render PASS on subjectivity. Loop cycles on PARTIAL verdicts ("improve naming", "reduce complexity") indefinitely until max iterations (100) is hit. Task renders PARTIAL with a vague summary. Define concrete acceptance criteria before using ralph.

### Bad: Task that requires a plan
**Scenario:** "Refactor the entire payments module."
**Outcome:** Without a plan, `executor` makes ad-hoc changes. `architect` struggles to verify coherence across changes. Ralph loops many times with shifting direction. Create a plan first with `planner` or use `/oma:autopilot`.

---

## <Escalation_And_Stop_Conditions>

### When to Continue
- `architect` returns PARTIAL — iterate to address remaining criteria
- `architect` returns FAIL with specific, fixable items — iterate to address them

### When to Stop (Architect PASS)
- `architect` returns PASS — Ralph exits cleanly with the final verdict

### When to Stop (Max Iterations Reached)
- Iteration counter hits 100 (configurable via `oma_state_write`) — Ralph exits with PARTIAL verdict and logs what was accomplished to `.oma/task.log.json`. Notify the user with a summary of remaining open items.

### When to Escalate
- `architect` returns FAIL with non-specific or non-fixable feedback — escalate to `architect` directly to get concrete remediation steps before the next iteration
- Three consecutive FAIL verdicts with no progress — stop ralph, cancel state, and re-plan the task with `planner`
- `executor` hits an architectural unknown — pause iteration, consult `architect` for a one-time ruling

---

## <Final_Checklist>

- [ ] `architect` rendered **PASS** (or PARTIAL with max iterations logged)
- [ ] Iteration count and architect verdict history recorded in `.oma/task.log.json`
- [ ] `.oma/state.json` shows `active: false` and `mode: none` after completion or cancel
- [ ] All file writes performed by `executor` only — no other agent wrote files
- [ ] If PARTIAL: summary of completed vs. incomplete items written to `.oma/notepad.json`
- [ ] No leftover debug code in modified files — grep check run on implementation files
