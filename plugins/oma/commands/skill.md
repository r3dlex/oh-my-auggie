---
name: skill
description: Manage OMA skills — list, add, remove, search, and edit skills
argument-hint: "<action> [skill-name]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

## /skill

**Purpose:** Manage OMA skills — list available skills, add new ones, remove, search, and edit.

**Usage:**
- `/skill list` — List all available skills
- `/skill search <term>` — Search skills by keyword
- `/skill add <name>` — Add a skill from registry
- `/skill remove <name>` — Remove a skill
- `/skill edit <name>` — Edit a skill's content

**Examples:**
- `/skill list`
- `/skill search "planning"`
- `/skill add ralph`
- `/skill remove unused-skill`
- `/skill edit my-custom-skill`

---

## How It Works

### Skill Management

**List Skills:**
- Shows all installed skills with descriptions
- Indicates which are built-in vs. custom

**Search:**
- Searches skill names and descriptions
- Supports fuzzy matching

**Add:**
- Fetches from OMC skill registry
- Installs to `~/.claude/skills/` or project `.skills/`

**Remove:**
- Deletes skill file
- Confirms before deletion

**Edit:**
- Opens skill file in edit mode
- Validates YAML frontmatter on save

### Skill Structure

Skills are `.md` files with YAML frontmatter:
```yaml
---
name: skill-name
description: What the skill does
trigger: "keyword"  # optional auto-invoke
model: sonnet4.6    # recommended model
---
[skill content]
```

### Skill Registry

Built-in skills (cannot be removed):
- autopilot, ralph, ultrawork, team, plan, ralplan
- ccg, ultraqa, ask, note, skill
- doctor, setup, mcp-setup, hud, trace
- release, session, visual-verdict, learner
- writer-memory, notifications, science, research
- deepinit, interview, deslop

### Constraints

- Custom skills stored in project `.skills/` take precedence
- Skill names must be unique
- Removing built-in skills shows warning but allows
