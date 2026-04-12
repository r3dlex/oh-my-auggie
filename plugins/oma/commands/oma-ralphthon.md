---
name: ralphthon
description: Autonomous hackathon lifecycle — PRD via deep-interview, ralph loop execution, auto-hardening
argument-hint: "<task>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
  - Task
model: sonnet4.6
---

[EXECUTING /oma:ralphthon — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:ralphthon

**Purpose:** Autonomous hackathon lifecycle — generates a PRD via deep-interview, executes all tasks with a ralph loop, then auto-hardens until clean.

**Usage:**
- `/oma:ralphthon <task>` — Start new session with deep-interview PRD generation
- `/oma:ralphthon --skip-interview <task>` — Skip interview, use task directly as the only story
- `/oma:ralphthon --resume` — Resume an existing ralphthon session

**Examples:**
- `/oma:ralphthon "Build a REST API for user management"`
- `/oma:ralphthon --skip-interview "Implement auth middleware"`
- `/oma:ralphthon --resume`

---

## How It Works

### Ralphthon Phases

**Phase 1: Deep Interview**
- Runs `/deep-interview` to gather requirements
- Generates a `ralphthon-prd.json` in `.omc/` with:
  - Project name and branch
  - User stories with acceptance criteria
  - Task breakdown per story
  - Hardening wave configuration
  - Brownfield planning context

**Phase 2: Ralph Loop Execution**
- Iterates through all tasks with `oma-ralph` loop behavior
- Tracks task status: pending, in-progress, completed, skipped, failed
- Retries failed tasks up to `maxRetries` (default: 3)
- Uses architect verification as completion gate

**Phase 3: Auto-Hardening**
- Runs hardening waves after all stories complete
- Each wave re-runs tests, type checks, linting
- New issues found increment the wave counter
- Terminates after `cleanWavesForTermination` (default: 3) clean waves, or `maxWaves` (default: 10)

### PRD Structure

```json
{
  "project": "<name>",
  "branchName": "<branch>",
  "description": "<description>",
  "stories": [
    {
      "id": "US-001",
      "title": "...",
      "description": "...",
      "acceptanceCriteria": ["..."],
      "priority": "high|medium|low",
      "tasks": [
        { "id": "T-001", "title": "...", "status": "pending", "retries": 0 }
      ]
    }
  ],
  "hardening": [],
  "config": {
    "maxWaves": 10,
    "cleanWavesForTermination": 3,
    "pollIntervalMs": 60000,
    "idleThresholdMs": 30000,
    "maxRetries": 3,
    "skipInterview": false
  },
  "planningContext": {
    "brownfield": true,
    "assumptionsMode": "explicit",
    "codebaseMapSummary": "<brief summary>",
    "knownConstraints": ["<constraint>"]
  }
}
```

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--skip-interview` | Skip deep-interview, create simple PRD | `false` |
| `--max-waves <n>` | Maximum hardening waves | `10` |
| `--poll-interval <s>` | Poll interval in seconds | `60` |
| `--resume` | Resume an existing session | — |

---

## TODOs

The following features are required to make ralphthon fully operational in OMA:

1. **Ralphthon state persistence** — Implement `.omc/ralphthon-state.json` and `.omc/ralphthon-prd.json` read/write via `oma_state_write` / `oma_state_read`
2. **Orchestrator loop** — Implement `startOrchestratorLoop()` that watches PRD file for task updates and injects work to executor
3. **Deep-interview integration** — Requires `deep-interview` mode/skill to be present; falls back to `--skip-interview` if unavailable
4. **Hardening wave tracker** — Tracks new issues per wave, terminates when clean
5. **Tmux-aware leader injection** — Requires tmux pane detection and key injection to work inside a tmux leader pane
6. **Rate limit handling** — Detects rate limits during execution and backs off gracefully

If any of these are not yet available, use `--skip-interview` for a simplified single-story run.

---

## Constraints

- Must be run inside a tmux session (detected via `TMUX` env var)
- Only one active ralphthon session per working directory at a time
- Max 100 total iterations (configurable via state)
- On max iterations: partial verdict with summary of what was accomplished
