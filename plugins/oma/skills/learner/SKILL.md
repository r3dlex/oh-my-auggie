---
name: learner
description: Extract learned skills from conversations. Use for "learn this", "extract skill", and "capture knowledge".
trigger: /oma:learner
---

## Skill: learner

Extract reusable skills and patterns from work sessions.

## When to Use

- After successful problem-solving
- When discovering useful patterns
- Before ending sessions with learnings
- To capture tribal knowledge
- When doing something novel well

## Learning Capture Process

### 1. Identify Learnings
- What worked well?
- What did we discover?
- What would we do differently?
- What patterns emerged?

### 2. Extract Pattern
- Generalize from specific
- Create reusable form
- Document context
- Add examples

### 3. Create Skill Entry
- Name the skill
- Define trigger
- Write content
- Add constraints

### 4. Integrate
- Place in skill catalog
- Update AGENTS.md
- Test with examples
- Share if valuable

## What to Learn

### Techniques
- Useful algorithms
- Efficient approaches
- Clever solutions
- Tool combinations

### Patterns
- Common structures
- Repeated solutions
- Best practices
- Anti-patterns to avoid

### Context
- When to use X vs Y
- Trade-offs made
- Constraints that matter
- Environmental factors

### Mistakes
- What went wrong
- Why it went wrong
- How to avoid
- Recovery approach

## Skill Template

```markdown
---
name: {skill-name}
description: {one-line description}
trigger: /oma:{skill-name}
---

## Skill: {skill-name}

{descriptive content}

## When to Use
{context}

## Examples
```
{examples}
```

## Constraints
{limitations}
```

## Output Format

```
## Learner: Extracted Skill

### Source Session
**Topic:** {what was learned}
**Date:** {when}
**Outcome:** {result}

### What We Learned
{key insight 1}
{key insight 2}
{key insight 3}

### Pattern Extracted
**Name:** {skill-name}
**Trigger:** /oma:{name}
**When to use:** {context}

### Skill Content
```markdown
{generated skill content}
```

### Integration
- [ ] Skill created
- [ ] Tested with examples
- [ ] Added to catalog
- [ ] Documented in project

### Next Steps
{how to apply}
```

## Constraints

- Extract from real work
- Generalize appropriately
- Don't overfit to specifics
- Test extracted patterns
- Keep skills focused
