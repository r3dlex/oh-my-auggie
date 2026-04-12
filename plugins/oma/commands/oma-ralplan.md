---
name: ralplan
description: Consensus planning — Planner/Architect/Critic multi-agent loop until consensus is reached
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

[EXECUTING /oma:ralplan — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:ralplan

**Purpose:** Reach consensus on a plan through Planner/Architect/Critic loop until all perspectives agree.

**Usage:** `/oma:ralplan <task>`

**Examples:**
- `/oma:ralplan design the new authentication system`
- `/oma:ralplan plan the microservices migration`

---

## How It Works

### Consensus Loop

```
WHILE consensus NOT reached:
  1. oma-planner: Draft plan with approach + timeline
  2. oma-architect: Review for technical soundness
  3. oma-critic: Identify risks, edge cases, alternatives
  4. IF all agree → consensus reached
     ELSE → collect objections, loop
```

### Agents

| Agent | Model | Role |
|-------|-------|------|
| `oma-planner` | opus | Drafts approach and sequencing |
| `oma-architect` | opus | Reviews technical feasibility |
| `oma-critic` | opus | Identifies risks and alternatives |

### Consensus Criteria

- All three agents return APPROVED
- No unresolved objections
- Risk level is ACCEPTABLE or below

### Output

- **Consensus plan:** Agreed approach with rationale
- **Risk summary:** Known risks and mitigations
- **Disagreements:** Any unresolved concerns (logged for context)
- **Timeline:** Estimated effort per step

### Constraints

- Max 5 loop iterations before partial consensus
- Controversial decisions are escalated to user
- Stop with `/oma:cancel`
