---
name: oma-whatsnew
description: Show changelog entries since the last release
argument-hint: "[count]"
allowed-tools:
  - Read
  - Glob
  - Bash
model: haiku4.5
---

## /oma:whatsnew

**Purpose:** Display recent changelog entries from CHANGELOG.md.

**Usage:**
- `/oma:whatsnew` — show unreleased + last release
- `/oma:whatsnew 5` — show last 5 sections (unreleased + 4 releases)

**Output format:**
```
## [Unreleased]

### Features
- new feature A
- new feature B

## [0.1.3] - 2026-04-09

### Features
- previous feature
```

**Implementation:**
- Reads CHANGELOG.md from repo root
- Parses sections between version headers
- Outputs [Unreleased] section first, then last N release sections
- Groups by type: Features, Bug Fixes, Refactors, Chores, etc.

**Constraints:**
- Only reads CHANGELOG.md — does not modify it
- Works on any repo with a CHANGELOG.md following keepachangelog.com format
