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

**Output format:**
```
oma@{version}
```

Example: `oma@0.1.4`

**Implementation:**
- Reads `plugins/oma/package.json`
- Extracts and outputs the `version` field prefixed with `oma@`
- Read-only operation — no state mutation
