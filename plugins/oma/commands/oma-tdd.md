---
name: oma-tdd
description: Test-Driven Development with red-green-refactor and vertical slices
triggers:
  - /oma:tdd
---

# /oma:tdd

Test-Driven Development workflow for OMA.

## Trigger

```
/oma:tdd
```

## What It Does

The TDD skill implements the red-green-refactor loop with vertical slices (tracer bullets):

1. **RED**: Write ONE failing test that describes the behavior you want
2. **GREEN**: Write MINIMAL code to make the test pass (no more)
3. **REFACTOR**: Clean up code while keeping tests green

## Vertical Slices (Tracer Bullets)

Do NOT write all tests first then all code (horizontal). Instead, trace a **vertical slice** from user input to data storage — one test → minimal code → next test.

Each slice delivers a working end-to-end path.

## Deep Modules

Prefer **deep modules** — small interfaces hiding large implementations. Deep modules are easier to test and reason about.

## When to Use

- Building new features test-first
- Adding tests to existing code
- Before refactoring (to lock in behavior)
- Reproducing bugs (write test first)

## See Also

- [/oma:ultraqa](/oma:ultraqa) — QA cycling with TDD integration
- [/oma:ralph](/oma:ralph) — persistence loop with optional TDD mode
- [skills/tdd/SKILL.md](../skills/tdd/SKILL.md) — full TDD skill documentation
