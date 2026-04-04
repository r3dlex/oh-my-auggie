---
name: ccg
description: Claude-Codex-Gemini tri-model orchestration. Use for "multi-model", "codex", "gemini", and "tri-model routing".
trigger: /oma:ccg
---

## Skill: ccg

Coordinate Claude, Codex, and Gemini models for optimal results.

## When to Use

- Complex tasks benefiting from multiple perspectives
- Code requiring different model strengths
- Research combining reasoning and generation
- When single-model approaches are insufficient

## Model Strengths

### Claude
- Complex reasoning and analysis
- Nuanced understanding
- Writing and editing
- Architecture and design

### Codex
- Code generation and completion
- API integration
- Boilerplate and patterns
- Technical precision

### Gemini
- Research and information synthesis
- Multi-modal processing
- Long-context analysis
- Creative exploration

## Routing Strategy

### `ccg:claude-first`
Use Claude for primary work, offload to Codex/Gemini as needed.
- Best for: Architecture, complex logic, writing

### `ccg:codex-first`
Use Codex for code generation, Claude for review.
- Best for: Large-scale code generation, migrations

### `ccg:gemini-first`
Use Gemini for research, Claude for synthesis.
- Best for: Exploring new domains, information synthesis

### `ccg:round-robin`
Rotate through models for different phases.
- Best for: Complex multi-phase tasks

## Execution Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Claude  │ ->  │ Codex   │ ->  │ Gemini  │
│ Phase 1 │     │ Phase 2 │     │ Phase 3 │
└─────────┘     └─────────┘     └─────────┘
      ↓              ↓              ↓
      └──────────────┴──────────────┘
                     ↓
              ┌─────────────┐
              │ Integration │
              └─────────────┘
```

## Output Format

```
## CCG: {task}

### Model Assignment
| Phase | Model | Task | Outcome |
|-------|-------|------|---------|
| 1 | Claude | {task} | {summary} |
| 2 | Codex | {task} | {summary} |
| 3 | Gemini | {task} | {summary} |

### Execution
- **Strategy:** {strategy}
- **Total duration:** {time}

### Synthesis
{how outputs were combined}

### Final Result
{summary}
```

## Constraints

- Match model to task strength
- Avoid unnecessary model switching
- Clear interface between phases
- Document model-specific limitations
- Budget token usage across models
