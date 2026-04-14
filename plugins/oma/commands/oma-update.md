---
name: update
description: Check for and install OMA updates from GitHub Packages
argument-hint: "[--check] [--force]"
allowed-tools:
  - Read
  - Glob
  - Bash
model: haiku4.5
---

[EXECUTING /oma:update — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

You are executing `/oma:update`. Follow these steps now.

Parse the arguments passed to this command:
- `--check` → version check only, no install
- `--force` → reinstall even if already on latest

---

## Step 1 — Read current version

```bash
node -e "const p = require('./plugins/oma/package.json'); console.log(p.version)" 2>/dev/null \
  || node -e "const p = require('${AUGMENT_PLUGIN_ROOT}/package.json'); console.log(p.version)" 2>/dev/null \
  || cat plugins/oma/package.json | grep '"version"' | head -1
```

Store the result as CURRENT_VERSION (e.g. `0.3.1`).

---

## Step 2 — Check cache (skip API if fresh)

```bash
CACHE_FILE=".oma/update-check.json"
if [ -f "$CACHE_FILE" ]; then
  LAST_CHECKED=$(node -e "const c=require('./$CACHE_FILE'); console.log(c.lastChecked||'')" 2>/dev/null)
  CACHED_LATEST=$(node -e "const c=require('./$CACHE_FILE'); console.log(c.latestVersion||'')" 2>/dev/null)
  NOW_TS=$(date +%s)
  CACHE_TS=$(node -e "console.log(Math.floor(new Date('$LAST_CHECKED').getTime()/1000)||0)" 2>/dev/null)
  AGE=$(( NOW_TS - CACHE_TS ))
  # Cache is valid for 1 hour (3600 seconds)
  if [ "$AGE" -lt 3600 ] && [ -n "$CACHED_LATEST" ]; then
    LATEST_VERSION="$CACHED_LATEST"
    echo "Using cached version info (age: ${AGE}s)"
  fi
fi
```

If LATEST_VERSION is set from cache, skip Step 3.

---

## Step 3 — Fetch latest version from GitHub API

```bash
LATEST_VERSION=$(curl -fsSL \
  "https://api.github.com/repos/r3dlex/oh-my-auggie/releases/latest" \
  2>/dev/null | node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try { const j=JSON.parse(d); console.log(j.tag_name.replace(/^v/,'')); }
      catch { process.exit(1); }
    });
  " 2>/dev/null)

if [ -z "$LATEST_VERSION" ]; then
  echo "--- OMA Update Check ---"
  echo "Could not reach GitHub API. Check your internet connection."
  exit 0
fi
```

---

## Step 4 — Write cache

```bash
mkdir -p .oma
node -e "
  const fs = require('fs');
  const cache = {
    currentVersion: '$CURRENT_VERSION',
    latestVersion: '$LATEST_VERSION',
    lastChecked: new Date().toISOString(),
    updateAvailable: '$LATEST_VERSION' !== '$CURRENT_VERSION'
  };
  fs.writeFileSync('.oma/update-check.json', JSON.stringify(cache, null, 2));
" 2>/dev/null || true
```

---

## Step 5 — Print version comparison

```
--- OMA Update Check ---
Current:  oma@CURRENT_VERSION
Latest:   oma@LATEST_VERSION
Status:   [see below]
```

- If CURRENT_VERSION == LATEST_VERSION and no `--force`: print `Already on latest.` and exit 0.
- If CURRENT_VERSION != LATEST_VERSION: print `Update available — installing...` and continue to Step 6.
- If `--force`: print `Force reinstall requested — installing oma@LATEST_VERSION...` and continue to Step 6.
- If `--check` flag: print status above and **exit 0 without installing**.

---

## Step 6 — Install update

Run the following to upgrade:

```bash
npm install -g @r3dlex/oh-my-auggie@latest 2>&1 \
  || npm install @r3dlex/oh-my-auggie@latest 2>&1
```

If the install fails with a registry error, suggest the user check that GitHub Packages access is configured.

Print result to the user. Always exit 0 — this is a hook-safe command that must never break auggie.

---

## Constraints

- Always exit 0, even on failure
- Never write to files outside `.oma/`
- If any step fails silently, continue to the next step
