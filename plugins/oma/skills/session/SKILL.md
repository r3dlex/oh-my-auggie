---
name: session
description: Worktree and session management. Use for "new session", "worktree", "tmux", and "session management".
trigger: /oma:session
---

## Skill: session

Manage development sessions with worktrees and tmux.

## When to Use

- Creating new branches
- Managing multiple tasks
- Isolating work
- Session recovery
- Parallel development

## Session Types

### Development Session
- Feature work
- Bug fixes
- Single focused task

### Exploration Session
- Research
- Prototyping
- Proof of concept

### Review Session
- Code review
- Pair programming
- Pair review

## Worktree Management

### Create Worktree
```bash
git worktree add {path} {branch}
```

### List Worktrees
```bash
git worktree list
```

### Remove Worktree
```bash
git worktree remove {path}
```

### Worktree for Feature
```
{project}-feature-{name}
```

## Tmux Session Management

### Session Structure
```
session:{project}
  └── window:feature-{name}
      └── pane: editor
      └── pane: terminal
      └── pane: tests
```

### Commands
```bash
# Create session
tmux new-session -s {name} -d

# Attach
tmux attach -t {name}

# List
tmux list-sessions

# Kill
tmux kill-session -t {name}
```

## Session Workflow

### Start New Feature
1. Create worktree
2. Start tmux session
3. Set up windows/panes
4. Track session info
5. Begin work

### Switch Context
1. Detach current session
2. Attach target session
3. Resume work

### End Session
1. Commit changes
2. Push if needed
3. Clean up tmux
4. Optionally remove worktree
5. Log session summary

## Commands

### Start Session
```
/oma:session start {name}
```

### Attach Session
```
/oma:session attach {name}
```

### Detach Session
```
/oma:session detach
```

### List Sessions
```
/oma:session list
```

### End Session
```
/oma:session end {name}
```

### Create Worktree
```
/oma:session worktree create {branch} {path}
```

## Output Format

```
## Session: {name}

### Type
{type}

### Worktree
**Path:** {path}
**Branch:** {branch}
**Status:** {clean|dirty}

### Tmux
**Session:** {tmux-session}
**Windows:** {n}
**Created:** {date}
**Last active:** {date}

### Windows
| Window | Panes | Current |
|--------|-------|---------|
| {name} | {n} | {yes/no} |

### Recent Sessions
| Name | Type | Last Active | Status |
|------|------|-------------|--------|
| {name} | {type} | {date} | {active/ended} |

### Session Notes
{notes}
```

## Constraints

- Clean up completed sessions
- Don't forget worktree paths
- Keep session names unique
- Document session purpose
- Backup before major changes
