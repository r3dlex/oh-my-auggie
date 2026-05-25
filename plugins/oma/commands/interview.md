---
name: interview
description: Socratic requirements gathering — ask probing questions to extract complete requirements
argument-hint: "<topic>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
model: opus
---

[EXECUTING /oma:interview — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:interview

**Purpose:** Conduct Socratic dialogue to extract complete, consistent requirements through probing questions.

**Usage:** `/oma:interview <topic>`

**Examples:**
- `/oma:interview design a user notification system`
- `/oma:interview requirements for the billing module`

---

## How It Works

### Socratic Method

**Phase 1: Clarification**
- Ask clarifying questions
- Surface assumptions
- Define key terms

**Phase 2: Probe Assumptions**
- Challenge implicit beliefs
- Explore alternative viewpoints
- Identify gaps in understanding

**Phase 3: Probe Reasons**
- Ask "why" and "how"
- Trace requirements to root needs
- Validate justification

**Phase 4: Explore Perspectives**
- Ask "what if" questions
- Consider edge cases
- Test boundary conditions

**Phase 5: Document**

Produces `requirements.md`:
```markdown
## Requirements: <topic>

### Goals
...

### Scope
- In scope: ...
- Out of scope: ...

### Functional Requirements
1. FR-1: ...

### Non-Functional Requirements
1. NFR-1: ...

### Assumptions
...

### Open Questions
...
```

### Question Strategy

| Stage | Question Types |
|-------|----------------|
| Clarification | "What do you mean by X?" |
| Assumptions | "Is it always the case that Y?" |
| Reasons | "Why is Z important?" |
| Perspectives | "How would X handle Y?" |
| Implications | "What happens if Z fails?" |

### Constraints

- Minimum 5 rounds of questioning
- Questions are focused, not rambling
- Follows threads until resolution
- Ends when requirements are complete
