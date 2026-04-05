---
name: ccg
description: Tri-model orchestration — synthesize opus + gemini + gpt-5.4 perspectives, finalize in sonnet
argument-hint: "<task>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
  - Task
model: opus
---

## /ccg

**Purpose:** Harness three frontier models for comprehensive analysis, synthesized into optimal sonnet output.

**Usage:** `/ccg <task>`

**Examples:**
- `/ccg analyze security vulnerabilities in this codebase`
- `/ccg review the API design for best practices`

---

## How It Works

### Tri-Model Synthesis

**Step 1: Parallel Analysis**
- Spawn 3 agents simultaneously with different model personas
- Opus agent: Deep technical analysis, architecture
- Gemini agent: Research-heavy, external knowledge
- GPT-5.4 agent: Creative alternatives, edge cases

**Step 2: Synthesize**
- Sonet agent collects all perspectives
- Identifies areas of consensus
- Resolves conflicts between model opinions
- Produces unified recommendation

**Step 3: Final Output**
- Structured recommendation with rationale
- Confidence level per finding
- Disagreement summary (if any)

### Model Configuration

| Model | Role | Strength |
|-------|------|----------|
| Opus | Primary analyzer | Deep reasoning |
| Gemini | Research layer | External knowledge |
| GPT-5.4 | Creative layer | Alternatives |
| Sonet | Synthesizer | Final output |

### Output Structure

```
## Tri-Model Analysis: <task>

### Consensus Findings
- [Finding 1] — All models agree

### Divergent Views
- [Topic] — Model A says X, Model B says Y
  Resolution: ...

### Recommendation
...

### Confidence
- High: ...
- Medium: ...
- Low: ...
```

### Constraints

- Requires API access to all three model families
- Costs scale with context windows used
- Final output is advisory
