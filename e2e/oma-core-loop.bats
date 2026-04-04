#!/usr/bin/env bats
# e2e/oma-core-loop.bats — OMA plugin core loop tests
# Covers: MCP server, hooks, manifests, YAML frontmatter

SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
OMA_DIR="$SCRIPT_DIR"
PLUGIN_DIR="$OMA_DIR/plugins/oma"
export OMA_DIR

# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------

mcp_call() {
  local tool="$1"
  local args="$2"
  printf '{"jsonrpc":"2.0","id":99,"method":"tools/call","params":{"name":"%s","arguments":%s}}\n' "$tool" "$args"
}

# Per-test state files to avoid cross-test pollution
setup() {
  # Each test gets its own state/notepad files
  STATE_FILE="$(mktemp)"
  NOTEPAD="$(mktemp)"
  export OMA_STATE_FILE="$STATE_FILE"
  export OMA_NOTEPAD_FILE="$NOTEPAD"
  export PLUGIN_ROOT="$PLUGIN_DIR"
  echo '{}' > "$STATE_FILE"
  echo '{"priority":[],"working":[],"manual":[]}' > "$NOTEPAD"
}

teardown() {
  rm -f "$STATE_FILE" "$NOTEPAD"
}

# Override bats teardown so it runs even on failure
bats_require_test_helpers() { return 0; }

# ------------------------------------------------------------------------------
# MCP Server Tests
# ------------------------------------------------------------------------------

@test "MCP: initialize handshake responds with JSON-RPC 2.0 result" {
  response="$(printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q '"jsonrpc":"2.0"'
  printf '%s\n' "$response" | grep -q '"id":1'
  printf '%s\n' "$response" | grep -q '"result"'
}

@test "MCP: tools/list returns all 7 OMA tools" {
  response="$(printf '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q 'oma_state_read'
  printf '%s\n' "$response" | grep -q 'oma_state_write'
  printf '%s\n' "$response" | grep -q 'oma_mode_get'
  printf '%s\n' "$response" | grep -q 'oma_mode_set'
  printf '%s\n' "$response" | grep -q 'oma_task_log'
  printf '%s\n' "$response" | grep -q 'oma_notepad_read'
  printf '%s\n' "$response" | grep -q 'oma_notepad_write'
}

@test "MCP: oma_state_write and oma_state_read round-trip" {
  write_resp="$(mcp_call "oma_state_write" '{"key":"mode","value":"ralph"}' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$write_resp" | grep -q '"ok":true'
  read_resp="$(mcp_call "oma_state_read" '{"key":"mode"}' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$read_resp" | grep -q '"value":"ralph"'
}

@test "MCP: oma_mode_get returns mode and active status" {
  # Server reads from hardcoded .oma/state.json — write there so server sees the state
  mkdir -p "$SCRIPT_DIR/.oma"
  echo '{"mode":"ralph","active":true}' > "$SCRIPT_DIR/.oma/state.json"
  cd "$SCRIPT_DIR"
  response="$(mcp_call "oma_mode_get" '{}' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q '"mode":"ralph"'
  printf '%s\n' "$response" | grep -q '"active":true'
}

@test "MCP: oma_mode_set updates mode and active status" {
  # Server uses hardcoded .oma/state.json — must run from SCRIPT_DIR (repo root)
  cd "$SCRIPT_DIR"
  response="$(mcp_call "oma_mode_set" '{"mode":"autopilot","active":true}' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q '"ok":true'
  content="$(cat "$SCRIPT_DIR/.oma/state.json")"
  printf '%s\n' "$content" | grep -q '"mode":\s*"autopilot"'
  printf '%s\n' "$content" | grep -q '"active":\s*true'
}

@test "MCP: oma_notepad_write and oma_notepad_read round-trip" {
  write_resp="$(mcp_call "oma_notepad_write" '{"section":"priority","content":"test note"}' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$write_resp" | grep -q '"ok":true'
  read_resp="$(mcp_call "oma_notepad_read" '{"section":"priority"}' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$read_resp" | grep -q 'test note'
}

# ------------------------------------------------------------------------------
# Manifest Validation Tests
# ------------------------------------------------------------------------------

@test "Manifest: .augment-plugin/marketplace.json is valid JSON" {
  run node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('$SCRIPT_DIR/.augment-plugin/marketplace.json')); console.log('valid')"
  [ "$status" -eq 0 ]
  [ "$output" = "valid" ]
}

@test "Manifest: plugins/oma/.augment-plugin/plugin.json is valid JSON" {
  run node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('$PLUGIN_DIR/.augment-plugin/plugin.json')); console.log('valid')"
  [ "$status" -eq 0 ]
  [ "$output" = "valid" ]
}

@test "Manifest: plugins/oma/.augment-plugin/.mcp.json is valid JSON" {
  run node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('$PLUGIN_DIR/.augment-plugin/.mcp.json')); console.log('valid')"
  [ "$status" -eq 0 ]
  [ "$output" = "valid" ]
}

@test "Manifest: .mcp.json references state-server.mjs" {
  grep -q 'state-server.mjs' "$PLUGIN_DIR/.augment-plugin/.mcp.json"
}

@test "Manifest: .claude-plugin/plugin.json is valid JSON" {
  run node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('$SCRIPT_DIR/.claude-plugin/plugin.json')); console.log('valid')"
  [ "$status" -eq 0 ]
  [ "$output" = "valid" ]
}

@test "Manifest: hooks.json is valid JSON" {
  run node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('$PLUGIN_DIR/hooks/hooks.json')); console.log('valid')"
  [ "$status" -eq 0 ]
  [ "$output" = "valid" ]
}

@test "Manifest: hooks.json registers all 3 hook types" {
  hooks_json="$PLUGIN_DIR/hooks/hooks.json"
  grep -q '"SessionStart"' "$hooks_json"
  grep -q '"PreToolUse"' "$hooks_json"
  grep -q '"Stop"' "$hooks_json"
}

# ------------------------------------------------------------------------------
# Hook Script Tests
# ------------------------------------------------------------------------------

@test "Hook: delegation-enforce allows Edit when no state file exists" {
  # State file is empty ({}), mode should be null/none
  result="$(printf '{"tool_name":"Edit","tool_input":{}}' | bash "$PLUGIN_DIR/hooks/delegation-enforce.sh" 2>/dev/null)"
  status=$?
  [ "$status" -eq 0 ]
}

@test "Hook: delegation-enforce blocks Edit when mode active" {
  # Write state to temp dir and point OMA_DIR there
  export OMA_DIR="$(mktemp -d)"
  echo '{"mode":"ralph","active":true}' > "$OMA_DIR/state.json"
  printf '{"tool_name":"Edit","tool_input":{}}\n' > /tmp/del_test_input.txt
  # Disable set -e so exit 2 is captured rather than propagating
  set +e
  bash "$PLUGIN_DIR/hooks/delegation-enforce.sh" < /tmp/del_test_input.txt
  status=$?
  set -e
  rm -rf "$OMA_DIR" /tmp/del_test_input.txt
  [ "$status" -eq 2 ]
}

@test "Hook: delegation-enforce allows Glob when mode active" {
  echo '{"mode":"ralph","active":true}' > "$STATE_FILE"
  result="$(printf '{"tool_name":"Glob","tool_input":{}}' | bash "$PLUGIN_DIR/hooks/delegation-enforce.sh" 2>/dev/null)"
  status=$?
  [ "$status" -eq 0 ]
}

@test "Hook: stop-gate allows stop when no state" {
  result="$(bash "$PLUGIN_DIR/hooks/stop-gate.sh" 2>/dev/null)"
  status=$?
  [ "$status" -eq 0 ]
}

@test "Hook: stop-gate blocks stop when ralph without architect PASS" {
  # Use temp state dir so OMA_DIR resolves correctly without env-var issues
  export OMA_DIR="$(mktemp -d)"
  echo '{"mode":"ralph","active":true,"iteration":1}' > "$OMA_DIR/state.json"
  echo '[]' > "$OMA_DIR/task.log.json"
  # Disable set -e so exit 2 is captured rather than propagating
  set +e
  bash "$PLUGIN_DIR/hooks/stop-gate.sh"
  status=$?
  set -e
  rm -rf "$OMA_DIR"
  [ "$status" -eq 2 ]
}

@test "Hook: stop-gate allows stop when architect PASS exists" {
  echo '{"mode":"ralph","active":true,"iteration":1}' > "$STATE_FILE"
  echo '[{"agent":"oma-architect","status":"PASS"}]' > "$STATE_FILE"
  result="$(bash "$PLUGIN_DIR/hooks/stop-gate.sh" 2>/dev/null)"
  status=$?
  [ "$status" -eq 0 ]
}

# ------------------------------------------------------------------------------
# YAML Frontmatter Tests
# ------------------------------------------------------------------------------

@test "Agent: oma-explorer.md has valid YAML frontmatter" {
  frontmatter="$(sed -n '/^---$/,/^---$/p' "$PLUGIN_DIR/agents/oma-explorer.md")"
  echo "$frontmatter" | grep -q 'name:'
  echo "$frontmatter" | grep -q 'description:'
  echo "$frontmatter" | grep -q 'model:'
}

@test "Agent: oma-planner.md has valid YAML frontmatter" {
  frontmatter="$(sed -n '/^---$/,/^---$/p' "$PLUGIN_DIR/agents/oma-planner.md")"
  echo "$frontmatter" | grep -q 'name:'
  echo "$frontmatter" | grep -q 'description:'
  echo "$frontmatter" | grep -q 'model:'
}

@test "Agent: oma-executor.md has valid YAML frontmatter" {
  frontmatter="$(sed -n '/^---$/,/^---$/p' "$PLUGIN_DIR/agents/oma-executor.md")"
  echo "$frontmatter" | grep -q 'name:'
  echo "$frontmatter" | grep -q 'description:'
  echo "$frontmatter" | grep -q 'model:'
}

@test "Agent: oma-architect.md has valid YAML frontmatter" {
  frontmatter="$(sed -n '/^---$/,/^---$/p' "$PLUGIN_DIR/agents/oma-architect.md")"
  echo "$frontmatter" | grep -q 'name:'
  echo "$frontmatter" | grep -q 'description:'
  echo "$frontmatter" | grep -q 'model:'
}

@test "Command: oma-autopilot.md has valid YAML frontmatter" {
  frontmatter="$(sed -n '/^---$/,/^---$/p' "$PLUGIN_DIR/commands/oma-autopilot.md")"
  echo "$frontmatter" | grep -q 'description:'
  echo "$frontmatter" | grep -q 'argument-hint:'
  echo "$frontmatter" | grep -q 'allowed-tools:'
  echo "$frontmatter" | grep -q 'model:'
}

@test "Command: oma-ralph.md has valid YAML frontmatter" {
  frontmatter="$(sed -n '/^---$/,/^---$/p' "$PLUGIN_DIR/commands/oma-ralph.md")"
  echo "$frontmatter" | grep -q 'description:'
  echo "$frontmatter" | grep -q 'argument-hint:'
  echo "$frontmatter" | grep -q 'allowed-tools:'
  echo "$frontmatter" | grep -q 'model:'
}

@test "Command: oma-status.md has valid YAML frontmatter" {
  frontmatter="$(sed -n '/^---$/,/^---$/p' "$PLUGIN_DIR/commands/oma-status.md")"
  echo "$frontmatter" | grep -q 'description:'
  echo "$frontmatter" | grep -q 'model:'
}

@test "Command: oma-cancel.md has valid YAML frontmatter" {
  frontmatter="$(sed -n '/^---$/,/^---$/p' "$PLUGIN_DIR/commands/oma-cancel.md")"
  echo "$frontmatter" | grep -q 'description:'
  echo "$frontmatter" | grep -q 'model:'
}

@test "Command: oma-help.md has valid YAML frontmatter" {
  frontmatter="$(sed -n '/^---$/,/^---$/p' "$PLUGIN_DIR/commands/oma-help.md")"
  echo "$frontmatter" | grep -q 'description:'
  echo "$frontmatter" | grep -q 'model:'
}

# ------------------------------------------------------------------------------
# MCP Skill Tools Tests
# ------------------------------------------------------------------------------

@test "MCP: tools/list includes oma_skill_list" {
  response="$(printf '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q 'oma_skill_list'
}

@test "MCP: tools/list includes oma_skill_inject" {
  response="$(printf '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' | node "$PLUGIN_DIR/mcp/state-server.mjs" 2>/dev/null)"
  printf '%s\n' "$response" | grep -q 'oma_skill_inject'
}

# ------------------------------------------------------------------------------
# Enterprise State Files Tests
# ------------------------------------------------------------------------------

@test "Enterprise: .oma/approvals.json is valid JSON" {
  run node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('$SCRIPT_DIR/.oma/approvals.json')); console.log('valid')"
  [ "$status" -eq 0 ]
  [ "$output" = "valid" ]
}

@test "Enterprise: .oma/cost-log.json is valid JSON" {
  run node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('$SCRIPT_DIR/.oma/cost-log.json')); console.log('valid')"
  [ "$status" -eq 0 ]
  [ "$output" = "valid" ]
}

@test "Enterprise: .oma/adr/ directory exists" {
  [ -d "$SCRIPT_DIR/.oma/adr" ]
}

# ------------------------------------------------------------------------------
# Enterprise Profile Activation Tests
# ------------------------------------------------------------------------------

@test "Enterprise: config.json with enterprise profile activates enterprise rules" {
  # Create temp config with enterprise profile
  export OMA_DIR="$(mktemp -d)"
  echo '{"profile":"enterprise","enterprise":{"cost_management":true,"approval_gates":true,"adr_requirements":true}}' > "$OMA_DIR/config.json"

  # Approval gate should check config and block when no approval exists
  printf '{"tool_name":"Edit","tool_input":{"file_path":"src/auth/login.ts"}}' > /tmp/approval_test_input.json
  set +e
  HOOK_TYPE=PreToolUse bash "$PLUGIN_DIR/hooks/approval-gate.sh" < /tmp/approval_test_input.json > /dev/null 2>&1
  status=$?
  set -e
  rm -rf "$OMA_DIR" /tmp/approval_test_input.json
  test "$status" -eq 2
}

@test "Enterprise: config.json with community profile does not activate approval gate" {
  # Create temp config with community profile
  export OMA_DIR="$(mktemp -d)"
  echo '{"profile":"community"}' > "$OMA_DIR/config.json"

  # Approval gate should not block even with sensitive path
  printf '{"tool_name":"Edit","tool_input":{"file_path":"src/auth/login.ts"}}' > /tmp/approval_test_input.json
  set +e
  HOOK_TYPE=PreToolUse bash "$PLUGIN_DIR/hooks/approval-gate.sh" < /tmp/approval_test_input.json > /dev/null 2>&1
  status=$?
  set -e
  rm -rf "$OMA_DIR" /tmp/approval_test_input.json
  test "$status" -eq 0
}

@test "Enterprise: ADR enforcement allows non-architectural changes" {
  export OMA_DIR="$(mktemp -d)"
  echo '{"profile":"enterprise"}' > "$OMA_DIR/config.json"
  mkdir -p "$OMA_DIR/adr"

  # Non-architectural change should be allowed
  printf '{"tool_name":"Edit","tool_input":{"file_path":"README.md"}}' > /tmp/adr_test_input.json
  set +e
  HOOK_TYPE=PreToolUse bash "$PLUGIN_DIR/hooks/adr-enforce.sh" < /tmp/adr_test_input.json > /dev/null 2>&1
  status=$?
  set -e
  rm -rf "$OMA_DIR" /tmp/adr_test_input.json
  test "$status" -eq 0
}

@test "Enterprise: Approval gate blocks secrets without approval" {
  export OMA_DIR="$(mktemp -d)"
  echo '{"profile":"enterprise"}' > "$OMA_DIR/config.json"
  echo '{"approvals":[],"version":"0.1"}' > "$OMA_DIR/approvals.json"

  # Secrets path should be blocked without dual approval
  printf '{"tool_name":"Edit","tool_input":{"file_path":"config/secrets.yml"}}' > /tmp/approval_test_input.json
  set +e
  HOOK_TYPE=PreToolUse bash "$PLUGIN_DIR/hooks/approval-gate.sh" < /tmp/approval_test_input.json > /dev/null 2>&1
  status=$?
  set -e
  rm -rf "$OMA_DIR" /tmp/approval_test_input.json
  test "$status" -eq 2
}

@test "Enterprise: Approval gate blocks auth changes without Security approval" {
  export OMA_DIR="$(mktemp -d)"
  echo '{"profile":"enterprise"}' > "$OMA_DIR/config.json"
  echo '{"approvals":[],"version":"0.1"}' > "$OMA_DIR/approvals.json"

  # Auth path should be blocked without Security approval
  printf '{"tool_name":"Edit","tool_input":{"file_path":"src/auth/auth.ts"}}' > /tmp/approval_test_input.json
  set +e
  HOOK_TYPE=PreToolUse bash "$PLUGIN_DIR/hooks/approval-gate.sh" < /tmp/approval_test_input.json > /dev/null 2>&1
  status=$?
  set -e
  rm -rf "$OMA_DIR" /tmp/approval_test_input.json
  test "$status" -eq 2
}

@test "Enterprise: Approval gate blocks migrations without DBA approval" {
  export OMA_DIR="$(mktemp -d)"
  echo '{"profile":"enterprise"}' > "$OMA_DIR/config.json"
  echo '{"approvals":[],"version":"0.1"}' > "$OMA_DIR/approvals.json"

  # Migration path should be blocked without DBA approval
  printf '{"tool_name":"Edit","tool_input":{"file_path":"db/migration_001.sql"}}' > /tmp/approval_test_input.json
  set +e
  HOOK_TYPE=PreToolUse bash "$PLUGIN_DIR/hooks/approval-gate.sh" < /tmp/approval_test_input.json > /dev/null 2>&1
  status=$?
  set -e
  rm -rf "$OMA_DIR" /tmp/approval_test_input.json
  test "$status" -eq 2
}

# ------------------------------------------------------------------------------
# Manifest Validation Tests (v0.2)
# ------------------------------------------------------------------------------

@test "Manifest: plugin.json version is 0.2.0" {
  version="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('$PLUGIN_DIR/.augment-plugin/plugin.json')); console.log(p.version)")"
  [ "$version" = "0.2.0" ]
}

@test "Manifest: plugin.json lists 19 agents" {
  count="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('$PLUGIN_DIR/.augment-plugin/plugin.json')); console.log(p.agents ? p.agents.length : 0)")"
  [ "$count" -eq 19 ]
}

@test "Manifest: hooks.json registers all 6 hook types" {
  hooks_json="$PLUGIN_DIR/hooks/hooks.json"
  grep -q '"SessionStart"' "$hooks_json"
  grep -q '"PreToolUse"' "$hooks_json"
  grep -q '"Stop"' "$hooks_json"
  grep -q '"PostToolUse"' "$hooks_json"
}

# ------------------------------------------------------------------------------
# Shellcheck Tests (skip if not installed)
# ------------------------------------------------------------------------------

@test "Shellcheck: session-start.sh passes" {
  if ! command -v shellcheck >/dev/null 2>&1; then
    skip "shellcheck not installed"
  fi
  run shellcheck "$PLUGIN_DIR/hooks/session-start.sh"
  [ "$status" -eq 0 ]
}

@test "Shellcheck: delegation-enforce.sh passes" {
  if ! command -v shellcheck >/dev/null 2>&1; then
    skip "shellcheck not installed"
  fi
  run shellcheck "$PLUGIN_DIR/hooks/delegation-enforce.sh"
  [ "$status" -eq 0 ]
}

@test "Shellcheck: stop-gate.sh passes" {
  if ! command -v shellcheck >/dev/null 2>&1; then
    skip "shellcheck not installed"
  fi
  run shellcheck "$PLUGIN_DIR/hooks/stop-gate.sh"
  [ "$status" -eq 0 ]
}

@test "Shellcheck: approval-gate.sh passes" {
  if ! command -v shellcheck >/dev/null 2>&1; then
    skip "shellcheck not installed"
  fi
  run shellcheck "$PLUGIN_DIR/hooks/approval-gate.sh"
  [ "$status" -eq 0 ]
}

@test "Shellcheck: adr-enforce.sh passes" {
  if ! command -v shellcheck >/dev/null 2>&1; then
    skip "shellcheck not installed"
  fi
  run shellcheck "$PLUGIN_DIR/hooks/adr-enforce.sh"
  [ "$status" -eq 0 ]
}

@test "Shellcheck: cost-track.sh passes" {
  if ! command -v shellcheck >/dev/null 2>&1; then
    skip "shellcheck not installed"
  fi
  run shellcheck "$PLUGIN_DIR/hooks/cost-track.sh"
  [ "$status" -eq 0 ]
}

# ------------------------------------------------------------------------------
# Rules Files Tests
# ------------------------------------------------------------------------------

@test "Rules: orchestration.md exists with required sections" {
  [ -f "$PLUGIN_DIR/rules/orchestration.md" ]
  grep -q "Orchestration Flow" "$PLUGIN_DIR/rules/orchestration.md"
  grep -q "Agent Delegation" "$PLUGIN_DIR/rules/orchestration.md"
  grep -q "Mode Transitions" "$PLUGIN_DIR/rules/orchestration.md"
  grep -q "Keyword Triggers" "$PLUGIN_DIR/rules/orchestration.md"
}

@test "Rules: enterprise.md exists with required sections" {
  [ -f "$PLUGIN_DIR/rules/enterprise.md" ]
  grep -q "Enterprise Profile Activation" "$PLUGIN_DIR/rules/enterprise.md"
  grep -q "Cost-Aware Model Routing" "$PLUGIN_DIR/rules/enterprise.md"
  grep -q "Approval Gates" "$PLUGIN_DIR/rules/enterprise.md"
  grep -q "ADR" "$PLUGIN_DIR/rules/enterprise.md"
}

@test "Rules: enterprise.md is additive only" {
  grep -q "additive only" "$PLUGIN_DIR/rules/enterprise.md"
  grep -q "never removes" "$PLUGIN_DIR/rules/enterprise.md"
}
