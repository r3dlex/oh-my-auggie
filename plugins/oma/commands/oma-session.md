---
name: oma-session
description: Worktree-first dev environment manager — create, manage, and switch development worktrees
argument-hint: "<action> [worktree-name]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

## /oma:session

**Purpose:** Manage development worktrees for parallel task execution across branches.

**Usage:**
- `/oma:session list` — List all worktrees
- `/oma:session create <name>` — Create new worktree
- `/oma:session switch <name>` — Switch to worktree
- `/oma:session delete <name>` — Remove worktree
- `/oma:session current` — Show current worktree

**Examples:**
- `/oma:session list`
- `/oma:session create feature-auth`
- `/oma:session switch feature-auth`
- `/oma:session delete old-feature`

---

## How It Works

### Worktree Management

OMA uses git worktrees for parallel development:
- Each worktree is a separate working directory
- Worktrees share git history
- Changes in one don't affect others
- Perfect for parallel task execution

### Commands

**List Worktrees:**
```
OMA WORKTREES
==============
[main]       /projects/oh-my-auggie (HEAD)
[feature-a]  /projects/oh-my-auggie-feature-a
[feature-b]  /projects/oh-my-auggie-feature-b
```

**Create Worktree:**
```
/oma:session create feature-auth
# Creates: /projects/oh-my-auggie-feature-auth
# Branch: feature-auth (from HEAD)
```

**Switch Worktree:**
```
/oma:session switch feature-auth
# Changes to the feature-auth worktree
```

**Delete Worktree:**
```
/oma:session delete old-feature
# Confirms before removal
```

### Session State

When switching worktrees:
- OMA state persists per worktree
- Mode and iteration preserved
- Notepad shared across worktrees

---

## Configuration

In `.oma/worktrees.json`:
```json
{
  "basePath": "/projects",
  "prefix": "oma-",
  "defaultBranch": "main"
}
```

### Constraints

- Git required for worktree support
- Cannot delete current worktree
- Worktrees must have unique names
- Prune stale worktrees regularly
