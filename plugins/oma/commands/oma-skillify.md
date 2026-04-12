---
name: skillify
description: Create a new OMA skill from a repeated task pattern
triggers:
  - /oma:skillify
  - /skillify
---

[EXECUTING /oma:skillify — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

# /oma:skillify

Create a new OMA skill from a repeated task pattern.

This is an **alias** for `/oma:learner`. The [learner skill](/oma:learner) implements the skillify mechanic — extracting repeatable workflows into reusable skill documents.

## Usage

```
/oma:skillify
```

## How It Works

The skillify workflow is implemented by the learner skill:

1. **Identify** a task pattern you repeat 3+ times
2. **Extract** the inputs, steps, and acceptance criteria
3. **Decide** where to place the skill (built-in, user, or project)
4. **Draft** the SKILL.md with YAML frontmatter
5. **Review** fuzzy items with a human

See `/oma:learner` for the full workflow documentation.

## See Also

- [/oma:learner](/oma:learner) — the underlying skillify implementation
- [/oma:skill](/oma:skill) — manage and list existing skills
