---
name: oma-research
description: Parallel research via document-specialist agents — gather comprehensive information quickly
argument-hint: "<query>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Write
  - Task
  - WebSearch
model: sonnet4.6
---

## /oma:research

**Purpose:** Research a topic using parallel document-specialist agents for speed.

**Usage:** `/oma:research <query>`

**Examples:**
- `/oma:research best practices for React Server Components`
- `/oma:research GraphQL vs tRPC trade-offs`

---

## How It Works

### Parallel Research

1. **Decompose** query into 3-6 sub-questions
2. **Spawn** document-specialist agents in parallel
3. **Each agent** researches one aspect deeply
4. **Synthesize** findings into unified report

### Agent Specializations

| Agent | Research Focus |
|-------|----------------|
| Doc-agent-1 | Official documentation |
| Doc-agent-2 | Community discussions |
| Doc-agent-3 | Benchmarks and data |
| Doc-agent-4 | Expert opinions |

### Output Structure

```
## Research: <query>

### Executive Summary
...

### Key Findings
1. [Finding 1] — Source: ...
2. [Finding 2] — Source: ...

### Detailed Analysis
...

### Sources
- [1] Documentation: ...
- [2] Community: ...
- [3] Benchmarks: ...

### Recommendations
Based on findings: ...
```

### Constraints

- Sources must be cited
- Conflicting info flagged explicitly
- Max 5 concurrent agents
- Results are informational, not advice
