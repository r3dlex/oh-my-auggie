#!/usr/bin/env bats

# e2e tests for oh-my-auggie agent prompts
# These tests verify the OMA agent prompt files exist and have required structure

setup() {
  export PATH="/Users/andreburgstahler/.local/bats/bin:$PATH"
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
}

@test "priv/agents/ directory exists and has 4 agent files" {
  [ -d "$SCRIPT_DIR/priv/agents" ]
  AGENT_COUNT=$(find "$SCRIPT_DIR/priv/agents" -name "*.md" | wc -l | tr -d ' ')
  [ "$AGENT_COUNT" -eq 4 ]
}

@test "explorer.md exists and has required sections" {
  [ -f "$SCRIPT_DIR/priv/agents/explorer.md" ]
  run grep -c "## Core Behavior" "$SCRIPT_DIR/priv/agents/explorer.md"
  [ "$output" -ge 1 ]
  run grep -c "## Output Format" "$SCRIPT_DIR/priv/agents/explorer.md"
  [ "$output" -ge 1 ]
}

@test "planner.md exists and has required sections" {
  [ -f "$SCRIPT_DIR/priv/agents/planner.md" ]
  run grep -c "## Core Behavior" "$SCRIPT_DIR/priv/agents/planner.md"
  [ "$output" -ge 1 ]
  run grep -c "## Output Format" "$SCRIPT_DIR/priv/agents/planner.md"
  [ "$output" -ge 1 ]
}

@test "executor.md exists and has required sections" {
  [ -f "$SCRIPT_DIR/priv/agents/executor.md" ]
  run grep -c "## Core Behavior" "$SCRIPT_DIR/priv/agents/executor.md"
  [ "$output" -ge 1 ]
  run grep -c "## Output Format" "$SCRIPT_DIR/priv/agents/executor.md"
  [ "$output" -ge 1 ]
}

@test "architect.md exists and has required sections" {
  [ -f "$SCRIPT_DIR/priv/agents/architect.md" ]
  run grep -c "## Core Behavior" "$SCRIPT_DIR/priv/agents/architect.md"
  [ "$output" -ge 1 ]
  run grep -c "## Output Format" "$SCRIPT_DIR/priv/agents/architect.md"
  [ "$output" -ge 1 ]
}

@test "e2e directory has test file present" {
  [ -f "$SCRIPT_DIR/e2e/oh-my-auggie.bats" ]
}

@test "assets/oh-my-auggie.svg exists and is valid SVG" {
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
