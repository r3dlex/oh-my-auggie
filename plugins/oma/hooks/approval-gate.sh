#!/bin/bash
# approval-gate.sh -- PreToolUse hook: require approval for sensitive paths
# Exit 0 = allow, Exit 2 = block
#
# Requires enterprise profile active (.oma/config.json with profile: "enterprise")
#
# Sensitive path patterns and required approvals:
# - src/**/auth*.ts         → Security review required
# - **/config*              → DevOps approval required
# - **/migration*          → DBA approval required
# - **/secrets*            → Security + DevOps dual approval required
#
# Approval is tracked via .oma/approvals.json

set -euo pipefail

OMA_DIR="${OMA_DIR:-.oma}"
CONFIG_FILE="${OMA_DIR}/config.json"
APPROVALS_FILE="${OMA_DIR}/approvals.json"
STATE_FILE="${OMA_DIR}/state.json"

# ── Helper: check if enterprise profile is active ─────────────────────────────

is_enterprise() {
  if [ ! -f "$CONFIG_FILE" ]; then
    return 1
  fi
  local profile
  profile=$(grep -o '"profile"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "community")
  [ "$profile" = "enterprise" ]
}

# ── Helper: check if approvals.json exists and is valid ─────────────────────

approvals_file_valid() {
  [ -f "$APPROVALS_FILE" ] && [ -s "$APPROVALS_FILE" ]
}

# ── Helper: extract file path from tool input ────────────────────────────────

extract_file_path() {
  local tool_input="$1"
  # Try to extract file_path or path from the input
  local file_path
  file_path=$(printf '%s' "$tool_input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "")

  if [ -z "$file_path" ]; then
    file_path=$(printf '%s' "$tool_input" | grep -o '"path"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "")
  fi

  if [ -z "$file_path" ]; then
    file_path=$(printf '%s' "$tool_input" | grep -o '"filePath"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "")
  fi

  printf '%s' "$file_path"
}

# ── Helper: determine required approval type for a file ─────────────────────

get_required_approval() {
  local file_path="$1"

  # Check patterns in order of specificity
  case "$file_path" in
    *secrets*|*secret*)
      printf "Security+DevOps"
      ;;
    *auth*.ts|auth*)
      printf "Security"
      ;;
    *config*|*/config*)
      printf "DevOps"
      ;;
    *migration*|*/migration*|*migrate*)
      printf "DBA"
      ;;
    *)
      printf ""
      ;;
  esac
}

# ── Helper: check if valid approval exists ──────────────────────────────────

has_valid_approval() {
  local file_path="$1"
  local required_approval="$2"

  if ! approvals_file_valid; then
    return 1
  fi

  # Parse approvals.json and check for matching approval
  # Format: { "approvals": [{ "path": "pattern", "type": "type", "expires": "ISO date" }] }
  local approvals_json
  approvals_json=$(cat "$APPROVALS_FILE" 2>/dev/null || echo '{}')

  # Simple grep-based check for approval existence
  # Look for the file path pattern in approvals
  if ! printf '%s' "$approvals_json" | grep -qi "\"path\""; then
    return 1
  fi

  # Check if there's a non-expired approval for this file or pattern
  local now
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s 2>/dev/null || echo "")

  # For now, check if any approval exists for matching path patterns
  # A full implementation would parse JSON and check expiry
  case "$required_approval" in
    Security+DevOps)
      # Require both Security and DevOps approvals
      if printf '%s' "$approvals_json" | grep -qi '"type".*Security' && \
         printf '%s' "$approvals_json" | grep -qi '"type".*DevOps'; then
        return 0
      fi
      ;;
    Security|DevOps|DBA)
      if printf '%s' "$approvals_json" | grep -qi "\"type\".*${required_approval}"; then
        return 0
      fi
      ;;
  esac

  return 1
}

# ── Helper: get list of changed files ──────────────────────────────────────

get_tool_files() {
  local tool_input="$1"
  # Extract multiple file paths if present (for multi-file operations)
  printf '%s' "$tool_input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | sed 's/.*: *"\([^"]*\)"/\1/' || echo ""
}

# ── Main logic ────────────────────────────────────────────────────────────────

main() {
  # Only enforce in enterprise profile
  if ! is_enterprise; then
    exit 0
  fi

  # Read hook payload from stdin
  local hook_input
  hook_input=$(cat)

  # Extract tool name
  local tool_name
  tool_name=$(printf '%s' "$hook_input" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | sed 's/.*: *"\([^"]*\)"/\1/' || echo "")

  # Only check file-modifying tools
  case "$tool_name" in
    Edit|Write|remove_files|str-replace-editor|save-file|Bash)
      ;;
    *)
      exit 0
      ;;
  esac

  # Extract tool input (everything except tool_name)
  local tool_input
  tool_input=$(printf '%s' "$hook_input" | sed 's/"tool_name"[[:space:]]*:[[:space:]]*"[^"]*",*//' | sed 's/,"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"//' || printf '%s' "$hook_input")

  # Get file path(s) from tool input
  local file_paths
  file_paths=$(extract_file_path "$tool_input")

  if [ -z "$file_paths" ]; then
    # No file path found — allow by default (might be non-file operation)
    exit 0
  fi

  # Check each file path
  while IFS= read -r file_path; do
    [ -z "$file_path" ] && continue

    local required_approval
    required_approval=$(get_required_approval "$file_path")

    if [ -z "$required_approval" ]; then
      continue
    fi

    if ! has_valid_approval "$file_path" "$required_approval"; then
      local approval_desc="$required_approval"
      [ "$required_approval" = "Security+DevOps" ] && approval_desc="Security and DevOps"

      printf '{"decision":"block","reason":"Change to %s requires %s approval. No valid approval found in .oma/approvals.json","systemMessage":"OMA approval gate: %s path requires %s approval. Record approval in .oma/approvals.json"}' \
        "$file_path" "$approval_desc" "$file_path" "$approval_desc" >&2
      exit 2
    fi
  done <<< "$file_paths"

  exit 0
}

main
