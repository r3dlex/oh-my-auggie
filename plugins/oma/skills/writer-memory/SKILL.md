---
name: writer-memory
description: Agentic memory for writers. Use for "remember this", "write from memory", and "context preservation".
trigger: /oma:writer-memory
---

## Skill: writer-memory

Maintain persistent context and memory across writing sessions.

## When to Use

- Long-form writing projects
- Multiple sessions on same topic
- Maintaining consistency
- Tracking narrative elements
- Character/world details

## Memory Types

### Project Memory
- Overall vision
- Target audience
- Tone and style
- Structural decisions

### Content Memory
- Key points covered
- What to avoid
- References used
- Research gathered

### Narrative Memory
- Plot elements
- Character details
- World-building rules
- Timeline events

### Session Memory
- Where we left off
- In-progress work
- Recent changes
- Next steps

## Commands

### Save to Memory
```
/oma:writer-memory save {key} {content}
```

### Get from Memory
```
/oma:writer-memory get {key}
```

### List Memory Keys
```
/oma:writer-memory list
```

### Search Memory
```
/oma:writer-memory search {query}
```

### Clear Memory
```
/oma:writer-memory clear {key}
```

## Memory Organization

### By Project
```
.oma/writer-memory/{project}/
├── project.yaml
├── characters/
├── world/
├── plot/
└── sessions/
```

### By Type
- `project/` — Project-level info
- `characters/` — Character profiles
- `world/` — World-building
- `plot/` — Plot elements
- `sessions/` — Session notes

## Memory Structure

```yaml
key: {identifier}
type: {project|character|world|plot|note}
project: {project-name}
content: |
  {detailed content}
tags: [{tag1}, {tag2}]
created: {timestamp}
modified: {timestamp}
references:
  - {file}
  - {URL}
```

## Output Format

```
## Writer Memory: {project}

### Memory Keys
| Key | Type | Modified |
|-----|------|----------|
| {key} | {type} | {date} |
| {key} | {type} | {date} |

### Project Overview
{from project.yaml}

### Recent Memories
- **{key}** ({type}) — {summary}
- **{key}** ({type}) — {summary}

### Active Session
**Last session:** {date}
**Position:** {where we were}
**Next:** {what comes next}

### Memory Search: "{query}"
| Key | Type | Relevance |
|-----|------|-----------|
| {key} | {type} | {score} |
```

## Constraints

- Keep memories findable
- Update after changes
- Use consistent keys
- Delete stale data
- Back up important memories
