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

## Skillify: 5-Step Extraction Workflow

When a repeatable task pattern emerges during a session, follow these steps to capture it as a reusable OMA skill.

### Step 1: Identify Repeatable Task
- Is this something done more than once?
- Does the context (codebase, config, environment) repeat?
- Would another agent benefit from this knowledge?

### Step 2: Extract Inputs, Steps, and Criteria
- List every input the task requires (file paths, IDs, flags, etc.)
- Document the ordered steps to complete it
- Note success criteria and failure modes

### Step 3: Decide Placement
Choose the right scope based on reusability:

| Scope | Path | When to Use |
|-------|------|-------------|
| **Built-in** | `plugins/oma/skills/` | Universal, high-value, plugin-wide |
| **User** | `~/.augment/plugins/marketplaces/oh-my-auggie/plugins/oma/skills-learned/` | Personal, machine-specific |
| **Project** | `.oma/skills/` | Team-shared, codebase-specific |

### Step 4: Draft SKILL.md with YAML Frontmatter
```markdown
---
name: {skill-name}
description: {one-line description}
trigger: /oma:{skill-name}
allowed-tools: [Read, Glob, Bash, Edit, Write]
model: sonnet4.6
---

## Skill: {skill-name}

{body content}
```

### Step 5: Flag Fuzzy Items for Human Review
Mark anything uncertain with a note:
```
<!-- TODO: Verify {item} with human before publishing -->
```
Items to flag: hard-coded values, version-dependent steps, untested edge cases.

---

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

## Quality Gate: 3 Questions

Before finalizing any extracted skill, answer all three questions. A skill should pass at least 2 of 3 to be worth capturing.

### 1. Non-Googleable?
Would a web search not readily find this solution?

- If **yes**: high value to capture (hard-won knowledge)
- If **no**: the web already has it; consider linking instead of capturing

### 2. Codebase-Specific?
Does it depend on project context, local paths, custom tooling, or undocumented behavior?

- If **yes**: strong candidate for project/project scope
- If **no**: candidate for built-in or user scope

### 3. Hard-Won?
Did it require debugging, iteration, or repeated failure to discover?

- If **yes**: high value to capture so others don't repeat the effort
- If **no**: the knowledge is likely obvious or already well-documented

---

## Skillify Output Format

When skillify is complete, report:

```
## Skillify Complete

**Skill Name:** {name}
**Target Location:** {path}
**Trigger:** /oma:{name}

### Draft Workflow
{steps extracted}

### Open Questions
- {fuzzy item 1}
- {fuzzy item 2}
```

---

## Constraints

- Extract from real work
- Generalize appropriately
- Don't overfit to specifics
- Test extracted patterns
- Keep skills focused
