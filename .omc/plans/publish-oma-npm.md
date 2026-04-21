# Plan: Publish OMA as a Versioned GitHub npm Package

## Context

OMA is a TypeScript-based multi-agent orchestration layer for Augment Code, located at `plugins/oma/`. The package already has a `package.json` with name `@r3dlex/oh-my-auggie` and version `0.0.0`, a `prepare` script that runs `tsc`, and tests via Vitest. A CI workflow exists at `.github/workflows/ci.yml`. No CHANGELOG.md exists yet. All 26 commits follow Conventional Commits format, making auto-generation straightforward.

## Work Objectives

1. Initialize `CHANGELOG.md` from full git history using Conventional Commits
2. Set the initial version to `0.1.0` and bump the `package.json` version
3. Create a CI release workflow that publishes to GitHub Packages npm registry on tag push, with pre-release tag support
4. Add sponsor link to `README.md`

---

## Guardrails

### Must Have
- CHANGELOG.md covers all 26 commits from git history
- CI workflow publishes to GitHub Packages npm registry (not public npm) using `GITHUB_TOKEN`
- Pre-release tags (`v*.*.*-alpha.*`, `v*.*.*-beta.*`) publish with `npm tag: next`, stable tags publish with `npm tag: latest`
- Sponsor link in `README.md` pointing to `github.com/sponsors/r3dlex`
- `package.json` has correct `version`, `name`, `publishConfig` with `registry` set to GitHub Packages URL

### Must NOT Have
- Do not publish to the public npm registry
- Do not create a v0.0.0 release (already exists as placeholder)
- Do not overwrite existing CI workflow entries

---

## Version Strategy (Semver)

**Decision: Start at v0.1.0, treat v0.x as unstable/pre-production**

| Version | Meaning | Trigger |
|---|---|---|
| `v0.1.0-alpha.1` | First publishable release | Initial tag |
| `v0.1.0-alpha.n` | Subsequent pre-releases | Any `v0.*.*-alpha.*` tag |
| `v0.1.0-beta.1` | Beta release (feature-freeze) | Any `v0.*.*-beta.*` tag |
| `v0.1.0` | First stable | `v0.1.0` tag (no suffix) |
| `v0.2.0` | Minor bump | Next stable release |

**Justification:** The codebase is production-quality with tests, but as an Augment Code plugin (a relatively niche, early-stage ecosystem), starting at v0.x signals "unstable API, use at your own risk" while still enabling real versioning and changelog discipline. Once OMA reaches feature parity with OMC and has real external users, bump to v1.0.0.

---

## Task Flow

### Step 1: Initialize CHANGELOG.md from Git History

**Files created:** `plugins/oma/CHANGELOG.md`

Generate using `git-changelog` (npm package) or `conventional-changelog-cli` with Angular preset. The Angular preset matches the existing commit format (feat, fix, refactor, chore, etc.).

**Acceptance criteria:**
- All 26 commits appear in CHANGELOG.md under appropriate version sections (Unreleased section at top, then v0.1.0, etc.)
- Each entry links to its PR number where applicable (commits with `#<number>` in message)
- Date of each release section is accurate
- Sections are grouped by type: Features, Bug Fixes, Refactors, Chores

### Step 2: Update package.json with Version and publishConfig

**Files modified:** `plugins/oma/package.json`

**Changes:**
- Set `version` to `0.1.0`
- Add `publishConfig` field with `registry` pointing to GitHub Packages: `https://npm.pkg.github.com`
- Add `repository` field pointing to this repo
- Add `files` field: `["dist/**/*"]` to only publish compiled output
- Add `readme` field pointing to `README.md` in the plugin root

### Step 3: Create CI Release Workflow

**Files created:** `.github/workflows/release.yml`

Trigger: `push` events matching `v*` tags.

**Workflow design:**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'           # stable: v0.1.0, v0.2.0, etc.
      - 'v*-alpha.*'   # alpha pre-releases
      - 'v*-beta.*'    # beta pre-releases

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write   # Required for GitHub Packages write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@r3dlex'

      - name: Install dependencies
        run: cd plugins/oma && npm install

      - name: Build
        run: cd plugins/oma && npm run prepare

      - name: Run tests
        run: cd plugins/oma && npm test

      - name: Determine dist-tag
        id: dist-tag
        run: |
          if [[ $GITHUB_REF_NAME == *-alpha.* ]]; then
            echo "tag=alpha" >> $GITHUB_OUTPUT
          elif [[ $GITHUB_REF_NAME == *-beta.* ]]; then
            echo "tag=beta" >> $GITHUB_OUTPUT
          else
            echo "tag=latest" >> $GITHUB_OUTPUT
          fi
          echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Publish to GitHub Packages
        run: |
          cd plugins/oma
          npm publish --tag ${{ steps.dist-tag.outputs.tag }}
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Acceptance criteria:**
- Workflow file is at `.github/workflows/release.yml`
- `permissions.packages: write` is set
- `registry-url` is set to GitHub Packages URL (not public npm)
- Dist-tag logic correctly categorizes alpha, beta, and stable releases
- `npm publish` is run from within `plugins/oma/`
- `NODE_AUTH_TOKEN` uses `GITHUB_TOKEN` (automatic secret, no manual setup needed)
- Release notes are auto-generated from conventional commits

### Step 4: Add Sponsor Link to README.md

**Files modified:** `plugins/oma/README.md`

Add a "Sponsor" section or button. Options:
- Option A: Add a badge/button near the top: `[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)`
- Option B: Add a `## Sponsor` section with plain text link

**Recommendation:** Option A (badge) -- visually prominent, consistent with package ecosystem tooling.

**Acceptance criteria:**
- Sponsor link points to `https://github.com/sponsors/r3dlex`
- Link is visible in the rendered README

### Step 5: Create CONTRIBUTING.md

**Files created:** `plugins/oma/CONTRIBUTING.md`

Adapt from OMC's `~/.claude/plugins/marketplaces/omc/CONTRIBUTING.md`, replacing:
- `oh-my-claudecode` → `oh-my-auggie`
- `OMC` → `OMA`
- `omc` → `oma`
- `claude` → `auggie`
- Fork/clone URLs to point to `r3dlex/oh-my-auggie`
- Augment Code docs instead of Claude Code docs where applicable

Key sections to include:
1. Audience & Prerequisites (Node ≥ 18, auggie CLI, git)
2. Fork & Clone (fork r3dlex/oh-my-auggie)
3. Install & Build (npm install, npm run build)
4. Linking as active plugin (plugin marketplace add/install flow)
5. Rebuilding after changes
6. Running Tests (npm test)
7. Rebasing onto upstream
8. Submitting a PR
9. Troubleshooting

**Acceptance criteria:**
- CONTRIBUTING.md covers forking through PR submission
- All command references use OMA/auggie instead of OMC/claude
- Fork/clone URLs point to r3dlex/oh-my-auggie

### Step 6: First Tag and Dry-Run Verification

**Files modified:** Git tags (local + remote)

**Acceptance criteria:**
- Tag `v0.1.0-alpha.1` is created locally and pushed to remote
- CI release workflow triggers successfully
- Package appears in GitHub Packages at `https://github.com/r3dlex?tab=packages&pkg_name=oh-my-auggie`
- `npm view @r3dlex/oh-my-auggie` returns the correct metadata

---

## npm Scope Decision

**Already settled -- no change needed.** The package is already scoped to `@r3dlex/oh-my-auggie` in `package.json`. The scope `@r3dlex` matches the GitHub username (r3dlex) and aligns with GitHub Packages' requirement that scoped packages be published to the matching GitHub organization's registry. Publishing to GitHub Packages with a GitHub username scope is the correct approach for personal packages.

---

## Files Summary

| File | Action |
|---|---|
| `plugins/oma/CHANGELOG.md` | Create (generated from git history) |
| `plugins/oma/package.json` | Modify (version, publishConfig, repository, files) |
| `.github/workflows/release.yml` | Create (new CI workflow) |
| `plugins/oma/README.md` | Modify (add sponsor link) |
| `plugins/oma/CONTRIBUTING.md` | Create (adapted from OMC's CONTRIBUTING.md) |

**Estimated complexity:** LOW
**Lines changed:** ~5 files, ~200-300 lines total (mostly automated generation + CONTRIBUTING adaptation)
