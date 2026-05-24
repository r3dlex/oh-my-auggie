# ADR-0001 — Record Architecture Decisions

**Status:** Accepted
**Date:** '"$(date +%Y-%m-%d)"'
**Deciders:** project maintainers

---

## Context

Architectural decisions accumulate silently in codebases. When a contributor asks
"why is this structured this way?", the answer lives in someone's memory or an
old pull request discussion. This project needs a lightweight, version-controlled
way to capture design decisions as they are made.

## Decision

> We will use Architecture Decision Records (ADRs) in MADR format, stored in
> `docs/adr/`, to document all significant architectural decisions.

## Consequences

### Positive
- Decisions are discoverable and linked from git history.
- New contributors can understand why the codebase is shaped as it is.
- ADRs provide a structured input for PR review drift verification.

### Negative
- Maintaining ADRs requires discipline — decisions made in Slack or calls
  must be backfilled.

## Compliance

Enforced by agent behavior at PR review time: drift verification checks ADRs
whose scope overlaps with changed files.
