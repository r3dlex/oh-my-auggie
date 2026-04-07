---
name: oma-improve-codebase-architecture
description: Deep exploration and architectural improvement via organic friction detection
triggers:
  - /oma:improve-architecture
  - /oma:architect-deep
---

# /oma:improve-codebase-architecture

Improve codebase architecture through organic friction detection.

## Triggers

```
/oma:improve-architecture
/oma:architect-deep
```

## What It Does

1. **Explore organically** — friction IS the signal. When code is hard to change, that's the signal.
2. **Detect shallow modules** — where interface is as complex as implementation.
3. **Design deeply** — small interfaces hiding large implementations.
4. **Parallel interface design** — spawn multiple sub-agents with different constraints.
5. **Output RFC** — GitHub issue RFC with problem, proposal, alternatives, consequences.

## Core Philosophy

- **Friction-first**: Don't use rigid heuristics — follow where the code fights back
- **Deep modules**: Small, focused interfaces; large, rich implementations behind them
- **Parallel design**: 3+ sub-agents design interfaces simultaneously, pick best aspects

## Four Dependency Categories

1. **In-process**: Direct function calls
2. **Local-substitutable**: Swappable implementations via interfaces
3. **Remote-but-owned**: Ports & adapters pattern
4. **True external**: Must mock (APIs, databases)

## See Also

- [skills/improve-codebase-architecture/SKILL.md](../skills/improve-codebase-architecture/SKILL.md) — full skill documentation
- [skills/improve-codebase-architecture/REFERENCE.md](../skills/improve-codebase-architecture/REFERENCE.md) — quick reference
- [/oma:ralplan](/oma:ralplan) — planning mode that can incorporate architecture deepening
