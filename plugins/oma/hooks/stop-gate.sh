#!/bin/bash
# stop-gate.sh -- Stop hook: block agent completion when ralph mode active without architect PASS
# Exit 0 = allow stop, Exit 2 = block stop

set -euo pipefail

OMA_DIR="${OMA_DIR:-.oma}"
STATE_FILE="${OMA_DIR}/state.json"
TASK_LOG="${OMA_DIR}/task.log.json"

# ── Check if ralph mode is active ─────────────────────────────────────────

if [ ! -f "$STATE_FILE" ] || [ ! -s "$STATE_FILE" ]; then
  # No state -- allow stop
  printf '%s\n' '{}'
  exit 0
fi

MODE=$(grep -o '"mode"[[:space:]]*:[[:space:]]*"[^"]*"' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "none")
ACTIVE=$(grep -o '"active"[[:space:]]*:[[:space:]]*[truefals]*' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*: *//' || echo "false")

if [ "$MODE" != "ralph" ] || [ "$ACTIVE" != "true" ]; then
  # Not ralph mode -- allow stop
  printf '%s\n' '{}'
  exit 0
fi

# ── Ralph mode active: check for architect PASS verdict ─────────────────────

if [ -f "$TASK_LOG" ] && [ -s "$TASK_LOG" ]; then
  # Find most recent architect entry with PASS status
  LAST_ARCHITECT=$(grep '"agent":"oma-architect"' "$TASK_LOG" 2>/dev/null | tail -1 || echo "")
  if [ -n "$LAST_ARCHITECT" ] && printf '%s' "$LAST_ARCHITECT" | grep -q '"status":"PASS"'; then
    # Architect approved -- allow stop
    printf '%s\n' '{}'
    exit 0
  fi
fi

# ── Block stop: ralph mode without architect PASS ──────────────────────────

ITERATION=$(grep -o '"iteration"[[:space:]]*:[[:space:]]*[0-9]*' "$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*: *//' || echo "unknown")

printf '%s\n' '{
  "decision": "block",
  "reason": "Ralph mode is active and oma-architect has not returned PASS verdict. Cannot stop until verification is complete.",
  "systemMessage": "Stop blocked: ralph mode active (iteration '"$ITERATION"'). Wait for oma-architect verification or run /oma:cancel to force-stop."
}'
exit 2
