---
name: plan
description: Strategic planning and task decomposition. Use for "plan this", "break down", and "roadmap".
trigger: /oma:plan
---

## Skill: plan

Create structured plans for complex tasks and projects.

## When to Use

- New projects or features
- Complex refactoring
- Multi-file changes
- When unsure of approach
- Before writing significant code

## Planning Process

### 1. Understand the Goal
- What is the desired end state?
- What problem does this solve?
- What are the constraints?

### 2. Analyze Current State
- What exists today?
- What needs to change?
- What are the dependencies?

### 3. Identify Paths Forward
- Option A: {description}
- Option B: {description}
- Option C: {description}

### 4. Evaluate Options
- Pros and cons of each
- Risk assessment
- Effort vs. value

### 5. Choose Direction
- Select best path
- Document rationale
- Define success criteria

### 6. Decompose into Steps
- Atomic, verifiable tasks
- Dependencies identified
- Estimated effort

## Output Format

```
## Plan: {task/goal}

### Understanding
**Problem:** {what problem this solves}
**Success criteria:** {how we know we're done}
**Constraints:** {limitations}

### Current State
{summary of existing code/state}

### Options Considered

#### Option A: {name}
- **Approach:** {description}
- **Pros:** {list}
- **Cons:** {list}
- **Risk:** {assessment}
- **Effort:** {t-shirt sizing}

#### Option B: {name}
...

### Decision
**Selected:** Option {letter}
**Rationale:** {why this option}

### Implementation Plan

| Step | Task | Dependencies | Effort |
|------|------|--------------|--------|
| 1 | {task} | none | {time} |
| 2 | {task} | step 1 | {time} |
| 3 | {task} | steps 1, 2 | {time} |

### Verification
- [ ] {criterion 1}
- [ ] {criterion 2}
- [ ] {criterion 3}

### Timeline
**Estimated total:** {time}
**Checkpoints:** {milestones}
```

## Planning Modes

### Quick Plan
- 5-10 minutes
- High-level only
- Good for small tasks

### Full Plan
- 20-30 minutes
- Detailed steps
- Risk analysis
- Good for complex work

### RALPLAN
- Consensus-based
- Pre-execution gate
- See `ralplan` skill

## Constraints

- Verify before planning
- Consider multiple approaches
- Keep plans realistic
- Include verification steps
- Update when reality changes
