---
name: setup
description: Install or refresh OMA — set up plugin, hooks, agents, and skills
argument-hint: "[options]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

## /setup

**Purpose:** Install or refresh the OMA plugin, hooks, agents, and skills.

**Usage:**
- `/setup` — Interactive setup
- `/setup --fresh` — Force fresh install
- `/setup --verify` — Verify without changes
- `/setup --update` — Update to latest version

**Examples:**
- `/setup`
- `/setup --fresh`
- `/setup --verify`

---

## What Setup Does

### Phase 1: Environment Check
- Detect Auggie version and capabilities
- Check plugin directory structure
- Verify hook system compatibility

### Phase 2: Plugin Installation
- Copy plugin files to `plugins/oma/`
- Set permissions on hook scripts
- Validate YAML frontmatter on all files

### Phase 3: Hook Registration
- Register hooks with Auggie
- Verify hook types and scripts
- Test hook execution

### Phase 4: Agent Sync
- Validate all agent definitions
- Ensure tool permissions correct
- Check model assignments

### Phase 5: Skill Index
- Build skill index from `skills/` directory
- Register trigger keywords
- Validate skill format

---

## Options

| Option | Description |
|--------|-------------|
| `--fresh` | Delete existing config and reinstall |
| `--verify` | Check installation without changes |
| `--update` | Pull latest from registry |
| `--minimal` | Install core only, skip optional |

---

## Constraints

- Back up existing config before `--fresh`
- Some steps require confirmation
- Rollback on failure if possible
