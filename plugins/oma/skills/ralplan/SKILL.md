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
