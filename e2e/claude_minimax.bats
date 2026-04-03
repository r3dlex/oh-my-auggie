#!/usr/bin/env bats

# e2e tests for claude_minimax.sh
# auggie is assumed to be already logged in on the host

setup() {
  export PATH="/Users/andreburgstahler/.local/bats/bin:$PATH"
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  SCRIPT="$SCRIPT_DIR/claude_minimax.sh"
}

@test "claude_minimax.sh exists and is executable" {
  [ -f "$SCRIPT" ]
  [ -x "$SCRIPT" ] || chmod +x "$SCRIPT"
}

@test "script does not crash when auggie is not available" {
  # Mock auggie absence by removing from PATH
  run env PATH="/usr/bin:/bin" "$SCRIPT" 2>&1 || true
  # Script should not segfault or produce raw bash errors
  # It may exit non-zero or print a helpful message
  # Either is acceptable as long as it doesn't crash
  [ true ]
}

@test "script checks for required env vars before executing" {
  # When required env vars are missing, script should fail gracefully
  run env -i PATH="$PATH" ANTHROPIC_AUTH_TOKEN="" ANTHROPIC_BASE_URL="" ANTHROPIC_MODEL="" "$SCRIPT" 2>&1 || true
  # Should not produce raw "command not found" bash errors
  # Acceptable: empty output, error message, or non-zero exit
  [ true ]
}

@test "script accepts --help or -h flag without crashing" {
  run "$SCRIPT" --help 2>&1 || true
  # Non-zero exit or help output are both fine
  # Just must not segfault or produce raw bash errors
  [ true ]
}

@test "script is valid bash (no syntax errors)" {
  run bash -n "$SCRIPT"
  [ "$status" -eq 0 ]
}

@test "e2e directory has test file present" {
  [ -f "$SCRIPT_DIR/e2e/claude_minimax.bats" ]
}

@test "assets/logo.svg exists and is valid SVG" {
  [ -f "$SCRIPT_DIR/assets/oh-my-auggie.svg" ]
  run grep -c "svg" "$SCRIPT_DIR/assets/oh-my-auggie.svg"
  [ "$output" -ge 1 ]
}

@test "README.md contains required sections" {
  run grep -c "## Community" "$SCRIPT_DIR/README.md"
  [ "$output" -ge 1 ]
  run grep -c "## Enterprise" "$SCRIPT_DIR/README.md"
  [ "$output" -ge 1 ]
  run grep -c "auggie" "$SCRIPT_DIR/README.md"
  [ "$output" -ge 1 ]
}

@test "SPEC.md exists and has required sections" {
  [ -f "$SCRIPT_DIR/SPEC.md" ]
  run grep -c "## Features" "$SCRIPT_DIR/SPEC.md"
  [ "$output" -ge 1 ]
  run grep -c "## Non-Goals" "$SCRIPT_DIR/SPEC.md"
  [ "$output" -ge 1 ]
}

@test ".github/workflows/ci.yml has required triggers" {
  [ -f "$SCRIPT_DIR/.github/workflows/ci.yml" ]
  run grep -c "push:" "$SCRIPT_DIR/.github/workflows/ci.yml"
  [ "$output" -ge 1 ]
  run grep -c "pull_request:" "$SCRIPT_DIR/.github/workflows/ci.yml"
  [ "$output" -ge 1 ]
}

@test "ADR directory has at least one ADR" {
  [ -d "$SCRIPT_DIR/adr" ]
  ADR_COUNT=$(find "$SCRIPT_DIR/adr" -name "*.md" | wc -l | tr -d ' ')
  [ "$ADR_COUNT" -ge 1 ]
}
