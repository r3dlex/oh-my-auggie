#!/bin/bash
# adr-enforce.sh -- PreToolUse/commit-msg hook: enforce ADR references for architectural changes
# Exit 0 = allow, Exit 2 = block
#
# Requires enterprise profile active (.oma/config.json with profile: "enterprise")
#
# Patterns that trigger ADR check:
# - New external API integration (detected via URL patterns in changed files)
# - Database schema changes (migration files, schema.*.sql)
# - Authentication/authorization changes (auth*.ts, auth.* files)
# - New service boundaries (interface files, service contracts)
# - Significant refactoring (>20 files affected)

set -euo pipefail

OMA_DIR="${OMA_DIR:-.oma}"
CONFIG_FILE="${OMA_DIR}/config.json"
ADR_DIR="${OMA_DIR}/adr"
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

# ── Helper: check for ADR directory existence ─────────────────────────────────

adr_dir_exists() {
  [ -d "$ADR_DIR" ]
}

# ── Helper: get list of changed files from git ────────────────────────────────

get_changed_files() {
  local changed_files=""
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    changed_files=$(git diff --cached --name-only 2>/dev/null || git diff --name-only 2>/dev/null || echo "")
  fi
  printf '%s' "$changed_files"
}

get_all_changed_files() {
  local changed_files=""
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    changed_files=$(git diff HEAD --name-only 2>/dev/null || echo "")
  fi
  printf '%s' "$changed_files"
}

# ── Helper: check if change requires ADR ────────────────────────────────────

requires_adr() {
  local files="$1"
  local file_count
  file_count=$(printf '%s' "$files" | grep -c . 2>/dev/null || echo "0")

  # Check for external API integration (URL patterns, api-client files)
  if printf '%s' "$files" | grep -qiE '(api[-_]?client|fetch|axios|request|http[-_]?client|rest[-_]?client|graphql[-_]?client)'; then
    return 0
  fi

  # Check for database schema changes
  if printf '%s' "$files" | grep -qiE '(migration|schema|migrate|db[-_]?schema|table[-_]?schema)'; then
    return 0
  fi

  # Check for auth changes
  if printf '%s' "$files" | grep -qiE '(auth|jwt|oauth|passport|session|acl|permission|role)'; then
    return 0
  fi

  # Check for service boundaries / interfaces
  if printf '%s' "$files" | grep -qiE '(interface[-_]?service|service[-_]?contract|port[-_]?adapter|adapter[-_]?pattern)'; then
    return 0
  fi

  # Check for significant refactoring (>20 files)
  if [ "$file_count" -gt 20 ]; then
    return 0
  fi

  return 1
}

# ── Helper: check if ADR reference exists in commit message ─────────────────

has_adr_reference() {
  local commit_msg="$1"
  # Look for ADR reference patterns: ADR-NNN, adr/NNNN-*.md, or Arch decision link
  if printf '%s' "$commit_msg" | grep -qiE '(ADR-[0-9]+|.oma/adr/[0-9]+-|architectural[-_]?decision)'; then
    return 0
  fi
  return 1
}

# ── Helper: check if ADR file exists for this change ────────────────────────

adr_exists_for_change() {
  # Check if there are any ADR files in the directory
  if [ -d "$ADR_DIR" ] && [ -n "$(ls -A "$ADR_DIR" 2>/dev/null)" ]; then
    return 0
  fi
  return 1
}

# ── Main logic ────────────────────────────────────────────────────────────────

main() {
  # Only enforce in enterprise profile
  if ! is_enterprise; then
    exit 0
  fi

  # Only enforce on commit-msg or PreToolUse hooks
  local hook_type="${HOOK_TYPE:-PreToolUse}"

  # Read hook input
  local hook_input
  hook_input=$(cat)

  # Try to extract changed files from various sources
  local changed_files=""
  local commit_msg=""

  # If it's a commit-msg hook, get the commit message
  if [ "$hook_type" = "commit-msg" ]; then
    commit_msg="$hook_input"
  fi

  # Try to get files from git diff
  local staged_files
  staged_files=$(get_changed_files)
  local all_files
  all_files=$(get_all_changed_files)

  # Merge both if available
  if [ -n "$staged_files" ] && [ -n "$all_files" ]; then
    changed_files="${staged_files}"$'\n'"${all_files}"
  elif [ -n "$staged_files" ]; then
    changed_files="$staged_files"
  else
    changed_files="$all_files"
  fi

  # Check if this change requires an ADR
  if ! requires_adr "$changed_files"; then
    # No ADR required for this change
    exit 0
  fi

  # ADR is required — check for reference
  local has_reference=false

  if [ -n "$commit_msg" ]; then
    if has_adr_reference "$commit_msg"; then
      has_reference=true
    fi
  fi

  # Also check if OMA_STATE or hook input contains ADR reference
  if printf '%s' "$hook_input" | grep -qiE '(ADR-[0-9]+|.oma/adr/[0-9]+-)'; then
    has_reference=true
  fi

  # Check if there are any ADRs at all
  if ! adr_exists_for_change; then
    # No ADRs exist yet — this is a new project, allow but warn
    printf '{"decision":"warn","reason":"No ADR files found in .oma/adr/. Consider creating an ADR for architectural decisions.","systemMessage":"OMA: ADR directory is empty. Consider documenting architectural decisions in .oma/adr/."}' >&2
    exit 0
  fi

  if [ "$has_reference" = false ]; then
    printf '{"decision":"block","reason":"Architectural change detected but no ADR reference found. Include ADR-NNN in your commit message or link to .oma/adr/NNNN-*.md","systemMessage":"OMA ADR enforcement: Architectural change requires ADR reference. Add ADR-NNN to commit message or link to .oma/adr/ file."}' >&2
    exit 2
  fi

  exit 0
}

main
