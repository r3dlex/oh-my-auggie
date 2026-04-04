---
name: oma-trace
description: Evidence-driven causal tracing — trace decision paths to understand outcomes
argument-hint: "<event-id>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Write
model: sonnet4.6
---

## /oma:trace

**Purpose:** Perform evidence-driven causal tracing to understand how decisions led to outcomes.

**Usage:**
- `/oma:trace <event-id>` — Trace a specific event
- `/oma:trace last` — Trace the last session event
- `/oma:trace session` — Full session trace

**Examples:**
- `/oma:trace last`
- `/oma:trace event-abc-123`
- `/oma:trace session`

---

## How It Works

### Trace Methodology

**Phase 1: Event Identification**
- Find the target event in logs
- Extract timestamp and context

**Phase 2: Causal Chain**
- Work backwards from outcome
- Identify contributing decisions
- Map decision inputs

**Phase 3: Evidence Collection**
- Gather logs for each decision point
- Extract relevant context
- Build causal graph

**Phase 4: Analysis**
- Identify key branching points
- Quantify influence of each factor
- Produce causal narrative

### Output Structure

```
TRACE REPORT: <event-id>
============================

TIMELINE
--------
T+0:00  Decision: Choose approach X
T+0:15  Input: User feedback received
T+0:23  Decision: Pivot to approach Y
...

CAUSAL GRAPH
------------
Outcome
  └─ Decision 3 (weight: 0.4)
      └─ Decision 2 (weight: 0.3)
          └─ Decision 1 (weight: 0.3)

KEY FACTORS
-----------
1. User feedback timing (causal weight: 0.35)
2. Resource availability (causal weight: 0.25)
3. Prior assumption (causal weight: 0.20)

CONCLUSION
----------
The outcome was primarily caused by...
```

### Log Sources

Traces use:
- `.oma/task.log.json` — Agent decisions
- `.oma/state.json` — State transitions
- Session logs — Tool invocations

### Constraints

- Requires logging enabled
- Historical traces need log retention
- Complex traces may be ambiguous
