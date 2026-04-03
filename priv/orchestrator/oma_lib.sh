#!/usr/bin/env bash
# @requires: auggie jq
# oma_lib.sh — shared helper functions for OMA orchestrator stage scripts

# Strict mode (applied to stage scripts at invocation time via set -Eeuo pipefail in each script):
#   set -E  inherit ERR trap in functions (so traps fire in subshells/functions)
#   set -e  exit immediately when a command exits with a non-zero status
#   set -u  exit immediately when an unbound variable is referenced
#   set -o pipefail  pipeline returns the exit status of the rightmost non-zero command,
#                    or zero if all commands return zero
# Note: stage scripts set this themselves; oma_lib.sh itself does NOT set it
# to avoid ERR-trap interference with || compound-list error handling.

# Detect auggie binary path
oma_detect_auggie() {
  if [ -x "/opt/homebrew/bin/auggie" ]; then
    echo "/opt/homebrew/bin/auggie"
  elif [ -x "/usr/local/bin/auggie" ]; then
    echo "/usr/local/bin/auggie"
  elif command -v auggie >/dev/null 2>&1; then
    command -v auggie
  else
    return 1
  fi
}

# oma_try_auggie(prompt, [debug_level])
#   debug_level 0 (default): silent — discard stderr, stdout only
#   debug_level 1:           capture stderr to temp file, show only on error
#   debug_level 2:           capture stderr to temp file, always show
# Returns: stdout on success; empty + exit 1 on failure
oma_try_auggie() {
  local prompt="$1"
  local debug_level="${2:-${OMA_DEBUG:-0}}"

  local auggie_path
  auggie_path=$(oma_detect_auggie) || {
    echo "ERROR: auggie not found in PATH or known locations" >&2
    return 10
  }

  local tmp_stderr
  tmp_stderr="$(mktemp -u)"
  # Clean up temp file on function exit (both normal and error paths)
  trap "rm -f '$tmp_stderr'" RETURN

  local auggie_status
  if [ "$debug_level" -eq 0 ]; then
    "$auggie_path" "$prompt" 2>/dev/null
    auggie_status=$?
  elif [ "$debug_level" -eq 1 ]; then
    "$auggie_path" "$prompt" 2>"$tmp_stderr"
    auggie_status=$?
    if [ $auggie_status -ne 0 ]; then
      echo "auggie stderr:" >&2
      cat "$tmp_stderr" >&2
    fi
  else
    # debug_level 2 — always show stderr
    "$auggie_path" "$prompt" 2>"$tmp_stderr"
    auggie_status=$?
    if [ -s "$tmp_stderr" ]; then
      echo "auggie stderr:" >&2
      cat "$tmp_stderr" >&2
    fi
  fi

  return $auggie_status
}

# oma_parse_json(output, fallback)
#   Parses JSON from output; returns parsed value on success, fallback on failure.
#   Guard against literal null: jq -e 'if . == null then empty else . end' fails
#   on null, triggering fallback path with PARSE_ERROR annotation.
oma_parse_json() {
  local output="$1"
  local fallback="${2:-}"
  local parsed
  parsed=$(echo "$output" | jq -e 'if . == null then empty else . end' 2>/dev/null)
  if [ -n "$parsed" ]; then
    echo "$parsed"
  else
    echo "PARSE_ERROR: LLM output was not valid JSON or was null" >&2
    echo "RAW_OUTPUT_START" >&2
    # Strip ANSI escape sequences before echoing LLM output to stderr
    echo "$output" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' >&2
    echo "RAW_OUTPUT_END" >&2
    echo "$fallback"
  fi
}
