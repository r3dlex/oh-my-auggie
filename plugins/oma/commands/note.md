---
name: note
description: Write to notepad — priority, working memory, or manual notes
argument-hint: "<section> <text>"
allowed-tools:
  - Read
  - Bash
  - Write
model: haiku4.5
---

## /note

**Purpose:** Write notes to the OMA notepad for persistent context across sessions.

**Usage:**
- `/note priority <text>` — Set priority context (loaded every session)
- `/note working <text>` — Add to working memory (auto-pruned after 7 days)
- `/note manual <text>` — Add permanent manual note

**Examples:**
- `/note priority remember to use TypeScript strict mode`
- `/note working investigated auth bug — likely race condition`
- `/note manual deployment checklist: 1) backup DB 2) run migrations`

---

## Notepad Sections

### Priority (Permanent)
- Loaded at every session start
- Best for critical context, preferences, constraints
- Example: "Always use PostgreSQL, never MongoDB"

### Working Memory (7 days)
- Auto-pruned after 7 days
- Best for mid-project findings and context
- Example: "Feature X depends on service Y being deployed"

### Manual (Permanent)
- Never auto-pruned
- Best for reference material, checklists
- Example: "Run `npm test -- --coverage` for coverage report"

---

## Commands

| Command | Purpose | Persistence |
|---------|---------|-------------|
| `/note priority <text>` | Set priority note | Permanent |
| `/note working <text>` | Add working note | 7 days |
| `/note manual <text>` | Add manual note | Permanent |
| `/note list` | Show all notes | — |
| `/note clear <section>` | Clear section | — |

### Viewing Notes

Run `/note list` to see all notes:
```
OMA NOTEPAD
==========
[PRIORITY]
- remember TypeScript strict mode

[WORKING]
- auth bug investigation — race condition in handler

[MANUAL]
- deployment checklist
```

### Constraints

- Priority section capped at 500 characters total
- Working memory capped at 50 entries
- Manual section has no limit
