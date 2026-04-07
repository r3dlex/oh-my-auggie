---
name: git-workflow
description: Git workflow and commit conventions for OMA projects
origin: oma-template
---

# Git Workflow Rules (OMA)

## Commit Message Format

Follow conventional commits for cross-agent consistency:

```
<type>: <description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

## Multi-Agent PR Workflow

When creating PRs in orchestrated projects:

1. **Analyze full history** — `git log [base]..HEAD` not just latest commit
2. **See all changes** — `git diff [base-branch]...[HEAD]`
3. **Draft comprehensive PR** — summarize all agent contributions
4. **Include test plan** — mark TODOs as checkbox items
5. **Push with `-u`** — for new branches

## Branch Naming

- `feature/<agent-name>/<description>` — agent-specific work
- `fix/<issue>` — bug fixes
- `refactor/<scope>` — refactoring
- `docs/<topic>` — documentation

## Agent-Specific Workflow

When delegating via OMA:

1. **Plan first** — use `oma-planner` before implementation
2. **Implement** — use `oma-executor` for code
3. **Verify** — use `oma-verifier` before commit
4. **Review** — use `oma-architect` for architecture sign-off
5. **Commit** — follow conventional commits format

## Atomic Commits

Each commit should represent one logical change:
- One agent's contribution per commit when possible
- Related changes grouped, unrelated changes separate
- Message reflects what changed and why
