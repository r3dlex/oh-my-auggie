---
name: oma-release
description: Automated release workflow — versioning, changelog, tagging, and publication
argument-hint: "<version-or-scope>"
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

## /oma:release

**Purpose:** Run the complete release workflow — version bump, changelog, git tag, and publication.

**Usage:**
- `/oma:release` — Detect next version and release
- `/oma:release patch` — Bump patch version
- `/oma:release minor` — Bump minor version
- `/oma:release major` — Bump major version
- `/oma:release <custom>` — Custom version spec

**Examples:**
- `/oma:release`
- `/oma:release minor`
- `/oma:release 2.0.0-rc1`

---

## Release Workflow

### Phase 1: Version Bump
- Analyze commits since last release
- Determine appropriate version bump
- Update `version` in `package.json` or equivalent

### Phase 2: Changelog Generation
- Parse conventional commits
- Group by type: Features, Fixes, Breaking
- Generate `CHANGELOG.md` entries

### Phase 3: Validation
- Run full test suite
- Verify no uncommitted changes
- Check release notes completeness

### Phase 4: Git Operations
- Commit version bump
- Create git tag
- Push to remote

### Phase 5: Publication (optional)
- Publish to npm (if package)
- Create GitHub release
- Announce (if configured)

---

## Commit Type Convention

| Type | Description | Version Impact |
|------|-------------|----------------|
| `feat:` | New feature | Minor |
| `fix:` | Bug fix | Patch |
| `docs:` | Documentation | None |
| `refactor:` | Code restructure | None |
| `perf:` | Performance | Patch |
| `BREAKING:` | Breaking change | Major |

---

## Configuration

In `.oma/release.json`:
```json
{
  "versionFile": "package.json",
  "changelogFile": "CHANGELOG.md",
  "tagPrefix": "v",
  "autoPublish": false,
  "githubRelease": true
}
```

### Constraints

- Git must be clean before release
- Requires commit/push permissions
- Publication requires appropriate credentials
- Destructive — cannot undo without reverting
