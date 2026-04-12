---
name: deslop
description: Regression-safe anti-slop cleanup — identify and fix low-quality AI artifacts, verbose patterns, and over-engineered code
argument-hint: "<target>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

[EXECUTING /oma:deslop — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:deslop

**Purpose:** Clean up low-quality AI artifacts, verbose patterns, over-engineered solutions, and anti-patterns while preserving functionality.

**Usage:** `/oma:deslop <target>`

**Examples:**
- `/oma:deslop fix over-engineered code in src/utils/`
- `/oma:deslop verbose logging patterns across the codebase`

---

## How It Works

### Anti-Slop Detection Patterns

**Verbose/Redundant Patterns:**
- Commented-out code blocks
- Overly verbose variable names (e.g., `the_final_result_string`)
- Excessive abstraction layers for simple operations
- Unnecessary type annotations where inference suffices

**AI Artifacts:**
- Try-this patterns without context
- Uncalled helper functions
- TODO comments left by previous AI turns
- Stale skeleton code

**Over-Engineering:**
- Factory factories
- Singleton patterns where plain modules suffice
- Overly generic types (e.g., `Map<String, Object>`)
- Premature abstractions

### Process

1. **Protect current behavior** — run regression tests or establish baseline
2. **Scan** target for known anti-patterns
3. **Flag** each issue with severity (HIGH/MEDIUM/LOW)
4. **Write cleanup plan** — list concrete smells, order from safest deletion to riskier consolidation
5. **Fix** HIGH and MEDIUM issues automatically
6. **Run quality gates** — regression tests must stay green
7. **Report** findings with before/after diffs
8. **Preserve** all functional behavior — regression-safe

### Constraints

- **Never break tests** — run test suite after changes
- **Never remove business logic** — only cleanup artifacts
- **Ask before touching** complex refactors (MEDIUM → ask user)
- **Document all changes** in the output summary
