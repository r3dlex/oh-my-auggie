#!/bin/bash
# delegation-enforce.sh -- PreToolUse hook: block file edits when orchestration mode is active
# Exit 0 = allow, Exit 2 = block

set -euo pipefail

# Auggie passes hook context via environment and stdin
# stdin: JSON with tool name and arguments
# PLUGIN_ROOT: set by Auggie to plugin directory

OMA_DIR="${OMA_DIR:-.oma}"
STATE_FILE="${OMA_DIR}/state.json"

# ── Read hook payload from stdin ─────────────────────────────────────────────

HOOK_INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$HOOK_INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "")

# ── Delegation enforcement: block file edits when mode is active ─────────────

if [ -z "$TOOL_NAME" ]; then
  # Could not parse tool name -- allow by default
  exit 0
fi

# Check if the tool is a file-modifying tool
case "$TOOL_NAME" in
  Edit|Write|remove_files|str-replace-editor|save-file)
    # Check if orchestration mode is active
    if [ -f "$STATE_FILE" ] && [ -s "$STATE_FILE" ]; then
      MODE=$(grep -o '"mode"[[:space:]]*:[[:space:]]*"[^"]*"' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "none")
      ACTIVE=$(grep -o '"active"[[:space:]]*:[[:space:]]*[truefals]*' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*: *//' || echo "false")

      if [ "$MODE" != "none" ] && [ "$ACTIVE" = "true" ]; then
        # Block -- orchestration mode is active
        # Return JSON decision + exit 2
        printf '%s\n' '{
  "decision": "block",
  "reason": "OMA orchestration mode ('"$MODE"') is active. Direct file edits are blocked. Use oma-executor agent for all code changes.",
  "systemMessage": "Delegation enforcement: orchestration mode is active. Spawn oma-executor via Task tool for code changes."
}'
        exit 2
      fi
    fi
    ;;
esac

# Allow the tool
exit 0
