---
name: skill
description: Skill management and creation. Use for "create skill", "manage skills", "skill info", and "skill help".
trigger: /oma:skill
---

## Skill: skill

Create, manage, and organize OMA skills.

## When to Use

- Creating new skills
- Editing existing skills
- Finding skills
- Understanding skill structure
- Skill maintenance

## OMA Skill Paths

OMA distinguishes three skill scopes with precedence (highest to lowest):

| Scope | Path | Read-Only |
|-------|------|-----------|
| **Project** | `.oma/skills/` | No |
| **User** | `~/.augment/plugins/marketplaces/oh-my-auggie/plugins/oma/skills-learned/` | No |
| **Built-in (plugin)** | `plugins/oma/skills/` | Yes |

Project-level skills take precedence over user-level; user-level takes precedence over built-in.

### Directory Structure

```
{skill-name}/
└── SKILL.md
```

### SKILL.md Format

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

## Commands

### List All Skills
```
/oma:skill list
```

### Get Skill Info
```
/oma:skill info {skill-name}
```

### Add Skill
```
/oma:skill add {skill-name}
```

### Edit Skill
```
/oma:skill edit {skill-name}
```

### Remove Skill
```
/oma:skill remove {skill-name}
```
**Note:** Use `remove`. `delete` is not a supported subcommand alias.

### Search Skills
```
/oma:skill search {query}
```

### Setup Skills
```
/oma:skill setup user
/oma:skill setup project
/oma:skill setup plugin
```
Initializes the skills directory for the given scope.

### Sync Skills
```
/oma:skill sync
/oma:skill sync {url}
```
Syncs all skills from configured remote sources, or installs a specific skill from a GitHub URL.

## Skill Creation Process

### 1. Identify Need
- What gap exists?
- What should this do?
- Who will use it?

### 2. Design Skill
- Name and trigger
- Description
- Body content
- Examples

### 3. Create Structure
```bash
mkdir -p plugins/oma/skills/{skill-name}
```

### 4. Write SKILL.md
- YAML frontmatter
- Clear description
- Usage examples
- Constraints

### 5. Test
```bash
/oma:skill info {skill-name}
/oma:{skill-name}
```

## Skill Quality Checklist

- [ ] Name is descriptive
- [ ] Trigger is memorable
- [ ] Description is clear
- [ ] Usage examples included
- [ ] Constraints documented
- [ ] Error cases handled
- [ ] Tested with real use

## Skill Naming

- Use lowercase
- No spaces (use hyphens)
- Descriptive but concise
- Unique across catalog

Good names:
- `code-review`
- `debug`
- `deploy`

Poor names:
- `the-code-reviewing-skill`
- `help-me-with-my-code`

## Output Format

```
## Skill: {name}

**Trigger:** /oma:{name}
**Description:** {description}
**Created:** {date}

### Usage
{how to use}

### Examples
```
/oma:{name} {example}
/oma:{name} {example}
```

### Files
- `plugins/oma/skills/{name}/SKILL.md`
```

## Skill Templates

Use the template that best matches the skill type.

### Template 1: Error Solution
Captures how to diagnose and fix a specific error or class of errors.
```markdown
---
name: {skill-name}
description: Diagnose and fix {error class}
trigger: /oma:{skill-name}
---

## Skill: {skill-name}

{full explanation of the error and solution}

## When to Use
{when this skill applies}

## Diagnosis Steps
1. {step}
2. {step}

## Fix
{how to resolve}

## Prevention
{how to avoid this error in the future}
```

### Template 2: Workflow
Captures a multi-step process for accomplishing a goal.
```markdown
---
name: {skill-name}
description: {one-liner}
trigger: /oma:{skill-name}
---

## Skill: {skill-name}

{high-level description}

## When to Use
{context when to invoke this}

## Steps
1. {step}
2. {step}

## Examples
```
/oma:{skill-name} {example}
```

## Constraints
{limits and edge cases}
```

### Template 3: Code Pattern
Captures a reusable code structure or idiom.
```markdown
---
name: {skill-name}
description: Apply {pattern name}
trigger: /oma:{skill-name}
allowed-tools: [Read, Glob, Grep, Bash, Edit, Write]
---

## Skill: {skill-name}

{full description of the pattern}

## When to Use
{context}

## Pattern
```{language}
{canonical example}
```

## Anti-Patterns
{what to avoid}

## Constraints
{limitations}
```

### Template 4: Integration
Captures how to connect to an external service or tool.
```markdown
---
name: {skill-name}
description: Integrate with {service/tool name}
trigger: /oma:{skill-name}
allowed-tools: [Bash, Read]
---

## Skill: {skill-name}

{what this integration does}

## Prerequisites
- {requirement}
- {requirement}

## Setup
{configuration steps}

## Usage
{how to use}

## Examples
```
{example commands}
```

## Troubleshooting
{common issues and fixes}
```

## Constraints

- One skill per directory
- SKILL.md required
- Unique names
- Document thoroughly
- Test before publishing
