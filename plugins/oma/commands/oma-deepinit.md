---
name: deepinit
description: Generate hierarchical AGENTS.md — comprehensive multi-agent architecture document
argument-hint: "[project-root]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: opus
---

[EXECUTING /oma:deepinit — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:deepinit

**Purpose:** Generate a comprehensive hierarchical AGENTS.md documenting all agents, skills, workflows, and conventions.

**Usage:** `/oma:deepinit [project-root]`

**Examples:**
- `/oma:deepinit`
- `/oma:deepinit /path/to/project`

---

## How It Works

### Analysis Phase

1. **Scan** project structure
2. **Identify** existing agents and their roles
3. **Map** skill dependencies
4. **Detect** existing conventions

### Generation Phase

Creates hierarchical AGENTS.md with sections:

```
AGENTS.md — Project Orchestration
==================================

## Agents

### oma-executor
- Model: sonnet4.6
- Role: Primary implementation
- Tools: Read, Write, Edit, Bash, Glob, Grep
- Constraints: ...

### oma-architect
- Model: opus
- Role: Architecture and verification
- ...

## Skills

### autopilot
- Trigger: "autopilot"
- Description: ...
- ...

## Workflows

### ralph-loop
- When: ...
- Steps: ...
- ...

## Conventions

### File Organization
...

### Commit Style
...

### Code Review
...
```

### Options

| Option | Description |
|--------|-------------|
| `--force` | Overwrite existing AGENTS.md |
| `--diff` | Show diff before writing |
| `--minimal` | Core agents only |

### Constraints

- Does not overwrite without `--force`
- Preserves existing custom sections
- Comments preserved, only OMA sections updated
