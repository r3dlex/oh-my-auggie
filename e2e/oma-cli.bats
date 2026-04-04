#!/usr/bin/env bats
# e2e/oma-cli.bats — OMA CLI Companion e2e tests
# Tests: oma team, oma hud, oma doctor
# Mock claude-code in $PATH so tests run without real Claude Code.

SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"

# ── Per-test setup/teardown ─────────────────────────────────────────────────
# setup/teardown run in subshells so state is shared via files, not variables.

setup() {
  MOCK_DIR="$(mktemp -d)"
  chmod +x "$MOCK_DIR"
  printf '#!/bin/sh\necho "[mock-worker] done"\nexit 0\n' > "$MOCK_DIR/claude-code"
  chmod +x "$MOCK_DIR/claude-code"

  # Ensure cli/oma.mjs is executable (may have been restored from git)
  chmod +x "$SCRIPT_DIR/cli/oma.mjs" 2>/dev/null || true

  TEST_DIR="$(mktemp -d)"
  # Write to well-known file so test body (separate process) can read it
  echo "$TEST_DIR" > /tmp/oma_test_dir.txt
  echo "$MOCK_DIR" > /tmp/oma_mock_dir.txt
  mkdir -p "$TEST_DIR/.oma"
  echo '{}' > "$TEST_DIR/.oma/state.json"
}

teardown() {
  local td md
  td="$(cat /tmp/oma_test_dir.txt 2>/dev/null)" || return
  md="$(cat /tmp/oma_mock_dir.txt 2>/dev/null)" || return

  # Kill any running worker processes (read PIDs from status.json files)
  if [ -d "$td/.oma/team" ]; then
    for wdir in "$td/.oma/team"/worker-*; do
      [ -d "$wdir" ] || continue
      local stfile="$wdir/status.json"
      if [ -f "$stfile" ]; then
        local pid
        pid="$(node -e "
          const fs=require('fs');
          try{const d=JSON.parse(fs.readFileSync('$stfile','utf8'));console.log(d.pid||'')}catch(e){console.log('')}
        " 2>/dev/null)"
        if [ -n "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null; then
          kill -0 "$pid" 2>/dev/null && kill "$pid" 2>/dev/null
        fi
      fi
    done
  fi

  # Clean up temp files and directories
  rm -f /tmp/oma_test_dir.txt /tmp/oma_mock_dir.txt \
        /tmp/oma_out.txt /tmp/oma_status_json.txt /tmp/oma_doctor_json.txt
  rm -rf "$td" "$md"
}

bats_require_test_helpers() { return 0; }

# ── Helpers (read from files so they're valid in test body) ────────────────

run_oma() {
  local td="$(cat /tmp/oma_test_dir.txt)"
  local md="$(cat /tmp/oma_mock_dir.txt)"
  PATH="$md:$PATH" OMA_DIR="$td/.oma" \
    run node "$SCRIPT_DIR/cli/oma.mjs" "$@"
  # Brief sleep so detached worker has time to write its files
  sleep 0.5
}

worker_dir() {
  local td="$(cat /tmp/oma_test_dir.txt)"
  echo "$td/.oma/team/worker-$1"
}

# ── oma --help ────────────────────────────────────────────────────────────

@test "oma: --help prints usage summary" {
  run_oma --help
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'oma team'
  printf '%s\n' "$output" | grep -q 'oma hud'
  printf '%s\n' "$output" | grep -q 'oma doctor'
}

@test "bin/oma: --help is executable and lists subcommands" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  local md="$(cat /tmp/oma_mock_dir.txt)"
  PATH="$md:$PATH" OMA_DIR="$td/.oma" \
    run "$SCRIPT_DIR/bin/oma" --help
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'oma team'
  printf '%s\n' "$output" | grep -q 'oma hud'
  printf '%s\n' "$output" | grep -q 'oma doctor'
}

# ── oma team spawn ─────────────────────────────────────────────────────────

@test "oma team: spawn creates worker directories" {
  run_oma team 2 "echo test"
  [ "$status" -eq 0 ]
  [ -d "$(worker_dir 1)" ]
  [ -d "$(worker_dir 2)" ]
}

@test "oma team: spawn creates meta.json per worker" {
  run_oma team 1 "echo hello"
  [ "$status" -eq 0 ]
  # Worker runs detached — give it a moment to write meta.json
  sleep 0.5
  test -f "$(worker_dir 1)/meta.json"
  grep -q '"id":' "$(worker_dir 1)/meta.json"
  grep -q '"parent_pid"' "$(worker_dir 1)/meta.json"
  grep -q '"spawned_at"' "$(worker_dir 1)/meta.json"
}

@test "oma team: spawn creates status.json per worker" {
  run_oma team 1 "echo hello"
  [ "$status" -eq 0 ]
  cat "$(worker_dir 1)/status.json" | grep -q '"status"'
  cat "$(worker_dir 1)/status.json" | grep -q '"pid"'
}

@test "oma team: spawn exits 2 when N is not a positive integer" {
  run_oma team spawn abc "echo test"
  [ "$status" -eq 2 ]
  printf '%s\n' "$output" | grep -q 'N must be a positive integer'
}

@test "oma team: spawn exits 2 when task string is missing" {
  run_oma team 2
  [ "$status" -eq 2 ]
  printf '%s\n' "$output" | grep -q 'task string required'
}

# ── oma team status ────────────────────────────────────────────────────────

@test "oma team status: exits 0 with no team directory" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  rm -rf "$td/.oma/team"
  run_oma team status
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'no active team'
}

@test "oma team status: shows workers after spawn" {
  run_oma team 2 "echo test"
  [ "$status" -eq 0 ]
  run_oma team status
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'worker-1'
  printf '%s\n' "$output" | grep -q 'worker-2'
}

@test "oma team status --json: returns valid JSON" {
  run_oma team 1 "echo test"
  [ "$status" -eq 0 ]
  # Write to temp file to avoid run subshell issues
  local td="$(cat /tmp/oma_test_dir.txt)"
  local md="$(cat /tmp/oma_mock_dir.txt)"
  PATH="$md:$PATH" OMA_DIR="$td/.oma" \
    node "$SCRIPT_DIR/cli/oma.mjs" team status --json > /tmp/oma_status_json.txt 2>&1
  node -e "
    const fs=require('fs');
    const d=JSON.parse(fs.readFileSync('/tmp/oma_status_json.txt','utf8'));
    if(!d.ok) process.exit(1);
    if(!Array.isArray(d.workers)) process.exit(1);
  "
  [ "$status" -eq 0 ]
}

@test "oma team status --json: workers array contains expected fields" {
  run_oma team 1 "echo test"
  [ "$status" -eq 0 ]
  run_oma team status --json
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q '"id"'
  printf '%s\n' "$output" | grep -q '"status"'
  printf '%s\n' "$output" | grep -q '"pid"'
}

# ── oma team shutdown ─────────────────────────────────────────────────────

@test "oma team shutdown: removes worker directories" {
  run_oma team 2 "echo test"
  [ "$status" -eq 0 ]
  run_oma team shutdown
  [ "$status" -eq 0 ]
  # Team dir or workers should be gone
  local td="$(cat /tmp/oma_test_dir.txt)"
  [ ! -d "$td/.oma/team" ] || ! ls "$td/.oma/team/worker-1" 2>/dev/null
}

@test "oma team shutdown: exits 0 with no team directory" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  rm -rf "$td/.oma/team"
  run_oma team shutdown
  [ "$status" -eq 0 ]
}

# ── oma hud ────────────────────────────────────────────────────────────────

@test "oma hud: renders ANSI box and exits 0" {
  run_oma hud
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'OMA HUD'
}

@test "oma hud: exits 0 when state.json missing (graceful degradation)" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  rm -f "$td/.oma/state.json"
  run_oma hud
  [ "$status" -eq 0 ]
}

# ── oma hud --watch ───────────────────────────────────────────────────────

@test "oma hud --watch: starts and exits on SIGINT with code 0" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  local md="$(cat /tmp/oma_mock_dir.txt)"
  PATH="$md:$PATH" OMA_DIR="$td/.oma" \
    run bash -c 'node "$1" hud --watch &
  OMA_PID=$!
  sleep 2
  kill -INT $OMA_PID 2>/dev/null
  wait $OMA_PID 2>/dev/null
  echo "exit=$?"' _ "$SCRIPT_DIR/cli/oma.mjs"
  [ "$status" -eq 0 ]
}

# ── oma doctor ─────────────────────────────────────────────────────────────

@test "oma doctor: exits 2 with no state file (missing = critical error)" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  rm -f "$td/.oma/state.json"
  run_oma doctor
  # missing state.json is an error (severity=error) → exit 2
  [ "$status" -eq 2 ]
}

@test "oma doctor: reports state when state.json exists" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  echo '{"mode":"ralph","active":true,"iteration":2}' > "$td/.oma/state.json"
  run_oma doctor
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'ralph'
}

@test "oma doctor --json: returns valid JSON" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  local md="$(cat /tmp/oma_mock_dir.txt)"
  PATH="$md:$PATH" OMA_DIR="$td/.oma" \
    node "$SCRIPT_DIR/cli/oma.mjs" doctor --json > /tmp/oma_doctor_json.txt 2>&1
  local doctor_exit=$?
  node -e "const fs=require('fs');JSON.parse(fs.readFileSync('/tmp/oma_doctor_json.txt','utf8'));"
  [ "$doctor_exit" -eq 0 ]
}

@test "oma doctor --json: includes oma_dir and state fields" {
  run_oma doctor --json
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q '"oma_dir"'
  printf '%s\n' "$output" | grep -q '"state_exists"'
  printf '%s\n' "$output" | grep -q '"workers"'
}

# ── oma doctor --install ─────────────────────────────────────────────────

@test "oma doctor --install: validates plugin manifests" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  local md="$(cat /tmp/oma_mock_dir.txt)"
  PATH="$md:$PATH" OMA_DIR="$td/.oma" \
    run "$SCRIPT_DIR/cli/oma.mjs" doctor --install
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'plugin.json'
  printf '%s\n' "$output" | grep -q 'hooks'
}

# ── MCP server tools ─────────────────────────────────────────────────────

@test "MCP: tools/list includes oma_team_status" {
  response="$(printf '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n' | node "$SCRIPT_DIR/plugins/oma/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q 'oma_team_status'
}

@test "MCP: tools/list includes oma_team_stream" {
  response="$(printf '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n' | node "$SCRIPT_DIR/plugins/oma/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q 'oma_team_stream'
}

@test "MCP: oma_team_status returns valid JSON with ok field" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  response="$(printf '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"oma_team_status","arguments":{}}}\n' | OMA_DIR="$td/.oma" node "$SCRIPT_DIR/plugins/oma/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q '"ok":true'
  printf '%s\n' "$response" | grep -q '"workers"'
}

@test "MCP: oma_team_stream returns valid JSON with ok field" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  response="$(printf '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"oma_team_stream","arguments":{}}}\n' | OMA_DIR="$td/.oma" node "$SCRIPT_DIR/plugins/oma/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q '"ok":true'
  printf '%s\n' "$response" | grep -q '"streams"'
}

# ── Edge cases ───────────────────────────────────────────────────────────

@test "oma: unknown command exits 2" {
  run_oma unknown-cmd
  [ "$status" -eq 2 ]
}

@test "oma: unknown flag exits 2" {
  run_oma --badflag
  [ "$status" -eq 2 ]
}

@test "oma team status: works with empty team directory" {
  local td="$(cat /tmp/oma_test_dir.txt)"
  mkdir -p "$td/.oma/team"
  run_oma team status
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'no active workers'
}
