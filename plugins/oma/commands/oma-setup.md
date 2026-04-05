---
name: oma-setup
description: Install or refresh OMA — set up plugin, hooks, agents, and skills
argument-hint: "[options]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

## /oma:setup

**Purpose:** Install or refresh the OMA plugin, hooks, agents, and skills.

**Usage:**
- `/oma:setup` — Interactive setup
- `/oma:setup --fresh` — Force fresh install
- `/oma:setup --verify` — Verify without changes
- `/oma:setup --update` — Update to latest version

**Examples:**
- `/oma:setup`
- `/oma:setup --fresh`
- `/oma:setup --verify`

---

## What Setup Does

### Phase 1: CLAUDE.md Setup

**Step 1 — Ask scope:**
```
OMA needs a CLAUDE.md file. Install locally (project .claude/CLAUDE.md) or globally (~/.claude/CLAUDE.md)?
```
- If a project .claude/CLAUDE.md already exists, offer to skip or overwrite.
- If neither exists, default to global.

**Step 2 — Back up existing:**
```bash
# Local backup
[ -f "$PROJECT_DIR/.claude/CLAUDE.md" ] && cp "$PROJECT_DIR/.claude/CLAUDE.md" "$PROJECT_DIR/.claude/CLAUDE.md.bak-$(date +%Y%m%d%H%M%S)"

# Global backup
[ -f "$HOME/.claude/CLAUDE.md" ] && cp "$HOME/.claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md.bak-$(date +%Y%m%d%H%M%S)"
```

**Step 3 — Download latest from OMA repository:**
```bash
# Detect OS for temp path
TEMP_DIR="$(mktemp -d)"
OMA_REPO_URL="https://raw.githubusercontent.com/r3dlex/oh-my-auggie/main"

# Fetch latest CLAUDE.md
curl -fsSL "$OMA_REPO_URL/CLAUDE.md" -o "$TEMP_DIR/CLAUDE.md"

# Install to local path
CLAUDE_DIR="$PROJECT_DIR/.claude"
[ ! -d "$CLAUDE_DIR" ] && mkdir -p "$CLAUDE_DIR"
cp "$TEMP_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"

# Install to global path
[ ! -d "$HOME/.claude" ] && mkdir -p "$HOME/.claude"
cp "$TEMP_DIR/CLAUDE.md" "$HOME/.claude/CLAUDE.md"

rm -rf "$TEMP_DIR"
```

**Step 4 — Configure .git/info/exclude for local installs (git repos only):**
```bash
EXCLUDE_FILE="$PROJECT_DIR/.git/info/exclude"
[ -f "$EXCLUDE_FILE" ] && {
  grep -q "^.omc/" "$EXCLUDE_FILE" || echo ".omc/" >> "$EXCLUDE_FILE"
  grep -q "^.oma/" "$EXCLUDE_FILE" || echo ".oma/" >> "$EXCLUDE_FILE"
}
```

---

### Phase 2: Environment Configuration

**Step 1 — HUD Statusline Setup:**

```bash
# Create HUD wrapper script
HUD_WRAPPER="$HOME/.claude/hud-wrapper.sh"
cat > "$HUD_WRAPPER" << 'WRAPPER'
#!/usr/bin/env bash
# HUD statusline wrapper — injects OMA mode info into auggie prompt
CURRENT_MODE="$(cat "$HOME/.oma/state.json" 2>/dev/null | grep -o '"mode":"[^"]*"' | cut -d'"' -f4)"
CURRENT_ITER="$(cat "$HOME/.oma/state.json" 2>/dev/null | grep -o '"iteration":[0-9]*' | cut -d':' -f2)"
if [ -n "$CURRENT_MODE" ] && [ "$CURRENT_MODE" != "null" ]; then
  echo "[oma:$CURRENT_MODE"
  [ -n "$CURRENT_ITER" ] && [ "$CURRENT_ITER" != "null" ] && echo ":$CURRENT_ITER]"
else
  echo "[]"
fi
WRAPPER
chmod +x "$HUD_WRAPPER"
```

Add statusLine to auggie settings.json (platform-specific):
```bash
SETTINGS_FILE="$HOME/.auggie/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
  # Merge statusLine config into existing settings
  node -e "
    const fs = require('fs');
    const s = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
    s.statusLine = { right: '$HOME/.claude/hud-wrapper.sh' };
    fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(s, null, 2));
  "
else
  mkdir -p "$(dirname "$SETTINGS_FILE")"
  node -e "
    const fs = require('fs');
    const s = { statusLine: { right: '$HOME/.claude/hud-wrapper.sh' } };
    fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(s, null, 2));
  "
fi
```

**Step 2 — Clear stale plugin cache:**
```bash
OMA_PLUGIN_DIR="$HOME/.auggie/plugins/oma"
[ -d "$OMA_PLUGIN_DIR" ] && {
  # Identify old cached versions (directories that are not 'current' or 'latest')
  find "$OMA_PLUGIN_DIR" -maxdepth 1 -type d ! -name 'oma' ! -name 'plugins' ! -name '.' ! -name '..' | while read -r D; do
    echo "Removing stale cache: $D"
    rm -rf "$D"
  done
  echo "Stale cache cleared. Keeping latest installation."
}
```

**Step 3 — Check for updates:**
```bash
# Check npm for latest OMA version
NPM_LATEST="$(npm view oh-my-auggie version 2>/dev/null || echo '')"
CURRENT_VERSION="$(node -e "const p = require('$HOME/.auggie/plugins/oma/package.json'); console.log(p.version)" 2>/dev/null || echo 'unknown')"

if [ -n "$NPM_LATEST" ] && [ "$NPM_LATEST" != "$CURRENT_VERSION" ]; then
  echo "UPDATE AVAILABLE: oh-my-auggie@$NPM_LATEST (you have $CURRENT_VERSION)"
  echo "Run '/oma:setup --update' to upgrade."
else
  echo "oh-my-auggie@$CURRENT_VERSION is up to date."
fi
```

---

### Phase 3: Integration Setup

**Step 1 — Verify plugin installation:**
```bash
PLUGIN_ROOT="$HOME/.auggie/plugins/oma"
REQUIRED_FILES=(
  "$PLUGIN_ROOT/.augment-plugin/plugin.json"
  "$PLUGIN_ROOT/hooks/hooks.json"
  "$PLUGIN_ROOT/mcp/state-server.mjs"
  "$PLUGIN_ROOT/agents/oma-executor.md"
)

for F in "${REQUIRED_FILES[@]}"; do
  if [ -f "$F" ]; then
    echo "[OK] $(basename "$F")"
  else
    echo "[MISSING] $F"
  fi
done
```

**Step 2 — MCP server configuration:**
Offer to invoke the mcp-setup skill for context7, exa, and github MCP servers:
```
OMA can configure MCP servers for enhanced capabilities:
  - context7   — codebase context search
  - exa       — web search
  - github    — GitHub API integration

Run /oma:mcp-setup to configure MCP servers.
```

```bash
# If user accepts, invoke mcp-setup skill
# oma:mcp-setup handles: context7.json, exa.json, github.json writing to ~/.claude/mcp/
```

**Step 3 — EXA API key:**
```
OMA uses EXA for web search. Enter your EXA_API_KEY (from https://exa.ai):
```
```bash
if [ -n "$EXA_API_KEY" ]; then
  CONFIG_FILE="$PROJECT_DIR/.oma/config.json"
  mkdir -p "$(dirname "$CONFIG_FILE")"
  # Merge EXA key into config (preserve existing keys)
  node -e "
    const fs = require('fs');
    let c = {};
    try { c = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8')); } catch(e) {}
    c.exaApiKey = '$EXA_API_KEY';
    fs.writeFileSync('$CONFIG_FILE', JSON.stringify(c, null, 2));
  "
  echo "EXA API key saved to $CONFIG_FILE"
fi
```

**Step 4 — Agent Teams configuration:**
```
OMA supports Claude Code agent teams (experimental).
Enable by setting allowAgentTeams: true in auggie settings?
```
```bash
SETTINGS_FILE="$HOME/.auggie/settings.json"
node -e "
  const fs = require('fs');
  let s = {};
  try { s = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8')); } catch(e) {}
  s.allowAgentTeams = true;
  fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(s, null, 2));
"
echo "allowAgentTeams enabled in $SETTINGS_FILE"
```

---

### Phase 4: Completion

**Step 1 — Welcome message:**
```
=== oh-my-auggie Setup Complete ===

OMA is a multi-agent orchestration layer for Auggie. Key behaviors:

  Magic Keywords:
    /oma:autopilot  — Full automated implementation loop
    /oma:ralph      — Read-only exploration mode
    /oma:ultrawork  — Parallel multi-agent implementation
    /oma:ultraqa    — Parallel multi-agent testing
    /oma:ralplan    — Plan-only mode (read-only)
    /oma:team       — Spawn multiple specialized agents

  Automatic Behaviors:
    - Delegation enforcement: Edit/Write blocked when orchestration mode active
    - State persistence: Active mode survives session restarts
    - HUD display: OMA status shown in every session start
    - Notepad: Priority context loaded automatically on session start
```

**Step 2 — Verify all 7 hooks are registered:**
```bash
HOOKS_JSON="$HOME/.auggie/plugins/oma/hooks/hooks.json"
EXPECTED_HOOKS=(
  "session-start"
  "delegation-enforce"
  "stop-gate"
  "approval-gate"
  "adr-enforce"
  "cost-track"
  "keyword-detect"
)

echo "Hook registration check:"
for HOOK in "${EXPECTED_HOOKS[@]}"; do
  if grep -q "\"$HOOK\"" "$HOOKS_JSON" 2>/dev/null; then
    echo "  [OK] $HOOK"
  else
    echo "  [MISSING] $HOOK"
  fi
done
echo "Hook verification complete."
```

---

### Phase 5: Skill Index

- Build skill index from `skills/` directory
- Register trigger keywords
- Validate skill format

---

### Phase 6: HUD Auto-Enable
- Write `hud-active: true` to `.oma/state.json`
- This causes the session-start hook to auto-display the HUD on next session load

---

## Options

| Option | Description |
|--------|-------------|
| `--fresh` | Delete existing config and reinstall |
| `--verify` | Check installation without changes |
| `--update` | Pull latest from registry |
| `--minimal` | Install core only, skip optional |
| `--resume` | Resume interrupted setup from previous state |

---

## Constraints

- Back up existing config before `--fresh`
- Some steps require confirmation
- Rollback on failure if possible
- After successful setup, `hud-active: true` is written to `.oma/state.json` so the HUD auto-displays on next session start
