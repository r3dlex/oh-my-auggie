---
name: oma-doctor
description: Diagnose OMA installation issues — check plugin health, dependencies, and configuration
argument-hint: "[component]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
model: sonnet4.6
---

## /oma:doctor

**Purpose:** Run diagnostic checks on OMA installation and report issues.

**Usage:**
- `/oma:doctor` — Run full diagnostic
- `/oma:doctor <component>` — Check specific component

**Examples:**
- `/oma:doctor`
- `/oma:doctor hooks`
- `/oma:doctor agents`

---

## Diagnostic Checks

### Core Installation
- [ ] Plugin files present in `plugins/oma/`
- [ ] `hooks.json` valid and readable
- [ ] All hook scripts executable
- [ ] State directory `.oma/` writable

### Legacy Content Check
- [ ] No `.omc/` directories from OMC migration
- [ ] No legacy `.mcp.json` in plugin root
- [ ] No duplicate hook definitions

### Agents
- [ ] All agent files present
- [ ] Agent YAML frontmatter valid
- [ ] Required tools declared
- [ ] Model assignments valid

### Hooks
- [ ] `session-start.sh` runs without errors
- [ ] `delegation-enforce.sh` blocks appropriately
- [ ] `stop-gate.sh` respects ralph mode
- [ ] `keyword-detect.sh` detects keywords

### Skills
- [ ] Skill files valid markdown
- [ ] YAML frontmatter correct
- [ ] Trigger patterns defined

### Integration
- [ ] Auggie plugin loading works
- [ ] CLI companion (`oma`) accessible
- [ ] Environment variables set

---

## Output Format

```
OMA DOCTOR — Diagnostic Report
===============================

[PASS] Core Installation
  - Plugin directory: OK
  - hooks.json: Valid JSON
  - State directory: Writable

[FAIL] Hook Scripts
  - keyword-detect.sh: NOT FOUND
  Recommendation: Create the missing hook script

[WARN] Agents
  - oma-visualverdict: Missing description

[INFO] Integration
  - Auggie version: 0.2.x
  - CLI companion: Not found (optional)
```

### Exit Codes

- 0: All checks pass
- 1: Warnings only
- 2: Failures found
