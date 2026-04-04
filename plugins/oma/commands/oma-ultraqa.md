---
name: oma-ultraqa
description: QA cycling — test, verify, fix, repeat until quality passes
argument-hint: "<target>"
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

## /oma:ultraqa

**Purpose:** Cycle through test → verify → fix → repeat until quality standards are met.

**Usage:** `/oma:ultraqa <target>`

**Examples:**
- `/oma:ultraqa run full test suite for auth module`
- `/oma:ultraqa verify payment integration end-to-end`

---

## How It Works

### QA Cycle

```
WHILE quality NOT passing:
  1. Run tests against target
  2. Analyze failures (if any)
  3. Identify root cause
  4. Fix issues
  5. Re-run tests
  6. IF still failing → increment cycle, retry
```

### Quality Gates

| Gate | Criteria |
|------|----------|
| Tests | All tests pass |
| Lint | Zero warnings |
| Type check | Zero errors |
| Coverage | Above threshold (configurable) |

### Cycle Management

- **Max cycles:** 10 (prevents infinite loops)
- **Progress tracking:** Each cycle logged
- **Adaptive fixes:** Learn from previous cycle failures

### State Management

- Mode: `ultraqa`
- Cycle count in `.oma/state.json`
- Cancel with `/oma:cancel`

### Constraints

- Must have test framework present
- Fixes are conservative — no major refactors
- Unfixable issues escalate to user
