---
name: oma-deep-interview
description: Socratic deep interview with mathematical ambiguity gating — thorough requirements gathering before execution
argument-hint: "[--quick|--standard|--deep] [--autoresearch] <idea or vague description>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
model: opus
---

## /oma:deep-interview

**Purpose:** Ouroboros-inspired Socratic questioning with mathematical ambiguity scoring. Replaces vague ideas with crystal-clear specifications by iteratively exposing assumptions and gating on ambiguity ≤ 20%.

**Usage:** `/oma:deep-interview <vague idea>`

**Examples:**
- `/oma:deep-interview improve the auth system`
- `/oma:deep-interview --autoresearch make the CI faster`
- `/oma:deep-interview build a notification system`

**Pipeline:** deep-interview → ralplan (consensus) → ralph/team (execution)

---

## How It Works

### Ambiguity Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|----------------|
| Goal Clarity | 35-40% | Is the primary objective unambiguous? |
| Constraint Clarity | 25-30% | Are boundaries and limitations explicit? |
| Success Criteria | 25-30% | Can acceptance criteria be written as tests? |
| Context Clarity | 15% | (brownfield) Does the change fit the existing system? |

### Scoring

`ambiguity = 1 - weighted_sum_of_dimensions`

- **≤ 20% ambiguity**: Ready for execution
- **21-50%**: Continue questioning
- **> 50%**: Core concepts still unstable

### Challenge Agents

At round 4+: **Contrarian Mode** — "What if the opposite were true?"
At round 6+: **Simplifier Mode** — "What's the simplest version?"
At round 8+: **Ontologist Mode** — "What IS the core thing here?"

### Output

- Spec written to `.oma/specs/deep-interview-{slug}.md`
- Includes: clarity breakdown, goal, constraints, acceptance criteria, ontology, transcript
- ADR-style decision record with drivers, alternatives, consequences

---

## Related

- `/oma:interview` — lighter-weight Socratic questioning (no ambiguity scoring)
- `/oma:ralplan` — consensus planning after clarity is achieved
- `/oma:autopilot` — full pipeline: interview → plan → execute
