---
name: oma-session-search
description: Search across all session history — find past decisions, code, and context quickly
argument-hint: "<query>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
model: haiku4.5
---

## /oma:session-search

**Purpose:** Search across all Claude Code session history to find past decisions, code, explanations, and context.

**Usage:**
- `/oma:session-search <query>` — Search all session history for query
- `/oma:session-search <query> --since <date>` — Search only sessions since date (e.g., `2026-03-01`)
- `/oma:session-search <query> --project <path>` — Search only a specific project
- `/oma:session-search <query> --limit 20` — Limit to N results (default: 50)
- `/oma:session-search <query> --json` — Output machine-readable JSON
- `/oma:session-search <query> --case-sensitive` — Case-sensitive matching

**Examples:**
- `/oma:session-search "how did we handle auth?"`
- `/oma:session-search "rate limit" --since 2026-03-01`
- `/oma:session-search "fix session" --project ~/Projects/myapp`
- `/oma:session-search "API design" --limit 10 --json`

---

## How It Works

### Session History Index

OMA maintains a session history index at `.oma/sessions/` (or `.omc/sessions/`). Each session has:
- `events/*.raw.txt` — Raw transcript chunks
- `events/*.summary.md` — Generated summaries
- `manifest.json` — Session metadata (timestamps, project, agent)

### Search Behavior

1. **Scope** — Searches `.raw.txt` files by default; summaries included if query is high-level
2. **Deduplication** — Same content from different sessions shown once per session
3. **Ranking** — Matches in summaries rank higher than raw transcript matches
4. **Context** — Returns surrounding lines (default: 2 lines before/after match)

### Output Format

**Human-readable (default):**
```
Session history matches for "query"
Showing N of M matches across X files (global scope)

1. session-20260310T014715888Z [agent:executor]
   2026-03-10T01:47:15.888Z
   ~/Projects/myapp
   ...matched excerpt with query highlighted...
   .oma/sessions/.../events/000001.raw.txt:42

2. session-20260308T...
   ...
```

**JSON output:**
```json
{
  "query": "...",
  "totalMatches": 5,
  "searchedFiles": 12,
  "scope": { "mode": "global" },
  "results": [
    {
      "sessionId": "session-20260310T...",
      "agentId": "executor",
      "timestamp": "2026-03-10T01:47:15.888Z",
      "projectPath": "~/Projects/myapp",
      "excerpt": "...matched text...",
      "sourcePath": ".oma/sessions/.../events/000001.raw.txt",
      "line": 42
    }
  ]
}
```

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--since <date>` | Only search sessions after date | All sessions |
| `--project <path>` | Limit to specific project | All projects |
| `--limit <n>` | Max results to return | 50 |
| `--json` | Output JSON instead of human-readable | `false` |
| `--case-sensitive` | Case-sensitive search | `false` |
| `--context <n>` | Lines of context around each match | 2 |

---

## TODOs

The following features are needed to implement session history search in OMA:

1. **Session history indexer** — A hook/script that writes session transcript events to `.oma/sessions/` with proper chunking and metadata
2. **Search engine** — Use `grep` or a lightweight full-text search to query the index; `session_search` MCP tool or `oma_session_search` bash script
3. **Manifest generation** — Create `manifest.json` per session with timestamps, project path, agent IDs

If session history is not yet indexed, `/oma:session-search` will return "No matches found" until the indexer is implemented.

---

## Constraints

- Search is read-only (never modifies session files)
- Large repositories may take longer on first search
- Only sessions that have been indexed are searchable
- Results are ordered by recency (newest sessions first)
