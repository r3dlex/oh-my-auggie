#!/usr/bin/env bats
# e2e/super-oma-cli.bats — super-oma UI lane integration tests

SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"

setup() {
  TEST_DIR="$(mktemp -d)"
  echo "$TEST_DIR" > /tmp/super_oma_test_dir.txt
  mkdir -p "$TEST_DIR/.oma"
  cat > "$TEST_DIR/.oma/state.json" <<'JSON'
{
  "mode": "ralph",
  "iteration": 2,
  "max_iterations": 5,
  "task_description": "Implement HUD lane"
}
JSON

  mkdir -p "$TEST_DIR/.oma/team/worker-1"
  cat > "$TEST_DIR/.oma/team/worker-1/status.json" <<'JSON'
{
  "status": "running",
  "pid": 12345
}
JSON
  printf '%s\n' 'rendering hud' 'waiting on verifier' > "$TEST_DIR/.oma/team/worker-1/log.txt"

  chmod +x "$SCRIPT_DIR/cli/super-oma.mjs" 2>/dev/null || true
  chmod +x "$SCRIPT_DIR/bin/super-oma" 2>/dev/null || true
}

teardown() {
  local td
  td="$(cat /tmp/super_oma_test_dir.txt 2>/dev/null)" || return
  rm -f /tmp/super_oma_test_dir.txt
  rm -rf "$td"
}

run_super_oma() {
  local td
  td="$(cat /tmp/super_oma_test_dir.txt)"
  OMA_DIR="$td/.oma" run node "$SCRIPT_DIR/cli/super-oma.mjs" "$@"
}

write_session_fixture() {
  local td session_dir
  td="$(cat /tmp/super_oma_test_dir.txt)"
  session_dir="$td/.oma/sessions/session-123"
  mkdir -p "$session_dir" "$td/.oma/events"

  cat > "$session_dir/session.json" <<'JSON'
{
  "id": "session-123",
  "tmux_session_name": "super-oma-main",
  "started_at": "2026-04-14T00:00:00.000Z",
  "health": "managed",
  "cwd": "/repo"
}
JSON

  cat > "$session_dir/topology.json" <<'JSON'
{
  "tmux_session_name": "super-oma-main",
  "health": "managed",
  "layout": "leader+hud+inspector"
}
JSON

  cat > "$session_dir/panes.json" <<'JSON'
[
  {"role":"leader","pane_id":"%1","status":"attached","command":"auggie"},
  {"role":"hud","pane_id":"%2","status":"running","command":"super-oma hud --watch"},
  {"role":"inspector","pane_id":"%3","status":"running","command":"super-oma sessions inspect --watch"}
]
JSON

  cat > "$td/.oma/events/session-123.jsonl" <<'JSONL'
{"ts":"2026-04-14T00:01:00.000Z","seq":1,"kind":"session_started","source":"super-oma","message":"topology created"}
{"ts":"2026-04-14T00:02:00.000Z","seq":2,"kind":"tool_finished","source":"hook","tool_name":"apply_patch","message":"HUD updated"}
JSONL
}

@test "super-oma: --help prints usage summary" {
  run_super_oma --help
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'super-oma hud'
  printf '%s\n' "$output" | grep -q 'super-oma statusline'
  printf '%s\n' "$output" | grep -q 'super-oma sessions inspect'
}

@test "bin/super-oma: delegates to cli entrypoint" {
  local td
  td="$(cat /tmp/super_oma_test_dir.txt)"
  OMA_DIR="$td/.oma" run "$SCRIPT_DIR/bin/super-oma" --help
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'super-oma sessions list'
}

@test "super-oma hud: renders degraded state-only HUD" {
  run_super_oma hud
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'SUPER OMA HUD'
  printf '%s\n' "$output" | grep -q 'Session: state-only'
  printf '%s\n' "$output" | grep -q 'rendering hud'
}

@test "super-oma statusline: renders compact session summary" {
  run_super_oma statusline
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'super-oma'
  printf '%s\n' "$output" | grep -q 'mode=ralph'
  printf '%s\n' "$output" | grep -q 'session=state-only'
}

@test "super-oma sessions list: shows recorded sessions" {
  write_session_fixture
  run_super_oma sessions list
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'session-123'
  printf '%s\n' "$output" | grep -q 'tmux=super-oma-main'
}

@test "super-oma sessions inspect: shows panes and recent activity" {
  write_session_fixture
  run_super_oma sessions inspect session-123
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'SESSION session-123'
  printf '%s\n' "$output" | grep -q 'leader (%1)'
  printf '%s\n' "$output" | grep -q 'tool_finished'
}

@test "super-oma hud --watch: exits cleanly on SIGINT" {
  write_session_fixture
  local td
  td="$(cat /tmp/super_oma_test_dir.txt)"
  OMA_DIR="$td/.oma" run bash -c 'node "$1" hud --watch --session session-123 &
pid=$!
sleep 2
kill -INT $pid 2>/dev/null
wait $pid 2>/dev/null
echo "exit=$?"' _ "$SCRIPT_DIR/cli/super-oma.mjs"
  [ "$status" -eq 0 ]
  printf '%s\n' "$output" | grep -q 'exit=0'
}
