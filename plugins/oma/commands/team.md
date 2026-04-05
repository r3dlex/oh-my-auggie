---
name: team
description: Coordinated team of N agents working in parallel (requires external oma CLI companion)
argument-hint: "<N> <task>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
  - Task
model: opus
---

## /team

**Purpose:** Spawn a coordinated team of N specialized agents working in parallel on a shared task.

**Usage:** `/team <N> <task>`

**Requires:** External `oma` CLI companion tool running

**Examples:**
- `/team 4 implement the e-commerce platform`
- `/team 8 write comprehensive test coverage`

---

## How It Works

### Team Coordination

1. **Analyze** task for N-way decomposition
2. **Assign** each agent a distinct partition of work
3. **Spawn** all N agents simultaneously via `oma` CLI
4. **Monitor** progress across team members
5. **Merge** outputs when all complete

### Agent Roles

| Default Roles | Specializations |
|--------------|-----------------|
| `oma-explorer` | Codebase mapping |
| `oma-planner` | Task sequencing |
| `oma-executor` | Implementation |
| `oma-architect` | Verification |
| `oma-critic` | Risk assessment |

### Conflict Resolution

- **File conflicts:** Detect and flag for manual merge
- **Semantic conflicts:** Last architect verdict wins
- **Resource conflicts:** Sequential access enforced

### State Management

- Mode: `team`
- Team state in `.oma/team-state.json`
- Cancel with `/cancel` stops all agents

### Constraints

- N must be 2-16
- Requires `oma` CLI companion installed
- Team members must have non-overlapping work
- Results should be verified after merge
