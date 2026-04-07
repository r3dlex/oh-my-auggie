---
name: oma-skill
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

## /oma:skill

**Purpose:** Manage OMA skills — list available skills, add new ones, remove, search, and edit.

**Usage:**
- `/oma:skill list` — List all available skills
- `/oma:skill search <term>` — Search skills by keyword
- `/oma:skill add <name>` — Add a skill from registry
- `/oma:skill remove <name>` — Remove a skill (see Remove vs Delete note below)
- `/oma:skill edit <name>` — Edit a skill's content
- `/oma:skill setup <scope>` — Set up skills for a given scope (user, project, or plugin)
- `/oma:skill sync [source]` — Sync skills from remote sources

**Examples:**
- `/oma:skill list`
- `/oma:skill search "planning"`
- `/oma:skill add ralph`
- `/oma:skill remove unused-skill`
- `/oma:skill edit my-custom-skill`
- `/oma:skill setup user`
- `/oma:skill setup project`
- `/oma:skill sync`
- `/oma:skill sync https://github.com/user/repo/tree/main/skills/my-skill`

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
- Fetches from OMC skill registry or GitHub URL
- Installs to `plugins/oma/skills/` or project `.skills/`
- Remote installation: `/oma:skill sync https://github.com/user/repo/tree/main/skills/skill-name`

**Sync (remote install):**
- `/oma:skill sync` — sync all skills from configured remote sources
- `/oma:skill sync <url>` — install a skill directly from a GitHub URL
- Supports GitHub tree URLs (fetches the SKILL.md directly)
- Example: `/oma:skill sync https://github.com/user/repo/tree/main/skills/my-skill`

**Setup:**
- `/oma:skill setup user` — Initializes the user-level skills directory (`~/.augment/plugins/marketplaces/oh-my-auggie/plugins/oma/skills-learned/`)
- `/oma:skill setup project` — Initializes the project-level skills directory (`.oma/skills/`)
- `/oma:skill setup plugin` — Initializes the plugin-internal skills directory (`plugins/oma/skills/`)
- Each scope has different precedence: project > user > built-in (plugin-internal)

**Remove:**
- Deletes skill file from the target location
- Confirms before deletion
- **Note:** Use `remove` only. `delete` is not a supported subcommand alias.

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

### Delegation Requirement (OMA Orchestration Mode)

When OMA orchestration mode is active, write operations **MUST** delegate to `oma-executor`:

- `/oma:skill add <name>` — delegate to `oma-executor`
- `/oma:skill remove <name>` — delegate to `oma-executor`
- `/oma:skill edit <name>` — delegate to `oma-executor`

Read-only operations (`list`, `search`, `info`) may proceed directly.

### Constraints

- Custom skills stored in project `.skills/` take precedence
- Skill names must be unique
- Removing built-in skills shows warning but allows
