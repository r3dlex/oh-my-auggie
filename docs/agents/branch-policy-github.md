---
type: branch-policy-checklist
project: oh-my-auggie
host: github
repository: r3dlex/oh-my-auggie
enforcement: checklist-only
owner: andre.burgstahler
last_updated: 2026-06-10
---

# GitHub Branch Policy Checklist - oh-my-auggie

This is a checklist artifact per the AI SDLC ci-policy module. It documents the intended branch protection for `main`. Nothing here mutates GitHub settings; applying a ruleset is a deliberate admin action by the owner.

## Target

- Protected branch: `main`
- Enforcement state: checklist-only (no ruleset or classic protection applied yet)
- Owner: repository admin (andre.burgstahler)

## Required before merge

- [ ] Pull request required before merging (no direct pushes to `main`)
- [ ] Required status checks (GitHub-hosted legs only):
  - [ ] `Pre-commit Hooks` (ci-prek.yml, hosted leg)
  - [ ] `Validate hook entry points` (ci.yml, hosted leg)
  - [ ] `Test (ubuntu-latest)` (ci.yml, matrix leg)
  - [ ] `Test (ubuntu-24.04-arm)` (ci.yml, matrix leg)
  - [ ] `Validate manifests` (ci.yml, hosted leg)
  - [ ] `oma CLI e2e` (ci.yml, hosted leg)
- [ ] Required approvals: 1 (single-maintainer repo; the AI review loop below substitutes for a second human)
- [ ] Dismiss stale approvals on new commits: enabled

## Explicitly NOT required

- `Pre-commit Hooks (self-hosted)`: wrapper pattern; runs before hosted leg but `continue-on-error: true`. Informational only; never mark as required.
- `Test (self-hosted)`: wrapper pattern; runs before hosted matrix legs but `continue-on-error: true`. Informational only; never mark as required.
- `Validate hook entry points (self-hosted)`: same wrapper pattern; informational only.
- `Validate manifests (self-hosted)`: same wrapper pattern; informational only.
- `oma CLI e2e (self-hosted)`: same wrapper pattern; informational only.
- `release`, `publish-npm`, `publish-github-packages`, `publish-gh-packages`: release jobs; not CI gate checks.

## Optional hardening (decide later)

- [ ] Require linear history (current practice is squash-merge, so history is already linear)
- [ ] Require signed commits
- [ ] Merge queue (overkill for a single-maintainer repo)
- [ ] Tag protection ruleset for `v*` (see `docs/agents/release-versioning-github.md`)

## PR merge gate (AI SDLC)

Merge is allowed only when all of these are true:

1. The **architect** confirms the PR still matches ADRs (`docs/adr/`), module boundaries, branch policy, and acceptance criteria.
2. The **reviewer** confirms code quality, safety, documentation, and drift checks have no blocking findings.
3. The **executor** confirms the requested change is complete, cleanup is done, and the required hosted checks are green.
4. The architect, reviewer, and executor loop reaches explicit agreement. If any role disagrees or required checks are not green, do not merge.

## References

- GitHub rulesets: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>
- GitHub branch protection: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches>
