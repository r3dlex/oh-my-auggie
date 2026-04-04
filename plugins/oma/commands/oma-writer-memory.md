---
name: oma-writer-memory
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

## /oma:writer-memory

**Purpose:** Maintain persistent memory across writing sessions for consistent tone, style, and context.

**Usage:**
- `/oma:writer-memory set <key> <value>` — Store a memory
- `/oma:writer-memory get <key>` — Retrieve a memory
- `/oma:writer-memory list` — List all memories
- `/oma:writer-memory clear` — Clear all memories

**Examples:**
- `/oma:writer-memory set tone professional-casual`
- `/oma:writer-memory set audience senior-engineers`
- `/oma:writer-memory get tone`
- `/oma:writer-memory list`

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
/oma:writer-memory set <key> <value>
# Examples:
/oma:writer-memory set tone conversational
/oma:writer-memory set max-length 500
```

### Get Memory
```
/oma:writer-memory get <key>
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
/oma:writer-memory clear [key]
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
- Use `/oma:note` for one-off context
