---
name: note
description: Create and manage notes during work. Use for "take note", "remember this", and "save for later".
trigger: /oma:note
---

## Skill: note

Capture notes and context during work sessions.

## When to Use

- Important findings to remember
- Context for future work
- Decisions and rationale
- Links to reference materials
- TODOs and follow-ups

## Note Types

### Working Notes
Temporary notes during a session.
- Auto-deleted after session
- Quick capture

### Project Notes
Persistent notes for the project.
- Survive session end
- Project-specific context

### Reference Notes
External links and resources.
- URLs and citations
- Documentation links
- Article summaries

### Decision Notes
Decisions made and why.
- Rationale documented
- Alternative options considered
- Future review dates

## Commands

### Save a Note
```
/oma:note save {content}
```

### List Notes
```
/oma:note list
```

### Get Note
```
/oma:note get {id}
```

### Delete Note
```
/oma:note delete {id}
```

### Search Notes
```
/oma:note search {query}
```

## Note Format

```yaml
id: {unique-id}
type: {working|project|reference|decision}
content: {the note}
tags: [{tag1}, {tag2}]
created: {timestamp}
modified: {timestamp}
```

## Organization

### By Project
Notes associated with project context.
- `.oma/notes/{project}/`

### By Type
Grouped by note type.
- `.oma/notes/decisions/`
- `.oma/notes/references/`

### By Date
Chronological organization.
- `YYYY-MM-DD-{slug}.md`

## Output Format

```
## Note: {id}

**Type:** {type}
**Tags:** {tags}
**Created:** {timestamp}

### Content
{note content}

### Context
{where this was noted}
```

## Constraints

- Notes should be findable later
- Include enough context
- Tag for organization
- Delete when no longer relevant
- Don't over-note (noise)
