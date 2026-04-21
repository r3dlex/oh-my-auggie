# Plan: Automatic Version Bumping for OMA Releases

## Context

oh-my-claudecode uses a `scripts/release.ts` that runs locally before tagging:
1. Reads current version from `package.json`
2. Bumps version (patch/minor/major or explicit)
3. Updates version in ALL of: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, docs `CLAUDE.md`
4. Generates `CHANGELOG.md` from conventional commits since last tag
5. Generates `.github/release-body.md` with contributor mentions
6. Creates a commit on a `dev` branch → merge to `main` → tag → CI publishes

The CI workflow is purely CI/CD (test, build, publish) — **not** version management.

OMA currently has a simpler setup: version is manually updated in `package.json`, and the CI workflow extracts the version from the git tag (e.g., `v0.1.2-alpha.1` → `0.1.2-alpha.1`). This means:
- Developers must manually bump `package.json` before each release
- The 5 version references in the repo can drift from each other
- No automatic changelog generation

**Current version drift confirmed across the repo:**
| File | Current Version |
|------|---------------|
| `plugins/oma/package.json` | `0.1.2-alpha.1` |
| `plugins/oma/.augment-plugin/plugin.json` | `0.2.0` |
| `.claude-plugin/marketplace.json` (root) | `0.1.0` |
| `.claude-plugin/marketplace.json` (plugin entry) | `0.1.0` |
| `.claude-plugin/plugin.json` | `0.1.0` |

Note: CI (`release.yml:52-62`) patches `package.json` at publish time from the git tag, so drift does **not** affect what gets published. However, contributors reading the repo see stale versions in 4 out of 5 files.

**Goal:** Adopt a minimal version-bump script for OMA — version consistency for contributors, no changelog overhead (OMA has low release frequency).

---

## Decision Drivers

1. **Consistency**: All 5 version references must always agree with each other
2. **Minimal automation**: Developer runs one command instead of manually editing 5 files
3. **No changelog generation**: OMA has a manually maintained CHANGELOG.md; at 1-2 releases/month, auto-generation adds noise not value
4. **CI unchanged**: `release.yml` already handles tag→publish correctly; this plan does not modify it
5. **Simplicity for OMA**: OMA has ~1 maintainer; avoid over-engineering

---

## Viable Options

### Option A: Minimal Version-Bump Script (recommended)
A stripped-down `scripts/release.ts`:
- Reads current version from `plugins/oma/package.json`
- Accepts `patch`, `minor`, `major`, or explicit `X.Y.Z` as argument
- **Required** `--dry-run` flag for safety
- Updates all **5** version references in-place:
  1. `plugins/oma/package.json`
  2. `plugins/oma/.augment-plugin/plugin.json`
  3. `.claude-plugin/marketplace.json` (root `version`)
  4. `.claude-plugin/marketplace.json` (plugin entry `version`)
  5. `.claude-plugin/plugin.json`
- Runs `npm install --package-lock-only` to regenerate lockfile
- **No changelog generation** (OMA has manual CHANGELOG.md)
- **No release-body.md** (not needed for OMA)
- **No sync-metadata.ts** (unnecessary complexity)

**Workflow**: Developer runs `npx tsx scripts/release.ts patch` → commits → merges to main → tags → CI publishes

**Pros:** Proven pattern from OMC, all 5 files stay in sync, zero changelog overhead
**Cons:** New `scripts/` directory and `tsx` dependency, adds a step before tagging

### Option B: CI-Driven Version Extraction (status quo with cosmetic fix)
Keep current CI-only approach — CI already patches `package.json` at publish time:
- No local script
- Version files show stale versions but CI is unaffected
- Cosmetic issue only — contributors see wrong versions in 4 of 5 files

**Pros:** No new code, no new workflow
**Cons:** 4 of 5 files always show wrong version; confusing for contributors

### Option C: GitHub Actions Pre-Release Workflow
Add a `version-bump.yml` workflow triggered on push to main:
- Extracts next version from tag pattern (`v*`)
- Updates all 5 version files automatically
- Creates a PR with version bumps
- Developer merges PR → then tags

**Pros:** Fully automated after tag
**Cons:** Extra PR step, more GitHub Actions complexity to maintain, same 5-file update problem

---

## Recommendation

**Option A (minimal variant)** — reasons:
1. OMC proves the pattern works in production
2. At OMA's scale (~1 maintainer, 1-2 releases/month), manual version editing across 5 files is error-prone and tedious
3. Dropping changelog/release-body generation keeps the script tiny — just version bumps + lockfile
4. The drift is real and visible to contributors (confirmed above)
5. CI remains unchanged — `release.yml` is already correct

---

## Files to Create/Modify

### New files:
- `scripts/release.ts` — the release script (version bump across 5 files, dry-run support, no changelog)

### Modified files:
- `plugins/oma/package.json` — add `"release": "tsx scripts/release.ts"` script

### Unchanged:
- `release.yml` — no changes (CI already handles tag → publish correctly)
- `ci.yml` — no changes
- `CHANGELOG.md` — remains manually maintained

---

## Release Developer Flow (with Option A)

```
# After all changes are merged to main:
npx tsx scripts/release.ts patch    # bumps 5 files, regenerates lockfile
git add -A && git commit -m "chore(release): bump version to v0.1.3"
git push origin main
git tag v0.1.3-alpha.1
git push origin v0.1.3-alpha.1    # CI: build + test + publish
```

**With dry-run (always test first):**
```
npx tsx scripts/release.ts patch --dry-run   # preview changes, no files modified
```

---

## Implementation Steps

### Step 1: Create `scripts/release.ts` at repo root

The script lives at **repo root** `scripts/release.ts`.

```typescript
#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(__dirname, '..');
const PKG_PATH = join(ROOT, 'plugins/oma/package.json');
const OMA_PLUGIN_PATH = join(ROOT, 'plugins/oma/.augment-plugin/plugin.json');
const MARKETPLACE_PATH = join(ROOT, '.claude-plugin/marketplace.json');
const PLUGIN_PATH = join(ROOT, '.claude-plugin/plugin.json');

const c = { reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m' };
const clr = (text: string, code: string) => `${code}${text}${c.reset}`;

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
  const v = pkg.version as string;
  if (!v) { console.error(clr('ERROR: No version field in package.json', c.red)); process.exit(1); }
  return v;
}

function parseVersion(v: string): { major: number; minor: number; patch: number; prerelease: string } {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!m) { console.error(clr(`ERROR: Invalid version: "${v}"`, c.red)); process.exit(1); }
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ?? '' };
}

function bumpVersion(current: string, arg: string): string {
  const { major, minor, patch, prerelease } = parseVersion(current);
  const pre = prerelease ? `-${prerelease}` : '';
  switch (arg) {
    case 'patch': return `${major}.${minor}.${patch + 1}${pre}`;
    case 'minor': return `${major}.${minor + 1}.0${pre}`;
    case 'major': return `${major + 1}.0.0${pre}`;
    default: {
      if (/^\d+\.\d+\.\d+$/.test(arg)) return arg + pre;
      console.error(clr(`ERROR: Invalid argument "${arg}". Use patch, minor, major, or X.Y.Z`, c.red));
      process.exit(1);
    }
  }
}

function replaceVersion(content: string, newVersion: string): string {
  return content.replace(/"version":\s*"[^"]*"/g, `"version": "${newVersion}"`);
}

interface VersionFile { path: string; exists: boolean }
function getFilesToUpdate(newVersion: string): VersionFile[] {
  return [
    { path: PKG_PATH, exists: existsSync(PKG_PATH) },
    { path: OMA_PLUGIN_PATH, exists: existsSync(OMA_PLUGIN_PATH) },
    { path: MARKETPLACE_PATH, exists: existsSync(MARKETPLACE_PATH) },
    { path: PLUGIN_PATH, exists: existsSync(PLUGIN_PATH) },
  ];
}

function updateVersions(newVersion: string, dryRun: boolean): void {
  const files = getFilesToUpdate(newVersion);
  const missing = files.filter(f => !f.exists);
  if (missing.length > 0) {
    missing.forEach(f => console.error(clr(`ERROR: File not found: ${f.path}`, c.red)));
    process.exit(1);
  }
  for (const file of files) {
    const content = readFileSync(file.path, 'utf8');
    const updated = replaceVersion(content, newVersion);
    if (dryRun) {
      if (content !== updated) console.log(clr(`[DRY-RUN] Would update: ${file.path}`, c.yellow));
    } else {
      if (content !== updated) {
        writeFileSync(file.path, updated, 'utf8');
        console.log(clr(`[OK] Updated: ${file.path}`, c.green));
      } else {
        console.log(clr(`[SKIP] Unchanged: ${file.path}`, c.yellow));
      }
    }
  }
  // Regenerate lockfile (always runs, even in dry-run to show intent)
  if (dryRun) {
    console.log(clr('[DRY-RUN] Would regenerate: plugins/oma/package-lock.json', c.yellow));
  } else {
    try {
      execSync('npm install --package-lock-only', { cwd: join(ROOT, 'plugins/oma'), stdio: 'pipe' });
      console.log(clr('[OK] Regenerated: plugins/oma/package-lock.json', c.green));
    } catch (e) {
      console.error(clr('WARN: Failed to regenerate package-lock.json', c.red));
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const bumpArg = args.find(a => !a.startsWith('-'));

  if (!bumpArg) {
    console.error(clr('Usage: tsx scripts/release.ts <patch|minor|major|X.Y.Z> [--dry-run]', c.red));
    process.exit(1);
  }

  const current = getCurrentVersion();
  const newVersion = bumpVersion(current, bumpArg);

  console.log(clr('Release Version Bump', c.reset));
  console.log(`  Current:  ${clr(current, c.yellow)}`);
  console.log(`  New:     ${clr(newVersion, c.green)}`);
  console.log(`  Mode:    ${dryRun ? clr('DRY-RUN (no files will be modified)', c.yellow) : clr('LIVE (files will be updated)', c.green)}`);
  console.log('');

  updateVersions(newVersion, dryRun);
  console.log('');
  if (dryRun) {
    console.log(clr('DRY-RUN complete. Run without --dry-run to apply changes.', c.yellow));
  } else {
    console.log(clr('Version bump complete. Next: git add -A && git commit -m "chore(release): bump version"', c.green));
  }
}

main().catch((err: unknown) => {
  console.error(clr(`ERROR: ${err instanceof Error ? err.message : String(err)}`, c.red));
  process.exit(1);
});
```

### Step 2: Add npm release script + tsx dependency

In `plugins/oma/package.json`:
1. Add `"tsx": "^4.21.0"` to `devDependencies`
2. Add to `scripts`:
```json
"release": "npx tsx ../../scripts/release.ts"
```

### Step 3: Test the script

```bash
# From repo root:
npx tsx scripts/release.ts patch --dry-run          # preview
npx tsx scripts/release.ts patch                     # live bump
git diff -- plugins/oma/package.json plugins/oma/.augment-plugin/plugin.json .claude-plugin/marketplace.json .claude-plugin/plugin.json
git checkout -- .                                    # reset after verification
```

### Step 4: Add unit test

In `plugins/oma/tests/unit/scripts/release.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

function bumpVersion(current: string, arg: string): string {
  const m = current.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!m) return current;
  let major = +m[1], minor = +m[2], patch = +m[3];
  const pre = m[4] ?? '';
  const preStr = pre ? `-${pre}` : '';
  switch (arg) {
    case 'patch': patch++; break;
    case 'minor': minor++; patch = 0; break;
    case 'major': major++; minor = 0; patch = 0; break;
    default: if (/^\d+\.\d+\.\d+$/.test(arg)) return arg + preStr;
  }
  return `${major}.${minor}.${patch}${preStr}`;
}

describe('bumpVersion', () => {
  it('patches normal version', () => {
    expect(bumpVersion('0.1.2', 'patch')).toBe('0.1.3');
  });
  it('keeps pre-release on patch', () => {
    expect(bumpVersion('0.1.2-alpha.1', 'patch')).toBe('0.1.3-alpha.1');
  });
  it('keeps pre-release on minor', () => {
    expect(bumpVersion('0.1.2-alpha.1', 'minor')).toBe('0.2.0-alpha.1');
  });
  it('keeps pre-release on major', () => {
    expect(bumpVersion('0.1.2-alpha.1', 'major')).toBe('1.0.0-alpha.1');
  });
  it('accepts explicit version', () => {
    expect(bumpVersion('0.1.2-alpha.1', '1.0.0')).toBe('1.0.0-alpha.1');
  });
});
```

---

## Acceptance Criteria

- [ ] `scripts/release.ts` runs with `npx tsx scripts/release.ts <patch|minor|major|X.Y.Z> [--dry-run]`
- [ ] `--dry-run` shows what would change without modifying any file
- [ ] All 5 version files are updated on a non-dry-run run
- [ ] `bumpVersion('0.1.2-alpha.1', 'patch')` returns `'0.1.3-alpha.1'`
- [ ] `bumpVersion('0.1.2-alpha.1', 'minor')` returns `'0.2.0-alpha.1'`
- [ ] Lockfile regenerated after version bump (non-dry-run)
- [ ] No changes to `release.yml` or `ci.yml`
- [ ] Unit tests pass: `npm test`
- [ ] Developer can do full release: bump → commit → tag → CI publishes
