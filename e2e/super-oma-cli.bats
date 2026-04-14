#!/usr/bin/env bats
# e2e/super-oma-cli.bats — combined super-oma degraded/session/UI e2e tests

SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"

setup() {
  MOCK_DIR="$(mktemp -d)"
  TEST_DIR="$(mktemp -d)"
  REAL_WHICH="$(command -v which)"

  cat > "$MOCK_DIR/which" <<MOCK
#!/bin/sh
if [ "$1" = "tmux" ]; then
  exit 1
fi
exec "$REAL_WHICH" "$@"
MOCK
  chmod +x "$MOCK_DIR/which"

  chmod +x "$SCRIPT_DIR/bin/super-oma" 2>/dev/null || true

  mkdir -p "$TEST_DIR/.oma/team/worker-1" "$TEST_DIR/.oma/events" "$TEST_DIR/.oma/sessions/session-123"
  cat > "$TEST_DIR/.oma/state.json" <<'JSON'
{"mode":"ralplan","active":true,"task_description":"Establish verification baseline","iteration":2,"max_iterations":5}
JSON
  cat > "$TEST_DIR/.oma/team/worker-1/status.json" <<'JSON'
{"status":"running","pid":12345}
JSON
  printf '%s\n' 'rendering hud' 'waiting on verifier' > "$TEST_DIR/.oma/team/worker-1/log.txt"

  cat > "$TEST_DIR/.oma/sessions/session-123/session.json" <<'JSON'
{"id":"session-123","session_id":"session-123","tmux_session_name":"super-oma-main","started_at":"2026-04-14T00:00:00.000Z","health":"managed","cwd":"/repo"}
JSON
  cat > "$TEST_DIR/.oma/sessions/session-123/topology.json" <<'JSON'
{"tmux_session_name":"super-oma-main","health":"managed","layout":"leader+hud+optional-inspector","leader_pane_id":"%1","hud_pane_id":"%2","inspector_pane_id":"%3"}
JSON
  cat > "$TEST_DIR/.oma/sessions/session-123/panes.json" <<'JSON'
{"schema_version":"1","panes":[{"role":"leader","pane_id":"%1","status":"attached","command":"auggie"},{"role":"hud","pane_id":"%2","status":"running","command":"super-oma hud --watch"},{"role":"inspector","pane_id":"%3","status":"running","command":"super-oma sessions inspect --watch"}],"updated_at":"2026-04-14T00:00:00.000Z"}
JSON
  cat > "$TEST_DIR/.oma/events/session-123.jsonl" <<'JSONL'
{"ts":"2026-04-14T00:01:00.000Z","seq":1,"kind":"session_started","source":"super-oma","message":"topology created"}
{"ts":"2026-04-14T00:02:00.000Z","seq":2,"kind":"tool_finished","source":"hook","tool_name":"apply_patch","message":"HUD updated"}
JSONL

  echo "$TEST_DIR" > /tmp/super_oma_test_dir.txt
  echo "$MOCK_DIR" > /tmp/super_oma_mock_dir.txt
}

teardown() {
  local td md
  td="$(cat /tmp/super_oma_test_dir.txt 2>/dev/null)" || return
  md="$(cat /tmp/super_oma_mock_dir.txt 2>/dev/null)" || return
  rm -f /tmp/super_oma_test_dir.txt /tmp/super_oma_mock_dir.txt \
        /tmp/super_oma_status.json /tmp/super_oma_doctor.json \
        /tmp/super_oma_events.json /tmp/super_oma_sessions.json \
        /tmp/super_oma_inspect.json /tmp/super_oma_commands.json
  rm -rf "$td" "$md"
}

run_super_oma() {
  local td="$(cat /tmp/super_oma_test_dir.txt)"
  local md="$(cat /tmp/super_oma_mock_dir.txt)"
  PATH="$md:$PATH" OMA_DIR="$td/.oma" run node "$SCRIPT_DIR/cli/super-oma.mjs" "$@"
}

run_super_bin() {
  local td="$(cat /tmp/super_oma_test_dir.txt)"
  local md="$(cat /tmp/super_oma_mock_dir.txt)"
  PATH="$md:$PATH" OMA_DIR="$td/.oma" run "$SCRIPT_DIR/bin/super-oma" "$@"
}

@test "super-oma: --help prints usage summary" {
  run_super_oma --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"super-oma up"* ]]
  [[ "$output" == *"super-oma statusline"* ]]
  [[ "$output" == *"super-oma sessions inspect"* ]]
}

@test "bin/super-oma: delegates to cli entrypoint" {
  run_super_bin --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"super-oma doctor"* ]]
}

@test "super-oma hud: renders HUD" {
  run_super_oma hud
  [ "$status" -eq 0 ]
  [[ "$output" == *"SUPER OMA HUD"* ]]
  [[ "$output" == *"Establish verification baseline"* ]]
}

@test "super-oma statusline: renders compact session summary" {
  run_super_oma statusline
  [ "$status" -eq 0 ]
  [[ "$output" == *"super-oma | health="* ]]
}

@test "super-oma sessions list --json: shows recorded session" {
  run_super_oma sessions list --json
  [ "$status" -eq 0 ]
  printf '%s' "$output" > /tmp/super_oma_sessions.json
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('/tmp/super_oma_sessions.json','utf8')); if(!p.ok)process.exit(1); if(!Array.isArray(p.sessions)||p.sessions.length<1)process.exit(1);"
}

@test "super-oma sessions inspect --json: shows recorded session" {
  run_super_oma sessions inspect session-123 --json
  [ "$status" -eq 0 ]
  printf '%s' "$output" > /tmp/super_oma_inspect.json
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('/tmp/super_oma_inspect.json','utf8')); if(!p.ok)process.exit(1); if(p.session_id!=='session-123')process.exit(1);"
}

@test "super-oma up: degraded mode writes session metadata when tmux is unavailable" {
  run_super_oma up --session baseline
  [ "$status" -eq 1 ]
  [[ "$output" == *"tmux not found"* || "$error" == *"tmux not found"* ]]
  test -f "$(cat /tmp/super_oma_test_dir.txt)/.oma/sessions/baseline/session.json"
}

@test "super-oma status --json: reports degraded baseline" {
  run_super_oma up --session baseline >/dev/null 2>&1
  run_super_oma status --json --session baseline
  [ "$status" -eq 0 ]
  printf '%s' "$output" > /tmp/super_oma_status.json
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('/tmp/super_oma_status.json','utf8')); if(!p.ok)process.exit(1); if(p.health!=='degraded')process.exit(1);"
}

@test "super-oma doctor --json: reports readiness" {
  run_super_oma up --session baseline >/dev/null 2>&1
  run_super_oma doctor --json --session baseline
  [ "$status" -eq 0 ]
  printf '%s' "$output" > /tmp/super_oma_doctor.json
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('/tmp/super_oma_doctor.json','utf8')); if(!p.ok)process.exit(1);"
}

@test "super-oma events tail --json: returns events" {
  run_super_oma events tail --json --session session-123 --lines 10
  [ "$status" -eq 0 ]
  printf '%s' "$output" > /tmp/super_oma_events.json
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('/tmp/super_oma_events.json','utf8')); if(!p.ok)process.exit(1); if(!Array.isArray(p.events)||p.events.length<1)process.exit(1);"
}

@test "super-oma commands list --json: returns manifest commands" {
  run_super_oma commands list --json
  [ "$status" -eq 0 ]
  printf '%s' "$output" > /tmp/super_oma_commands.json
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('/tmp/super_oma_commands.json','utf8')); if(!Array.isArray(p.commands)||p.commands.length<10)process.exit(1);"
}

@test "super-oma run: resolves OMA commands" {
  run_super_oma run ralph continue phase 2
  [ "$status" -eq 0 ]
  [ "$output" = "/oma:ralph continue phase 2" ]
}
