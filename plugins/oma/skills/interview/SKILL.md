---
name: interview
description: Socratic interview and ambiguity scoring. Use for "interview", "question", "socratic", and "ambiguity".
trigger: /oma:interview
---

## Skill: interview

Conduct Socratic interviews to expose ambiguity and deepen understanding.

## When to Use

- Unclear requirements
- Complex problems
- Before major decisions
- Identifying blind spots
- Challenge assumptions

## Interview Process

### 1. Establish Context
- What is the problem?
- What do we think we know?
- What's the goal?

### 2. Probe Assumptions
- What are we assuming?
- Why are we assuming this?
- What if we're wrong?

### 3. Explore Evidence
- What evidence do we have?
- How strong is it?
- What's missing?

### 4. Test Alternatives
- What else could be true?
- What other explanations exist?
- What would disprove this?

### 5. Assess Uncertainty
- What don't we know?
- How confident are we?
- What would change our view?

## Question Types

### Clarifying
- "What do you mean by X?"
- "Can you give an example?"
- "How is this different from Y?"

### Assumption Probing
- "What are you assuming here?"
- "Why assume X rather than Y?"
- "What if that assumption is wrong?"

### Evidence Evaluation
- "What evidence supports this?"
- "How would we know if this is wrong?"
- "What's the strongest evidence?"

### Alternative Exploration
- "What other approaches exist?"
- "What would happen if we did X instead?"
- "What's the best alternative and why?"

### Implications Testing
- "If this is true, what else must be true?"
- "What would follow from this?"
- "What are the consequences?"

## Ambiguity Scoring

Rate ambiguity on scale:

| Score | Level | Description |
|-------|-------|-------------|
| 1 | Clear | No ambiguity, single interpretation |
| 2 | Minor | Slight ambiguity, mostly clear |
| 3 | Moderate | Notable ambiguity, needs clarification |
| 4 | Significant | Major ambiguity, multiple interpretations |
| 5 | Severe | Fundamental ambiguity, needs resolution |

### Ambiguity Categories

**Terminology**
- Undefined terms
- Multiple meanings
- Jargon without explanation

**Scope**
- Boundary unclear
- Inclusion/exclusion fuzzy
- Overlap undefined

**Process**
- Steps missing
- Order ambiguous
- Responsibilities unclear

**Outcome**
- Success undefined
- Metrics absent
- Trade-offs unstated

## Output Format

```
## Interview: {topic}

### Opening Context
{what we discussed}

### Key Exchanges

#### Exchange 1: {subject}
**Q:** {question}
**A:** {answer}
**Ambiguity:** {score} - {notes}

#### Exchange 2: {subject}
...

### Assumptions Exposed
- **{assumption}** — {questioning}
- **{assumption}** — {questioning}

### Evidence Gaps
- **{gap}** — {what's missing}
- **{gap}** — {what's missing}

### Alternative Views
- **{alternative}** — {description}
- **{alternative}** — {description}

### Ambiguity Summary
| Category | Score | Key Issues |
|----------|-------|------------|
| Terminology | {n} | {issues} |
| Scope | {n} | {issues} |
| Process | {n} | {issues} |
| Outcome | {n} | {issues} |
| **Overall** | **{n}** | **{summary}** |

### Remaining Questions
1. {question}
2. {question}

### Next Steps
{how to resolve remaining ambiguity}
```

## Constraints

- Ask genuine questions
- Follow the thread
- Don't lead the witness
- Document all ambiguity
- Don't resolve prematurely
