---
name: oma-update
description: Check for and install OMA updates from GitHub Packages
argument-hint: "[--check] [--force]"
allowed-tools:
  - Read
  - Glob
  - Bash
model: haiku4.5
---

## /oma:update

**Purpose:** Check for newer OMA versions and install upgrades from GitHub Packages.

**Usage:**
- `/oma:update` — Check version, upgrade if newer available
- `/oma:update --check` — Fast check only (current vs latest)
- `/oma:update --force` — Reinstall even on same version

**Examples:**
- `/oma:update`
- `/oma:update --check`
- `/oma:update --force`

---

## How It Works

### Version Check
1. Reads current version from `plugins/oma/package.json`
2. Calls GitHub API for latest release:
   ```
   GET https://api.github.com/repos/r3dlex/oh-my-auggie/releases/latest
   ```
3. Compares current vs latest using semver
4. If `--check` flag: prints current and latest version to stderr, exits 0

### Upgrade
- If newer version found (or `--force`): runs:
  ```bash
  npm install @r3dlex/oh-my-auggie --upgrade
  ```
- Installs from GitHub Packages npm registry (set in `publishConfig.registry`)
- Prints result to stderr

### Output Format
```
--- OMA Update Check ---
Current:  oma@0.1.4
Latest:   oma@0.1.5
Status:   Update available — run /oma:update to upgrade
```

### Caching
- After checking, writes cache to `.oma/update-check.json`:
  ```json
  {
    "currentVersion": "0.1.4",
    "latestVersion": "0.1.5",
    "lastChecked": "2026-04-11T08:00:00Z",
    "updateAvailable": true
  }
  ```
- Cache TTL: 1 hour — subsequent checks within TTL skip API call

### Constraints
- Always exits 0 (hook-safe — never breaks auggie)
- Upgrade requires internet connection
- GitHub rate limit: if API fails, exits 0 silently
- Cache is written to `.oma/update-check.json` (git-ignored)
