---
name: adr-template
description: Architecture Decision Record template for OMA projects
origin: oma-template
---

# ADR {NNN}: {Title}

**Date:** {YYYY-MM-DD}
**Status:** {Proposed | Accepted | Deprecated | Superseded}
**Deciders:** {team or individuals}

## Context

{Description of the situation, problem, or decision being addressed. What forced this decision? What alternatives existed?}

## Decision

{Concrete decision being made. Use active voice: "We will...", "OMA will use...", "The architecture requires..."}

### Format Rules (for agent-related ADRs)

If this ADR governs agent behavior, agent files must use the XML-tagged format with these mandatory tags:

| Tag | Required? | Purpose |
|-----|-----------|---------|
| `<Role>` | Yes | One-line role description |
| `<Why_This_Matters>` | Yes | Why this agent's work matters |
| `<Success_Criteria>` | Yes | What good output looks like |
| `<Constraints>` | Yes | Tool/behavior restrictions |
| `<Investigation_Protocol>` | Agent-specific | Multi-step process |
| `<Tool_Usage>` | Agent-specific | Tool access pattern |
| `<Execution_Policy>` | Agent-specific | Execution constraints |
| `<Output_Format>` | Yes | Expected output structure |
| `<Failure_Modes_To_Avoid>` | Yes | Common mistakes |
| `<Examples>` | Yes | `<Good>` and `<Bad>` sub-tags |
| `<Final_Checklist>` | Yes | Pre-completion checklist |
| `<Consensus_RALPLAN_DR_Protocol>` | RALPLAN agents | Deliberation protocol |
| `<Open_Questions>` | Analyst/Planner | Open questions before proceeding |

## Consequences

### Positive
- {consequence 1}

### Negative
- {consequence 2}

### Neutral
- {consequence 3}

## Alternatives Considered

### Option A: {Name}
{Description}. {Why rejected}.

### Option B: {Name}
{Description}. {Why rejected}.

## Links

- {Related ADR NNN}
- {Related document or decision}
