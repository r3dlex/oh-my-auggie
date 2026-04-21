# Plan: Migrate r3dlex repos from NPM_TOKEN to npm Trusted Publishing (OIDC)

**Date:** 2026-04-21
**Complexity:** MEDIUM
**Scope:** 4 workflow files across 4 repos + npmjs.com UI configuration for 7 packages

---

## RALPLAN-DR Summary

### Principles
1. **Zero-secret publishing** -- eliminate long-lived NPM_TOKEN secrets in favor of OIDC-based ephemeral tokens
2. **Incremental migration** -- migrate one repo at a time, verify each before proceeding
3. **No publish downtime** -- configure Trusted Publisher on npmjs.com BEFORE removing the token from workflows
4. **Provenance preservation** -- all repos must publish with `--provenance` for supply-chain attestation

### Decision Drivers
1. **Security** -- long-lived NPM_TOKEN is a high-value credential; OIDC tokens expire in minutes
2. **Maintenance** -- removing secret rotation burden across 20 repos
3. **npm policy direction** -- npm is moving toward Trusted Publishing as the default; early adoption avoids future forced migration

### Options

**Option A: Full Trusted Publishing migration (RECOMMENDED)**
- Configure each package on npmjs.com to trust its GitHub repo + workflow
- Remove `NODE_AUTH_TOKEN` / `NPM_TOKEN` env vars from publish steps
- Keep `id-token: write` permission and `--provenance` flag
- Pros: Zero secrets, strongest provenance, aligned with npm direction
- Cons: Requires npmjs.com UI configuration per package (one-time), cannot be fully automated via CLI

**Option B: Keep NPM_TOKEN but add Trusted Publishing as fallback**
- Configure Trusted Publishing but leave token in place as backup
- Pros: Lower risk during transition
- Cons: Defeats purpose -- token still exists as attack surface, dual-auth complexity
- **Invalidated:** npm does not support "fallback" mode cleanly; if Trusted Publishing is configured, OIDC takes precedence anyway. Keeping the token adds no safety net, only confusion.

### ADR

- **Decision:** Option A -- Full migration to npm Trusted Publishing
- **Drivers:** Security (eliminate long-lived secrets), maintenance burden, npm ecosystem direction
- **Alternatives considered:** Option B (keep token as fallback) -- invalidated because npm's OIDC takes precedence when configured, making the token redundant
- **Consequences:** npmjs.com Trusted Publisher config is a manual UI step per package; future new packages must also configure it
- **Follow-ups:** Remove `NPM_TOKEN` secret from all r3dlex GitHub repo settings after migration is verified; document the Trusted Publishing setup in a contributor guide

---

## Current State Audit

| Repo | npm Package(s) | Uses NPM_TOKEN | Has id-token:write | Has --provenance | Migration Needed |
|------|---------------|----------------|-------------------|-----------------|-----------------|
| oh-my-auggie | `oh-my-auggie` | YES (publish-npm job has no token -- BUG: relies on .npmrc from setup-node but no env var set) | YES | YES | YES -- but see note below |
| oh-my-claudecode | `oh-my-claude-sisyphus` | YES | NO | NO | YES (most work) |
| oh-my-codex | `oh-my-codex` | YES | YES (top-level) | YES | YES (remove token) |
| oh-my-gemini | `@r3dlex/oh-my-gemini`, `oh-my-google-gemini`, `omg`, `omg-cli` | NO | YES | YES | NO (already migrated!) |
| oh-my-githubcopilot | `oh-my-githubcopilot` | YES | YES (publish job) | YES | YES (remove token) |
| ai-hero-cli | `ai-hero-cli` | NO (set to empty string) | YES | Implicit | NO (already tokenless) |

**Critical finding on oh-my-auggie:** The `publish-npm` job (line 59-102) has `id-token: write` and `--provenance` but does NOT set `NODE_AUTH_TOKEN` anywhere. This means it may already be using Trusted Publishing successfully, OR it is broken and succeeding only because of a cached `.npmrc` from `setup-node`. The `release` job (line 12-57) uses `GITHUB_TOKEN` for GPR publishing, which is correct and unrelated.

---

## Task Flow

### Step 1: Configure Trusted Publishers on npmjs.com (MANUAL, UI-only)

For each package, go to `https://www.npmjs.com/package/{name}/access` and add a Trusted Publisher:

| npm Package | GitHub Repo | Workflow File | Environment (optional) |
|------------|------------|--------------|----------------------|
| `oh-my-auggie` | `r3dlex/oh-my-auggie` | `release.yml` | (none) |
| `oh-my-claude-sisyphus` | `r3dlex/oh-my-claudecode` | `release.yml` | (none) |
| `oh-my-codex` | `r3dlex/oh-my-codex` | `release.yml` | (none) |
| `oh-my-githubcopilot` | `r3dlex/oh-my-githubcopilot` | `release.yml` | (none) |

Packages already configured (verify but likely done):
| `@r3dlex/oh-my-gemini` | `r3dlex/oh-my-gemini` | `release.yml` | (none) |
| `oh-my-google-gemini` | `r3dlex/oh-my-gemini` | `release.yml` | (none) |
| `omg` | `r3dlex/oh-my-gemini` | `release.yml` | (none) |
| `omg-cli` | `r3dlex/oh-my-gemini` | `release.yml` | (none) |

**Acceptance criteria:**
- Each package's "Publishing" settings on npmjs.com shows the correct GitHub repo + workflow as a Trusted Publisher
- Verify via the npmjs.com UI that the configuration is saved

### Step 2: Migrate oh-my-claudecode (most changes needed)

File: `r3dlex/oh-my-claudecode/.github/workflows/release.yml`

Changes:
1. Add `id-token: write` to the top-level `permissions` block (currently only `contents: write`)
2. Add `--provenance` flag to the `npm publish` command (line 49)
3. Remove `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` from the env block (line 52)

The `setup-node` with `registry-url: 'https://registry.npmjs.org'` must remain -- it creates the `.npmrc` that npm's OIDC flow uses.

**Acceptance criteria:**
- Workflow has `permissions: { contents: write, id-token: write }`
- `npm publish` step uses `--provenance` flag
- No reference to `NPM_TOKEN` or `NODE_AUTH_TOKEN` in the npmjs publish step
- Tag a test release (or use `workflow_dispatch` if available) and confirm it publishes successfully with provenance

### Step 3: Migrate oh-my-codex (remove token only)

File: `r3dlex/oh-my-codex/.github/workflows/release.yml`

Changes:
1. Remove `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` from the `publish-npm` job's publish step (line 312)
2. Verify `id-token: write` is present at top-level permissions (line 10 -- already there)
3. Verify `--provenance` is on the publish command (line 311 -- already there)

**Acceptance criteria:**
- No reference to `NPM_TOKEN` or `NODE_AUTH_TOKEN` in the `publish-npm` job
- `id-token: write` remains in permissions
- `--provenance` remains on publish command
- Next release publishes successfully

### Step 4: Migrate oh-my-githubcopilot (remove token from npmjs publish, keep for GPR)

File: `r3dlex/oh-my-githubcopilot/.github/workflows/release.yml`

Changes:
1. Remove `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` from the npmjs.com publish step (line 260)
2. Remove `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}` from the npm check step (line 247) -- replace with a tokenless check or remove the idempotency check
3. Remove the `Check npm token availability` step (lines 199-207) and its conditional guards -- no longer needed since OIDC handles auth
4. Keep `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` for the GitHub Packages publish steps (lines 224, 231) -- these use GPR, not npmjs
5. Keep `id-token: write` on the `publish` job permissions (line 155)
6. Keep `--provenance` on the publish command (line 258)

**Note on `scope: '@r3dlex'` in setup-node:** The oh-my-githubcopilot publish job does NOT set a scope in setup-node (line 170), which is correct for the unscoped `oh-my-githubcopilot` package. The GPR publish step temporarily renames to `@r3dlex/oh-my-githubcopilot` and sets a different registry. This dual-registry pattern is fine -- just ensure the npmjs setup-node step does not have `scope: '@r3dlex'` for the unscoped package.

**Acceptance criteria:**
- No reference to `NPM_TOKEN` in npmjs.com publish steps
- GitHub Packages steps still use `GITHUB_TOKEN`
- `id-token: write` and `--provenance` present
- Next release publishes to both GPR and npmjs.com

### Step 5: Verify oh-my-auggie publish-npm job (confirm or fix)

File: `r3dlex/oh-my-auggie/.github/workflows/release.yml`

Investigation: The `publish-npm` job (line 59-102) has `id-token: write` and `--provenance` but no `NODE_AUTH_TOKEN` env var. Either:
- (a) It is already using Trusted Publishing successfully -- verify by checking recent publish logs in GitHub Actions
- (b) It is broken / relying on some other mechanism

Changes (if not already working):
1. Ensure Trusted Publisher is configured on npmjs.com for `oh-my-auggie` package (Step 1)
2. Remove `scope: '@r3dlex'` from the `publish-npm` job's setup-node (line 78) -- the package is published as unscoped `oh-my-auggie`, so the scope is misleading and may interfere with OIDC token exchange
3. The `release` job's `NPM_TOKEN`/`NODE_AUTH_TOKEN` (lines 56-57) use `GITHUB_TOKEN` for GPR semantic-release -- this is unrelated to npmjs publishing and should remain

**Acceptance criteria:**
- `publish-npm` job publishes to npmjs.com without any `NPM_TOKEN` secret
- `scope: '@r3dlex'` removed from publish-npm's setup-node (or confirmed not to interfere)
- Recent GitHub Actions logs show successful provenance-attested publish

### Step 6: Clean up NPM_TOKEN secrets from GitHub repos

After all repos are verified publishing via Trusted Publishing:

1. Go to each repo's Settings > Secrets and variables > Actions
2. Delete the `NPM_TOKEN` secret from:
   - `r3dlex/oh-my-claudecode`
   - `r3dlex/oh-my-codex`
   - `r3dlex/oh-my-githubcopilot`
   - `r3dlex/oh-my-auggie` (if it exists)
   - Any other r3dlex repos that have it but do not publish
3. Optionally revoke the npm access token itself on npmjs.com (Account > Access Tokens)

**Acceptance criteria:**
- `NPM_TOKEN` secret no longer exists in any r3dlex repo that has been migrated
- The npm access token is revoked on npmjs.com
- No workflows fail due to missing secret (because none reference it anymore)

---

## Guardrails

### Must Have
- Trusted Publisher configured on npmjs.com BEFORE removing token from workflow
- Each repo tested with a real publish before moving to the next
- `--provenance` flag on all publish commands
- `id-token: write` permission on all publish jobs

### Must NOT Have
- No `NPM_TOKEN` or `NODE_AUTH_TOKEN` referencing a user-created secret in npmjs publish steps (post-migration)
- No scope mismatch in setup-node for unscoped packages
- No changes to GitHub Packages (GPR) publishing -- those correctly use `GITHUB_TOKEN`

---

## Success Criteria

1. All 4 repos with npm publish workflows use OIDC-based Trusted Publishing (no long-lived secrets)
2. All published packages have provenance attestation
3. `NPM_TOKEN` secret removed from all r3dlex GitHub repos
4. The npm access token is revoked
5. oh-my-gemini and ai-hero-cli confirmed already compliant (no changes needed)
