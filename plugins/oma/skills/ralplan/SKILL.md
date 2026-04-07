---
name: ralplan
description: Consensus planning - agree before executing. Use for "ralplan", "consensus", "pre-execution review".
trigger: /oma:ralplan
---

## Skill: ralplan

Require consensus before execution. A gate to ensure alignment.

## When to Use

- Significant code changes
- Architectural decisions
- Before multi-step implementations
- Team-based projects
- Any non-trivial change

## RALPLAN Process

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Plan     │ ->  │  Present    | ->  |  Consensus  |
│  Drafting  |     |   Options   |     |   Reached   |
└────────────┘     └────────────┘     └────────────┘
                                              ↓
                   ┌────────────┐     ┌────────────┐
                   |  Proceed   | <-  |   Review    |
                   | Execution  |     |   Concerns  |
                   └────────────┘     └────────────┘
```

### Phase 1: Plan Drafting
- Create initial plan
- Identify options
- Assess risks
- Estimate effort

### Phase 2: Present Options
- Show current state
- Explain options
- Highlight trade-offs
- Request input

### Phase 3: Address Concerns
- Listen to objections
- Refine approach
- Modify as needed
- Document decisions

### Phase 4: Consensus Check
- All concerns addressed?
- Trade-offs acceptable?
- Proceed with agreement?

## Consensus Criteria

### Required
- [ ] Problem understanding shared
- [ ] Approach agreed upon
- [ ] Risks identified and accepted
- [ ] Effort reasonable
- [ ] Verification planned

### Strong Consensus
- [ ] No major objections
- [ ] All questions answered
- [ ] Dependencies clear
- [ ] Timeline acceptable

### Partial Consensus
- [ ] Core agreement reached
- [ ] Minor concerns noted
- [ ] Can proceed with caveats

## Output Format

```
## RALPLAN: {task}

### Problem Statement
{clear description of the problem}

### Proposed Solutions

#### Option A: {name}
- **What:** {description}
- **Pros:** {list}
- **Cons:** {list}
- **Risk:** {level}

#### Option B: {name}
...

### Decision

**Selected:** Option {letter}

### Consensus Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| Problem understanding | ✅ | {notes} |
| Approach agreement | ✅ | {notes} |
| Risk acceptance | ⚠️ | {notes} |
| Effort reasonableness | ✅ | {notes} |
| Verification planned | ✅ | {notes} |

### Concerns Raised
- **{person}:** {concern} → {resolution}

### Final Agreement
**Consensus:** YES / CONDITIONAL / NO

### Execution Gate
{gate status} - {reason}

### Implementation Plan
| Step | Task | Notes |
|------|------|-------|
| 1 | {task} | {notes} |
```

## Constraints

- Must have explicit agreement before proceeding
- Document any dissenting views
- Re-evaluate if situation changes
- Don't proceed without minimum consensus
- Time-box the consensus process

<Do_Not_Use_When>
- The user has a fully detailed task (file paths, function names, acceptance criteria) — proceed directly to oma-executor or oma-ralph
- The task is a quick, single-file fix where consensus overhead >> time saved
- The user says "just do it" or "skip planning" — respect their intent
- The task was already consensus-reviewed in a prior session (plan file exists in `.oma/plans/`) — use the existing plan
- Within deep-interview mode, which already ends with an explicit execution bridge and does not need a separate consensus gate
- Within ralph mode, which blocks on architect PASS — adding ralplan would double-gate unnecessarily
</Do_Not_Use_When>

<Tool_Usage>
- **oma-planner**: Use to draft the initial plan, identify options, and assess risks before the consensus review
- **oma-architect**: The primary reviewer in ralplan — architects provide the critical consensus check on architectural decisions
- **oma-executor**: After consensus is reached, dispatch to oma-executor for implementation
- **oma-qa**: If the plan includes a quality gate, schedule oma-qa after implementation
- **oma-analyst**: Use when the problem statement itself is unclear — get clarity on requirements before drafting options
</Tool_Usage>

<Why_This_Exists>
OMA runs inside Auggie and often handles complex, multi-step tasks where the first approach is not always the best. Without a consensus gate, an oma-executor can spend significant effort implementing a solution only to discover the user wanted something different — or an architect later flags an architectural problem. ralplan makes consensus explicit and structured before execution cycles are spent, reducing rework and increasing alignment between human intent and agent action.
</Why_This_Exists>

<Examples>

### Good Usage

**Multi-step implementation with trade-offs:**
```
User: "Refactor the auth system to support OAuth2"
OMA: [oma-planner drafts 3 options: middleware approach, decorator approach, service-layer approach]
OMA: [Presents options with pros/cons to user]
User: "I prefer the middleware approach — it keeps auth centralized"
OMA: [Consensus reached — gate opens]
OMA: [oma-executor implements middleware-based OAuth2 refactor]
```

**Architectural decision requiring review:**
```
User: "Add a new MCP server for the team skill"
OMA: [oma-planner drafts the proposal]
OMA: [Escalates to oma-architect for consensus review]
oma-architect: "The worktree manager needs a shared state layer before this is safe to implement"
OMA: [Concern documented, plan modified]
oma-architect: "Now agreed — proceed"
OMA: [Consensus reached]
```

### Bad Usage

**Over-gating a trivial change:**
```
User: "Add a console.log to debug the token issue"
OMA: [ralplan: "Should we add the log, or use a breakpoint?"]
User: "Seriously, just add the log"
```
→ Proceed directly. ralplan is not needed for one-line fixes.

**Double-gating with ralph:**
```
User: "/oma:ralph implement the feature"
OMA: [ralplan activates first, spends 3 rounds reaching consensus]
OMA: [Passes to ralph for execution]
oma-architect (ralph): [Runs its own PASS gate on the first iteration]
```
→ User should choose ralph OR ralplan, not both. Use ralph directly for autonomous loops with embedded verification.
</Examples>

<Escalation_And_Stop_Conditions>
- **Stop and report:** Minimum consensus not reached after the time-box — document the disagreement, surface it to the user, do not proceed
- **Stop and escalate:** A concern raised requires an oma-architect review that is not available — wait for architect availability or flag to user
- **Continue:** Concerns are addressable with plan modifications — modify and re-review
- **Conditional proceed:** Partial consensus reached with documented caveats — present to user for final approval before proceeding
- **Escalate to user:** Major objection cannot be resolved by the team — present the conflict to the user for a final call
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Problem statement is clear and agreed upon by all reviewers
- [ ] At least two options were presented (do not default to the first draft)
- [ ] Trade-offs for each option are explicitly documented
- [ ] All concerns raised during review are either resolved or documented as open
- [ ] Consensus criteria table is fully populated with status for each criterion
- [ ] Dissenting views are recorded verbatim (not summarized) in the Concerns Raised section
- [ ] Execution gate status is explicit (GATE OPEN / GATE CONDITIONAL / GATE CLOSED)
- [ ] If gate is CONDITIONAL, the caveats are surfaced to the user for final sign-off
- [ ] Output format matches the RALPLAN template with all required sections
</Final_Checklist>
