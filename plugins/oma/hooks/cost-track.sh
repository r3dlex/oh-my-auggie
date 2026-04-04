#!/bin/bash
# cost-track.sh -- PostToolUse/session-end hook: track model usage and cost per session
# Exit 0 = allow (always), Exit 2 = block (never used)
#
# Tracks: model used, token counts, estimated cost, duration
# Logs to: .oma/cost-log.json
#
# Can run as:
#   - PostToolUse: pass MODEL_NAME and TOKEN_USAGE via environment or stdin
#   - SessionEnd: aggregate and finalize session cost

set -euo pipefail

OMA_DIR="${OMA_DIR:-.oma}"
COST_LOG_FILE="${OMA_DIR}/cost-log.json"
SESSION_ID="${SESSION_ID:-$(date -u +%Y%m%dT%H%M%S)}-$$"

# ── Helper: ensure cost log file exists ─────────────────────────────────────

ensure_cost_log() {
  if [ ! -f "$COST_LOG_FILE" ]; then
    printf '{"sessions":[],"version":"0.1"}' > "$COST_LOG_FILE"
  fi
}

# ── Helper: read cost log ────────────────────────────────────────────────────

read_cost_log() {
  ensure_cost_log
  if [ -s "$COST_LOG_FILE" ]; then
    cat "$COST_LOG_FILE"
  else
    printf '{"sessions":[],"version":"0.1"}'
  fi
}

# ── Helper: write cost log ──────────────────────────────────────────────────

write_cost_log() {
  local json="$1"
  printf '%s' "$json" > "$COST_LOG_FILE"
}

# ── Helper: get or create current session entry ─────────────────────────────

get_or_create_session() {
  local sessions_json="$1"

  # Check if session already exists
  if printf '%s' "$sessions_json" | grep -qi "\"id\".*\"${SESSION_ID}\""; then
    printf '%s' "$sessions_json"
    return
  fi

  # Add new session entry
  local new_session
  new_session=$(printf '{"id":"%s","start_time":"%s","tools":[],"total_tokens":0,"estimated_cost_usd":0}' \
    "$SESSION_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")")

  # Append to sessions array
  if printf '%s' "$sessions_json" | grep -q '"sessions"'; then
    # Use sed to add session to existing sessions array
    printf '%s' "$sessions_json" | sed 's/\("sessions"\)/\1\n    - '"$new_session"'/' 2>/dev/null || \
    printf '{"sessions":[%s],"version":"0.1"}' "$new_session"
  else
    printf '{"sessions":[%s],"version":"0.1"}' "$new_session"
  fi
}

# ── Helper: estimate cost from token usage ─────────────────────────────────
#
# Pricing (approximate, per 1M tokens):
# - Claude Opus: $15 input, $75 output
# - Claude Sonnet: $3 input, $15 output
# - Claude Haiku: $0.25 input, $1.25 output

estimate_cost() {
  local model="${1:-sonnet}"
  local input_tokens="${2:-0}"
  local output_tokens="${3:-0}"

  local input_rate=3
  local output_rate=15

  case "$model" in
    opus)
      input_rate=15
      output_rate=75
      ;;
    sonnet)
      input_rate=3
      output_rate=15
      ;;
    haiku)
      input_rate=0.25
      output_rate=1.25
      ;;
    4o|4o-mini|gpt-4o|gpt-4o-mini)
      input_rate=2.5
      output_rate=10
      ;;
    *)
      input_rate=3
      output_rate=15
      ;;
  esac

  # Calculate cost in USD
  local input_cost
  local output_cost
  input_cost=$(printf '%s %s' "$input_tokens" "$input_rate" | awk '{printf "%.6f", $1 * $2 / 1000000}')
  output_cost=$(printf '%s %s' "$output_tokens" "$output_rate" | awk '{printf "%.6f", $1 * $2 / 1000000}')

  printf '%s' "$(printf '%s %s' "$input_cost" "$output_cost" | awk '{printf "%.6f", $1 + $2}')"
}

# ── Helper: update session with tool usage ──────────────────────────────────

update_session_tools() {
  local sessions_json="$1"
  local tool_name="$2"
  local model="$3"
  local input_tokens="$4"
  local output_tokens="$5"
  local duration_ms="$6"

  # This is a simplified implementation
  # In practice, you'd parse JSON properly and update the specific session

  # For now, just log the tool call to stderr (visible in debug output)
  printf '[cost-track] session=%s tool=%s model=%s tokens=%s/%s duration=%sms\n' \
    "$SESSION_ID" "$tool_name" "$model" "$input_tokens" "$output_tokens" "$duration_ms" >&2

  printf '%s' "$sessions_json"
}

# ── Main: record tool usage ──────────────────────────────────────────────────

record_tool_usage() {
  local tool_name="${1:-unknown}"
  local model="${2:-unknown}"
  local input_tokens="${3:-0}"
  local output_tokens="${4:-0}"
  local duration_ms="${5:-0}"

  ensure_cost_log

  local cost_log
  cost_log=$(read_cost_log)

  # Update session with tool usage
  cost_log=$(update_session_tools "$cost_log" "$tool_name" "$model" "$input_tokens" "$output_tokens" "$duration_ms")

  # Recalculate session totals (simplified)
  local total_tokens=$((input_tokens + output_tokens))
  local estimated_cost
  estimated_cost=$(estimate_cost "$model" "$input_tokens" "$output_tokens")

  printf '[cost-track] Token usage: %s+%s=%s, Estimated cost: $%s\n' \
    "$input_tokens" "$output_tokens" "$total_tokens" "$estimated_cost" >&2
}

# ── Main: print session summary ─────────────────────────────────────────────

print_summary() {
  ensure_cost_log

  local cost_log
  cost_log=$(read_cost_log)

  # Extract current session info
  local session_info
  session_info=$(printf '%s' "$cost_log" | grep -o "\"id\":\"${SESSION_ID}\"[^{}]*{[^}]*}" 2>/dev/null || echo "")

  if [ -n "$session_info" ]; then
    printf 'OMA Cost Summary for session %s:\n%s\n' "$SESSION_ID" "$session_info" >&2
  fi
}

# ── Main logic ───────────────────────────────────────────────────────────────

main() {
  local hook_type="${HOOK_TYPE:-PostToolUse}"

  # Read hook input if available
  local hook_input=""
  if [ ! -t 0 ]; then
    hook_input=$(cat 2>/dev/null || echo "")
  fi

  case "$hook_type" in
    PostToolUse)
      # Extract tool info from environment or input
      local tool_name="${OMA_TOOL_NAME:-unknown}"
      local model="${OMA_MODEL:-unknown}"
      local input_tokens="${OMA_INPUT_TOKENS:-0}"
      local output_tokens="${OMA_OUTPUT_TOKENS:-0}"
      local duration_ms="${OMA_DURATION_MS:-0}"

      # Try to parse from hook input if environment vars not set
      if [ "$tool_name" = "unknown" ] && [ -n "$hook_input" ]; then
        tool_name=$(printf '%s' "$hook_input" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "unknown")
        model=$(printf '%s' "$hook_input" | grep -o '"model"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "unknown")
        input_tokens=$(printf '%s' "$hook_input" | grep -o '"input_tokens"[[:space:]]*:[[:space:]]*[0-9]*' 2>/dev/null | head -1 | sed 's/.*: *//' || echo "0")
        output_tokens=$(printf '%s' "$hook_input" | grep -o '"output_tokens"[[:space:]]*:[[:space:]]*[0-9]*' 2>/dev/null | head -1 | sed 's/.*: *//' || echo "0")
        duration_ms=$(printf '%s' "$hook_input" | grep -o '"duration_ms"[[:space:]]*:[[:space:]]*[0-9]*' 2>/dev/null | head -1 | sed 's/.*: *//' || echo "0")
      fi

      record_tool_usage "$tool_name" "$model" "$input_tokens" "$output_tokens" "$duration_ms"
      ;;

    SessionEnd|session-end)
      print_summary
      ;;

    *)
      # Default: try to record what we can
      if [ -n "$hook_input" ]; then
        local tool_name
        tool_name=$(printf '%s' "$hook_input" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "unknown")
        record_tool_usage "$tool_name" "unknown" "0" "0" "0"
      fi
      ;;
  esac

  exit 0
}

main
