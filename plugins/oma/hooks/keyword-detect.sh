#!/bin/bash
# keyword-detect.sh -- PostToolUse hook: detect keywords that auto-activate modes
# Exit 0 = no keyword detected, Exit 0 with output = keyword found

set -euo pipefail

# Auggie passes hook context via environment and stdin
# stdin: JSON with tool name and arguments (not used, keywords detected from session context)
# PLUGIN_ROOT: set by Auggie to plugin directory

OMA_DIR="${OMA_DIR:-.oma}"
STATE_FILE="${OMA_DIR}/state.json"

# ── Keyword definitions ────────────────────────────────────────────────────────

# Keywords that trigger mode activation
# Format: "keyword|command"
KEYWORDS=(
  "autopilot|/oma:autopilot"
  "ralph|/oma:ralph"
  "don't stop|/oma:ralph"
  "ulw|/oma:ultrawork"
  "ultrawork|/oma:ultrawork"
  "ccg|/oma:ccg"
  "ralplan|/oma:ralplan"
  "deep interview|/oma:interview"
  "deslop|/oma:deslop"
  "anti-slop|/oma:deslop"
  "canceloma|/oma:cancel"
)

# ── Read last user message from history ─────────────────────────────────────

# Auggie provides conversation context via a history file or we can check
# the last assistant message. For PostToolUse, we check the recent context.

# Try to get recent user input from Auggie's session context
LAST_INPUT="${LAST_USER_MESSAGE:-}"

if [ -z "$LAST_INPUT" ]; then
  # Fallback: check if there's a recent messages file
  if [ -f "${OMA_DIR}/messages.json" ]; then
    LAST_INPUT=$(grep -o '"content"[[:space:]]*:[[:space:]]*"[^"]*"' "${OMA_DIR}/messages.json" 2>/dev/null | tail -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "")
  fi
fi

# If still empty, check stdin for any text content
if [ -z "$LAST_INPUT" ]; then
  HOOK_INPUT=$(cat 2>/dev/null || echo "")
  # Extract content from JSON if possible
  LAST_INPUT=$(printf '%s' "$HOOK_INPUT" | grep -o '"content"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | tail -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "")
fi

# ── Keyword detection ─────────────────────────────────────────────────────────

if [ -z "$LAST_INPUT" ]; then
  exit 0
fi

# Lowercase for case-insensitive matching
LOWER_INPUT=$(printf '%s' "$LAST_INPUT" | tr '[:upper:]' '[:lower:]')

for entry in "${KEYWORDS[@]}"; do
  keyword="${entry%|*}"
  command="${entry#*|}"

  if printf '%s' "$LOWER_INPUT" | grep -q "$keyword"; then
    # Keyword found — output activation command
    printf '%s\n' "{
  \"keywordDetected\": \"$keyword\",
  \"suggestedCommand\": \"$command\",
  \"systemMessage\": \"Keyword detected: '$keyword'. Suggesting $command\"
}"
    exit 0
  fi
done

# No keyword found
exit 0
