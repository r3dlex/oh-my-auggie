---
name: oma-learner
description: Extract learned skill from conversation — create reusable skill from demonstrated expertise
argument-hint: "<skill-name>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

## /oma:learner

**Purpose:** Extract patterns and techniques demonstrated in conversation to create a reusable skill.

**Usage:** `/oma:learner <skill-name>`

**Examples:**
- `/oma:learner fix-memory-leaks`
- `/oma:learner write-api-tests`
- `/oma:learner optimize-postgres-queries`

---

## How It Works

### Skill Extraction

**Phase 1: Pattern Detection**
- Analyze recent conversation
- Identify recurring techniques
- Extract successful approaches

**Phase 2: Generalization**
- Abstract specific context
- Create parameterized template
- Define trigger conditions

**Phase 3: Documentation**
- Write skill description
- Document usage patterns
- Add examples

**Phase 4: Validation**
- Test skill in new context
- Verify parameters work
- Confirm reusability

### Skill Structure

Creates `skills/<skill-name>.md`:
```yaml
---
name: <skill-name>
description: <what it does>
trigger: "<keyword>"  # optional
model: sonnet4.6
---

## <Skill Name>

### When to Use
...

### How It Works
...

### Example
\`\`\`
/oma:learner <skill-name>

Input: <example>
Output: <expected>
\`\`\`

### Parameters
- param1: description
- param2: description
```

### Extraction Sources

Learner analyzes:
- Tool invocations and patterns
- File modifications
- Test implementations
- Problem-solving approaches
- Error recovery techniques

---

## Commands

| Command | Description |
|---------|-------------|
| `/oma:learner <name>` | Extract skill from conversation |
| `/oma:learner list` | List learned skills |
| `/oma:learner preview <name>` | Preview extraction before saving |
| `/oma:learner delete <name>` | Remove learned skill |

---

## Constraints

- Requires significant conversation context
- Skills saved to `.skills/` directory
- Learned skills are user-created (unsupported)
- May need manual refinement
