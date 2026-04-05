---
name: writer-memory
description: Agentic memory for writers — persistent context across writing sessions
argument-hint: "<action> [content]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: haiku4.5
---

## /writer-memory

**Purpose:** Maintain persistent memory across writing sessions for consistent tone, style, and context.

**Usage:**
- `/writer-memory set <key> <value>` — Store a memory
- `/writer-memory get <key>` — Retrieve a memory
- `/writer-memory list` — List all memories
- `/writer-memory clear` — Clear all memories

**Examples:**
- `/writer-memory set tone professional-casual`
- `/writer-memory set audience senior-engineers`
- `/writer-memory get tone`
- `/writer-memory list`

---

## Memory Categories

### Voice & Tone
- Writing style preferences
- Formality level
- Audience assumptions
- Example: "conversational but precise"

### Content Rules
- What to include/exclude
- Structure preferences
- Formatting standards
- Example: "always include code examples"

### Context
- Project background
- Brand guidelines
- Previous feedback
- Example: "Auggie plugin docs"

---

## Commands

### Set Memory
```
/writer-memory set <key> <value>
# Examples:
/writer-memory set tone conversational
/writer-memory set max-length 500
```

### Get Memory
```
/writer-memory get <key>
# Returns the stored value
```

### List Memories
```
OMA WRITER MEMORY
==================
[tone] conversational
[audience] senior engineers
[max-length] 500
```

### Clear
```
/writer-memory clear [key]
# Without key: clear all
# With key: clear specific
```

---

## Configuration

Stored in `.oma/writer-memory.json`:
```json
{
  "tone": "conversational",
  "audience": "senior engineers",
  "style": {
    "paragraphLength": "short",
    "useEmoji": false,
    "codeFirst": true
  }
}
```

### Constraints

- Keys must be lowercase alphanumeric + hyphen
- Values limited to 1000 characters
- Memory persists across sessions
- Use `/note` for one-off context
