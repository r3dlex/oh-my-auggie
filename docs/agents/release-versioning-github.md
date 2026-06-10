---
type: release-versioning-checklist
project: oh-my-auggie
host: github
repository: r3dlex/oh-my-auggie
strategy: semver
enforcement: checklist-only
last_updated: 2026-06-10
---

# Release Versioning Checklist - oh-my-auggie

Per the AI SDLC release-versioning module. Strategy is **semver** via `semantic-release`. The repository has multiple published tags (latest: `v0.8.2`). This document records the existing live pipeline; it does not replace or modify it.

## Current verified state (as of 2026-06-10)

- Latest GitHub release/tag: **v0.8.2** (published 2026-06-08, `Latest` flag set).
- `npm view oh-my-auggie version` returns **0.8.1** - v0.8.2 GitHub release exists but the corresponding npmjs.com publish did not succeed (or was skipped as already-exists due to the idempotent guard in the workflow). This is a known discrepancy - see checklist item below.
- `plugins/oma/package.json` version field is `0.4.0` - this is **expected and normal**: `semantic-release` derives the release version from git tags and commits, not from the package.json version field. The workflow runs `npm ci` and `npm run prepare` before calling semantic-release; semantic-release updates package.json in-memory during a release run and publishes that ephemeral version. The stale static value in package.json is not authoritative.

## Tag format

`v<semver>` - for example `v0.8.2`. semantic-release derives the version from conventional commits since the last tag. The `release.json` manifest at repo root is the AI SDLC audit record; the tag is created by semantic-release via the GitHub API using the CI identity.

## How a release happens

1. A push to `main` (or a manual `workflow_dispatch`) triggers `.github/workflows/release.yml`.
2. The `release` job runs `npm ci`, `npm run prepare`, `npm test`, then calls `cycjimmy/semantic-release-action@v4` with `@semantic-release/changelog` and `@semantic-release/git` plugins.
3. If semantic-release detects releasable commits (conventional commit grammar), it creates a GitHub release and tag, updates CHANGELOG.md, and commits back to `main` as `chore(release): X.Y.Z [skip ci]`.
4. On success, downstream jobs `publish-npm`, `publish-github-packages`, and `publish-gh-packages` publish the package to npmjs.com (unscoped `oh-my-auggie`) and GitHub Packages (`@r3dlex/oh-my-auggie`).
5. npm publish uses OIDC Trusted Publishing (no static token); GitHub Packages publish uses `GITHUB_TOKEN`.

## Known discrepancy checklist item

- [ ] **Investigate v0.8.2 npm publish gap**: `gh release list` shows v0.8.2 as Latest (2026-06-08) but `npm view oh-my-auggie version` returns `0.8.1`. The release.yml publish-npm job uses an idempotent guard (`|| echo "::warning::Publish skipped"`) so a failed or skipped publish does not fail the workflow. Possible causes: OIDC Trusted Publishing pre-condition not met at time of v0.8.2 run, or package not yet on npmjs.com (first-publish OIDC restriction). Check the v0.8.2 release workflow run logs to confirm. Wiring in a publish-state check is a future decision; this pass does not change the workflow.

## Tag guardrails mapped to the existing flow

These five guardrails from the AI SDLC release-versioning module are evaluated against what the current workflow enforces:

- [ ] **green_ci** - not enforced by release.yml itself; the release job runs independently of CI checks. The workflow does run `npm test` before semantic-release, but it does not gate on the `ci.yml` or `ci-prek.yml` check-run outcomes. Gap: add a CI-passing check before triggering release, or configure branch protection to block the push that triggers release. Wiring this in is a future decision.
- [x] **conventional_commits** - enforced: semantic-release only creates a release when commits match the conventional commit grammar (`feat:`, `fix:`, `chore:`, etc.). Non-releasable commits result in no tag.
- [x] **secrets_permissions_preflight** - partially enforced: `release.yml` has explicit `permissions:` blocks on each job (`contents: write`, `id-token: write`, etc.). The workflow does not emit a preflight log of key names, but permissions are declared and scoped per job.
- [x] **no_dirty_generated_state** - enforced implicitly: the release job checks out a fresh workspace (`actions/checkout@v4` with `fetch-depth: 0`); no local dirty state can carry over from a developer machine.
- [ ] **protected_tag_policy** - not yet enforced: no GitHub tag protection ruleset for `v*` pattern exists. Tags can currently be created or deleted manually. Apply the ruleset (see admin checklist below).

## Tag protection ruleset (admin checklist, not automated)

- [ ] Ruleset target: tags matching `v*`
- [ ] Restrict creation to the GitHub Actions identity
- [ ] Block deletion and non-fast-forward updates (no history rewrites; a bad tag is retired forward with a new tag, never deleted)

## Out of scope

- No production deploys, no database migrations, no cloud provisioning.
- Package publishing targets: npmjs.com (`oh-my-auggie`, unscoped) and GitHub Packages (`@r3dlex/oh-my-auggie`).
- No tag deletion or force-push, ever.

## References

- GitHub rulesets (tag protection): <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>
- semantic-release: <https://semantic-release.gitbook.io/semantic-release>
