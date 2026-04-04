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

## Skill Structure

Each skill is a directory in `plugins/oma/skills/` with:

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

### Create Skill
```
/oma:skill create {skill-name}
```

### Edit Skill
```
/oma:skill edit {skill-name}
```

### Delete Skill
```
/oma:skill delete {skill-name}
```

### Search Skills
```
/oma:skill search {query}
```

### Sync Skills
```
/oma:skill sync
```

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

## Constraints

- One skill per directory
- SKILL.md required
- Unique names
- Document thoroughly
- Test before publishing
