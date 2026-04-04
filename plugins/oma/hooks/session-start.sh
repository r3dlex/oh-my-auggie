#!/bin/bash
# session-start.sh -- SessionStart hook: inject OMA context and restore mode
# Auggie invokes this on session start. Output to stdout is injected as context.

set -euo pipefail

OMA_DIR="${OMA_DIR:-.oma}"
STATE_FILE="${OMA_DIR}/state.json"
NOTEPAD_FILE="${OMA_DIR}/notepad.json"

# Detect plugin root (set by Auggie when loading plugin)
PLUGIN_ROOT="${PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"

# ── Session Context ─────────────────────────────────────────────────────────

SESSION_CONTEXT=""

# ── Mode Injection ──────────────────────────────────────────────────────────

if [ -f "$STATE_FILE" ] && [ -s "$STATE_FILE" ]; then
  MODE=$(grep -o '"mode"[[:space:]]*:[[:space:]]*"[^"]*"' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "none")
  ACTIVE=$(grep -o '"active"[[:space:]]*:[[:space:]]*[truefals]*' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*: *//' || echo "false")
  TASK=$(grep -o '"task"[[:space:]]*:[[:space:]]*"[^"]*"' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "")

  if [ "$MODE" != "none" ] && [ "$ACTIVE" = "true" ]; then
    SESSION_CONTEXT="${SESSION_CONTEXT}
[OMA MODE RESTORED] Active mode: ${MODE}. Task: ${TASK}. Use /oma:status to check details. Use /oma:cancel to clear mode."
  fi
else
  MODE="none"
fi

# ── Notepad Injection (Priority) ───────────────────────────────────────────

if [ -f "$NOTEPAD_FILE" ] && [ -s "$NOTEPAD_FILE" ]; then
  PRIORITY=$(grep -A1 '"priority"' "$NOTEPAD_FILE" 2>/dev/null | tail -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "")
  if [ -n "$PRIORITY" ] && [ "$PRIORITY" != "null" ]; then
    SESSION_CONTEXT="${SESSION_CONTEXT}
[OMA NOTEPAD - PRIORITY]
${PRIORITY}"
  fi
fi

# ── Auggie Version Check ────────────────────────────────────────────────────

AUGGIE_VERSION="${AUGGIE_VERSION:-unknown}"
if [ "$AUGGIE_VERSION" != "unknown" ]; then
  SESSION_CONTEXT="${SESSION_CONTEXT}
[OMA] Running on Auggie ${AUGGIE_VERSION}."
fi

# ── Output ─────────────────────────────────────────────────────────────────

if [ -n "$SESSION_CONTEXT" ]; then
  printf '%s\n' "$SESSION_CONTEXT"
fi
