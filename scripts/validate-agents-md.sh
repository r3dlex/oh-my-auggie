#!/usr/bin/env bash
# validate-agents-md.sh — Validates AGENTS.md completeness and count consistency
# Usage: bash scripts/validate-agents-md.sh [--verbose]
# Exit 0: all checks pass. Exit 1: mismatches found.
# CI-ready: no interactive prompts, clean exit codes.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERBOSE="${1:-}"
ERRORS=0

pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; ERRORS=$((ERRORS + 1)); }
header() { echo ""; echo "=== $1 ==="; }

# --- Check 1: Total AGENTS.md count ---
header "AGENTS.md file count"
EXPECTED_COUNT=18
ACTUAL_COUNT=$(find "$REPO_ROOT" -name "AGENTS.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/coverage/*" \
  -not -path "*/.omc/*" \
  -not -path "*/.oma/*" | wc -l | tr -d ' ')

if [ "$ACTUAL_COUNT" -eq "$EXPECTED_COUNT" ]; then
  pass "Total AGENTS.md count: $ACTUAL_COUNT (expected $EXPECTED_COUNT)"
else
  fail "Total AGENTS.md count: $ACTUAL_COUNT (expected $EXPECTED_COUNT)"
  if [ -n "$VERBOSE" ]; then
    find "$REPO_ROOT" -name "AGENTS.md" \
      -not -path "*/node_modules/*" \
      -not -path "*/dist/*" \
      -not -path "*/coverage/*"
  fi
fi

# --- Check 2: Directory file counts ---
header "Directory file counts"

check_count() {
  local dir="$1" pattern="$2" expected="$3" label="$4"
  local actual
  actual=$(find "$dir" -maxdepth 1 -name "$pattern" | wc -l | tr -d ' ')
  if [ "$actual" -eq "$expected" ]; then
    pass "$label: $actual (expected $expected)"
  else
    fail "$label: $actual (expected $expected)"
  fi
}

# Subtract AGENTS.md itself
AGENTS_MD_IN_AGENTS=$(find "$REPO_ROOT/plugins/oma/agents" -maxdepth 1 -name "AGENTS.md" | wc -l | tr -d ' ')
AGENT_FILES=$(( $(find "$REPO_ROOT/plugins/oma/agents" -maxdepth 1 -name "*.md" | wc -l | tr -d ' ') - AGENTS_MD_IN_AGENTS ))
if [ "$AGENT_FILES" -eq 19 ]; then
  pass "agents/ agent definition files: $AGENT_FILES (expected 19)"
else
  fail "agents/ agent definition files: $AGENT_FILES (expected 19)"
fi

CMD_FILES=$(find "$REPO_ROOT/plugins/oma/commands" -maxdepth 1 -name "*.md" | wc -l | tr -d ' ')
AGENTS_IN_CMDS=$(find "$REPO_ROOT/plugins/oma/commands" -maxdepth 1 -name "AGENTS.md" | wc -l | tr -d ' ')
CMD_COUNT=$(( CMD_FILES - AGENTS_IN_CMDS ))
if [ "$CMD_COUNT" -eq 44 ]; then
  pass "commands/ command files: $CMD_COUNT (expected 44)"
else
  fail "commands/ command files: $CMD_COUNT (expected 44)"
fi

SKILL_DIRS=$(find "$REPO_ROOT/plugins/oma/skills" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
if [ "$SKILL_DIRS" -eq 36 ]; then
  pass "skills/ subdirectories: $SKILL_DIRS (expected 36)"
else
  fail "skills/ subdirectories: $SKILL_DIRS (expected 36)"
fi

# --- Check 3: Parent link resolution ---
header "Parent link resolution"

while IFS= read -r agents_file; do
  parent_line=$(grep -m1 "<!-- Parent:" "$agents_file" 2>/dev/null || true)
  if [ -z "$parent_line" ]; then
    # Root AGENTS.md has no parent — skip
    continue
  fi
  parent_path=$(echo "$parent_line" | sed 's/.*<!-- Parent: \(.*\) -->.*/\1/')
  dir_of_file=$(dirname "$agents_file")
  resolved="$dir_of_file/$parent_path"
  if [ -f "$resolved" ]; then
    pass "Parent resolves: $agents_file → $resolved"
  else
    fail "Broken parent link: $agents_file → $resolved (not found)"
  fi
done < <(find "$REPO_ROOT" -name "AGENTS.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/coverage/*" \
  -not -path "*/.omc/*" \
  -not -path "*/.oma/*")

# --- Check 4: Generated timestamp present ---
header "Generated timestamps"

while IFS= read -r agents_file; do
  if grep -q "<!-- Generated:" "$agents_file" 2>/dev/null; then
    pass "Has timestamp: $agents_file"
  else
    fail "Missing timestamp: $agents_file"
  fi
done < <(find "$REPO_ROOT" -name "AGENTS.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/coverage/*" \
  -not -path "*/.omc/*" \
  -not -path "*/.oma/*")

# --- Summary ---
echo ""
echo "================================="
if [ "$ERRORS" -eq 0 ]; then
  echo "✓ All checks passed"
  exit 0
else
  echo "✗ $ERRORS check(s) failed"
  exit 1
fi
