---
name: oma-teleport
description: Create git worktrees instantly — for issues, PRs, and features in isolation
argument-hint: "<ref>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
model: haiku4.5
---

## /oma:teleport

**Purpose:** Create a git worktree for working on issues, PRs, or features in isolation. Handles all the setup — branch creation, dependency installation, symlinking node_modules.

**Usage:**
- `/oma:teleport <ref>` — Create worktree from issue, PR, or feature
- `/oma:teleport <ref> --worktree-path <path>` — Custom worktree root directory
- `/oma:teleport <ref> --base <branch>` — Base branch to branch from (default: main)
- `/oma:teleport <ref> --no-cd` — Do not print cd instructions
- `/oma:teleport <ref> --json` — Output machine-readable JSON
- `/oma:teleport list` — List all worktrees in default location
- `/oma:teleport remove <name>` — Remove a worktree

**Examples:**
- `/oma:teleport #123` — Create worktree for issue #123 in current repo
- `/oma:teleport owner/repo#456` — Create worktree for issue in a different repo
- `/oma:teleport "add-caching"` — Create feature worktree named "add-caching"
- `/oma:teleport https://github.com/owner/repo/pull/789` — Create PR review worktree
- `/oma:teleport list`
- `/oma:teleport remove pr/myapp-123`

---

## Reference Formats

Teleport accepts many reference formats:

| Format | Example | Description |
|--------|---------|-------------|
| `#<n>` | `#123` | Issue in current repo |
| `owner/repo#<n>` | `owner/repo#456` | Issue in another repo |
| `omc#<n>` | `omc#123` | Issue resolved via alias |
| `PR URL` | `https://github.com/.../pull/789` | PR worktree with source branch |
| `MR URL` | `https://gitlab.com/.../merge_requests/123` | GitLab MR worktree |
| `owner/repo!<n>` | `group/repo!45` | GitLab MR shorthand |
| Feature name | `"add-caching"` | Feature branch worktree |

---

## How It Works

### Worktree Creation Flow

1. **Parse reference** — Detect issue, PR, or feature from input format
2. **Fetch title** — Use provider CLI (gh, glab, bb) to get issue/PR title
3. **Create branch** — Branch from `--base` (default: main) with sanitized name
4. **Bootstrap dependencies** — Either symlink `node_modules` from parent repo or run `npm install`
5. **Print instructions** — Show `cd` command and worktree details

### Worktree Layout

Default root: `~/Workspace/oma-worktrees/`

```
~/Workspace/oma-worktrees/
  issue/myapp-123/         # Issue worktree
  pr/myapp-456/            # PR review worktree
  feat/myapp-add-caching/  # Feature worktree
```

### Dependency Handling

- **Symlink mode (default):** If parent repo has `node_modules`, symlink it into the worktree (instant)
- **Install mode:** If `package.json` differs, run `npm install` (or pnpm/yarn)
- **Package manager detection:** Reads `packageManager` field from `package.json`, falls back to npm

---

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--worktree-path <path>` | Custom worktree root | `~/Workspace/oma-worktrees/` |
| `--base <branch>` | Base branch for new branches | `main` |
| `--no-cd` | Skip printing cd instructions | `false` |
| `--json` | Output JSON | `false` |

### Subcommands

| Subcommand | Description |
|------------|-------------|
| `list` | List all worktrees in default root |
| `remove <name>` | Remove a worktree (prompts if uncommitted changes) |
| `remove <name> --force` | Remove worktree even with uncommitted changes |

---

## TODOs

The following features are needed for full teleport functionality in OMA:

1. **Provider CLI detection** — Detect and use `gh`, `glab`, `bb`, or Azure CLI based on remote URL
2. **Provider abstraction** — `oma_provider_get()` / `oma_provider_view_issue()` / `oma_provider_view_pr()` to fetch issue/PR metadata
3. **Worktree manager** — `oma_worktree_create()`, `oma_worktree_list()`, `oma_worktree_remove()` via `oma_mode_set` or bash scripts
4. **Git config integration** — Use OMA's git hooks config (`.oma/hooks/`) for stop-gate and cost-tracking
5. **Session registry** — For `teleport list` and `teleport remove` to track created worktrees across sessions

Until provider integration is implemented, teleport works in "feature branch" mode: parses the feature name and creates a branch without fetching remote metadata.

---

## Constraints

- Must be run from within a git repository with an origin remote
- Worktrees must be created inside `~/Workspace/oma-worktrees/` (or custom root)
- Symlinked `node_modules` requires identical `package.json` between parent and worktree
- Refuses to remove worktrees outside the configured root (safety)
- Prompts before removing worktrees with uncommitted changes (use `--force` to bypass)
