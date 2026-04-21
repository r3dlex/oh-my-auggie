# Plan: `oma:version` and `oma:whatsnew` Commands

## RALPLAN-DR

### Principles
1. **Minimal surface area** — thin command wrappers, no new shared infrastructure
2. **CHANGELOG.md is source of truth** for oma:whatsnew (OMA manually curates it)
3. **Version from package.json** — single source of truth, consistent with release script
4. **Follow existing patterns** — oma-status.md for formatting, oma-release.md for frontmatter

### Decision Drivers
1. Users need to quickly check the installed OMA version without navigating files
2. `oma:whatsnew` should show what's changed since last release, using existing CHANGELOG.md
3. Both commands are **read-only** — no state mutation, no tool restrictions needed

### Viable Options

**Option A — Two separate command files (recommended)**
- `oma-version.md` + `oma-whatsnew.md` as independent commands
- Each reads its source file directly (package.json / CHANGELOG.md)
- Simplest, aligned with existing command-per-responsibility pattern

**Option B — Single oma-info command**
- Combines version + changelog in one command
- More output per invocation; requires user to filter
- Rejected: unnecessarily couples two independent pieces of information

---

## Implementation

### Files to Create

#### `plugins/oma/commands/oma-version.md`
```markdown
---
name: oma-version
description: Show the current installed version of OMA
argument-hint: ""
allowed-tools:
  - Read
  - Glob
model: haiku4.5
---

## /oma:version

**Purpose:** Display the current OMA version from package.json.

**Usage:** `/oma:version`
```

**Behavior:**
- Reads `plugins/oma/package.json`
- Extracts `version` field
- Prints: `oma@x.y.z` (semver format)

---

#### `plugins/oma/commands/oma-whatsnew.md`
```markdown
---
name: oma-whatsnew
description: Show changelog entries since last release
argument-hint: "[count]"
allowed-tools:
  - Read
  - Glob
  - Bash
model: haiku4.5
---

## /oma:whatsnew

**Purpose:** Display recent changelog entries from CHANGELOG.md.

**Usage:** `/oma:whatsnew` or `/oma:whatsnew 5` (show last 5 entries)

**Behavior:**
- Reads CHANGELOG.md from repo root
- Parses `[Unreleased]` section first, then last N released sections
- Groups by type: Features, Bug Fixes, Refactors, Chores, etc.
```

---

### Acceptance Criteria
- [ ] `/oma:version` outputs `oma@{version}` from package.json
- [ ] `/oma:whatsnew` shows unreleased + last released section from CHANGELOG.md
- [ ] Both use haiku model tier (read-only, fast)
- [ ] Commands appear in `/oma:skills` index
- [ ] `npm test` passes (361 tests)
