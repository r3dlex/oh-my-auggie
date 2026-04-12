---
name: plan
description: Strategic planning with analyst/architect review — structured approach for complex tasks
argument-hint: "<task>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
  - Task
model: opus
---

[EXECUTING /oma:plan — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:plan

**Purpose:** Create a structured strategic plan with analyst and architect perspectives.

**Usage:** `/oma:plan <task>`

**Examples:**
- `/oma:plan implement the data pipeline`
- `/oma:plan redesign the frontend architecture`

---

## How It Works

### Planning Process

**Phase 1: Analyst Review**
- Explore current state of relevant systems
- Identify constraints and dependencies
- Research best practices and alternatives

**Phase 2: Architect Review**
- Evaluate technical feasibility
- Assess scalability and maintainability
- Design system boundaries and interfaces

**Phase 3: Plan Synthesis**
- Create 3-8 step plan with clear milestones
- Define acceptance criteria per step
- Estimate complexity and risk

### Plan Structure

```
## Strategic Plan: <task>

### Context
- Current state: ...
- Constraints: ...
- Dependencies: ...

### Approach
1. [Step name] — brief description
   - Acceptance criteria: ...
   - Risk: LOW/MEDIUM/HIGH

### Milestones
- [ ] Milestone 1: ...
- [ ] Milestone 2: ...

### Resources
- Files to modify: ...
- Files to create: ...
```

### Constraints

- Plans are advisory — you approve before implementation
- Complex plans may span multiple sessions
- Use `/oma:ralplan` for consensus-based planning
