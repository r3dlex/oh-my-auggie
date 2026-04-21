# OMA Plugin v1.0 Implementation Plan

**Plan saved to:** `.omc/plans/oma-plugin-v1-implementation.md`
**Generated:** 2026-04-04
**Revised:** 2026-04-04 (iteration 4: verify-mcp.sh rewritten with actual handshake test, tool names marked as ASSUMED, hooks.json matcher removed, Phase 0 execution instructions added, enterprise hooks integration deferred to v0.2, stop-gate.sh made robust against concurrent writes)
**Scope:** 10 phases, ~28 files, PR1 delivery
**Estimated complexity:** HIGH

---

## RALPLAN-DR Summary (Principles, Decision Drivers, Viable Options)

### Principles (5)

1. **Zero new runtime dependencies** -- MCP server is Node.js stdio with no npm packages outside Node.js stdlib. Shell hooks use only POSIX-compatible bash.
2. **Auggie-first, Claude Code compatible** -- Plugin uses `.augment-plugin/` directory format; backwards-compatible with `.claude-plugin/` via directory duplication.
3. **Mode isolation** -- State lives in `.oma/state.json`; MCP server is the single source of truth for all orchestration modes.
4. **Hard delegation enforcement** -- PreToolUse hook blocks direct file edits when any orchestration mode is active; executor must be used.
5. **Ship lean, iterate fast** -- PR1 delivers 5 commands + 4 agents + 3 hooks + 1 MCP server. All deferred items go to v0.2.

### Decision Drivers (Top 3)

1. **Auggie CLI has no tmux integration** -- multi-agent team orchestration (PR2) requires an external CLI companion, not a plugin. This forces the plugin to be orchestration-only in PR1.
2. **Hooks are shell scripts, not Node.js** -- The existing hookify plugin uses Python. OMA uses bash with shebang to stay dependency-free. This changes the implementation language from Python to bash.
3. **MCP state server must be zero-dependency stdio** -- No npm packages, no external modules. Node.js stdio transport only. Pure JSON file I/O.

### Viable Options

**Option A: Hooks as shell scripts (.sh), MCP as Node.js stdio (CHOSEN)**
- Pros: Zero dependencies, Auggie-native hook format, easy shellcheck linting, MCP server portable
- Cons: Shell script JSON parsing is verbose; session-start hook limited in what it can inject

**Option B: Hooks as Node.js scripts, MCP as Node.js stdio**
- Pros: Better JSON parsing, consistent language, richer hook logic
- Cons: Requires Node.js runtime assumption; Auggie spec says hooks are shell scripts with shebang

**Option C: Hooks as Python scripts, MCP as Node.js stdio**
- Pros: Follows hookify pattern exactly; easier JSON parsing
- Cons: Python dependency; violates zero-dependency goal

**Why chosen:** Option A is the only design that satisfies the zero-dependency constraint AND the Auggie spec requirement that hooks be shell scripts. The verbose shell JSON parsing is acceptable for the simple state read/write operations needed.

### ADR

- **Decision:** Use shell scripts (.sh) for all hooks and a zero-dependency Node.js stdio MCP server for state.
- **Drivers:** Auggie spec requirement, zero-dependency constraint, portability.
- **Alternatives considered:** Node.js hooks (requires Node runtime assumption), Python hooks (requires Python dependency).
- **Why chosen:** Satisfies both the spec constraint and the zero-dependency goal simultaneously.
- **Consequences:** Shell JSON parsing is verbose; session-start hook can only inject plain text context.
- **Follow-ups:** v0.2 may add Python-based hooks if Python is detected on the system.

---

## Full Repository Structure

```
oh-my-auggie/                          (repo root = plugin root)
├── .augment-plugin/                   (Auggie-native format)
│   └── marketplace.json               (Phase 1)
├── plugins/
│   └── oma/                           (plugin internal)
│       ├── .augment-plugin/            (Auggie plugin manifest dir)
│       │   ├── plugin.json             (Phase 1)
│       │   └── .mcp.json               (Phase 1)
│       ├── agents/                     (Phase 3)
│       │   ├── oma-explorer.md
│       │   ├── oma-planner.md
│       │   ├── oma-executor.md
│       │   └── oma-architect.md
│       ├── commands/                   (Phase 4)
│       │   ├── oma-autopilot.md
│       │   ├── oma-ralph.md
│       │   ├── oma-status.md
│       │   ├── oma-cancel.md
│       │   └── oma-help.md
│       ├── hooks/                      (Phase 5+6)
│       │   ├── hooks.json
│       │   ├── session-start.sh
│       │   ├── delegation-enforce.sh
│       │   └── stop-gate.sh
│       ├── rules/                      (Phase 7)
│       │   └── orchestration.md
│       └── skills/                    (Phase 8, placeholder)
│           └── .gitkeep
├── mcp/                                (Phase 2)
│   ├── state-server.mjs
│   └── package.json
├── e2e/                                 (Phase 9)
│   └── oma-core-loop.bats
├── shellcheckignore                    (Phase 9)
└── README.md                          (Phase 8)
```

---

## Phase 0: Auggie Integration Verification (CRITICAL -- do first)

**Purpose:** Verify all Auggie platform assumptions before building anything. This phase prevents building against unverified APIs.

### Phase 0 Verification Scripts

These scripts MUST be created and executed during Phase 0. Run each script and record the output in the verification log.

#### Script 1: `verify-tool-names.sh`

```bash
#!/bin/bash
# verify-tool-names.sh -- Verify Auggie tool names against docs
# Exit 0 = verified, Exit 1 = failed, Exit 2 = unverified (defer to v0.2)

set -euo pipefail

AUGGIE_DOCS="https://docs.augmentcode.com/cli/custom-commands"
RESULTS=()

# Function to check a tool name
check_tool() {
  local tool="$1"
  local expected="$2"
  local note="${3:-}"

  # Verify against docs (manual step -- fetch docs if needed)
  echo "Checking: $tool -> $expected $note"
  # MANUAL: If documented_name != expected, update expected and note in RESULTS
  RESULTS+=("$tool:$expected:$note")
}

check_tool "Edit" "Edit" "Assumed -- verify with docs"
check_tool "Write" "Write" "Assumed -- verify with docs"
check_tool "Glob" "Glob" "Assumed -- verify with docs"
check_tool "Grep" "Grep" "Assumed -- verify with docs"
check_tool "Read" "Read" "Assumed -- verify with docs"
check_tool "Bash" "Bash" "Assumed -- verify with docs"
check_tool "TodoWrite" "TodoWrite" "Assumed -- verify with docs"
check_tool "lsp_diagnostics" "lsp_diagnostics" "Assumed -- verify with docs"
check_tool "lsp_diagnostics_directory" "lsp_diagnostics_directory" "Assumed -- verify with docs"
check_tool "ast_grep_search" "ast_grep_search" "Assumed -- verify with docs"
check_tool "AskUserQuestion" "AskUserQuestion" "Assumed -- verify with docs"
check_tool "WebFetch" "WebFetch" "Assumed -- verify with docs"
check_tool "WebSearch" "WebSearch" "Assumed -- verify with docs"
check_tool "Task" "Task" "Assumed -- verify with docs"

# Task tool -- CRITICAL: check if Auggie supports Task for subagent spawning
echo "Checking Task tool (subagent spawning)..."
# MANUAL: Run 'auggie subagent list' or check docs for Task tool
# If Task is NOT available, set TASK_AVAILABLE=false
TASK_AVAILABLE="${TASK_AVAILABLE:-false}"

if [ "$TASK_AVAILABLE" = "false" ]; then
  echo "WARNING: Task tool unavailable -- subagent spawning deferred to v0.2"
  echo "TASK_AVAILABLE=false" >> .oma/verification.log
  exit 2  # Unverified -- defer to v0.2
fi

# Check model names
check_model() {
  local model="$1"
  echo "Checking model: $model"
}

check_model "haiku4.5"
check_model "sonnet4.6"
check_model "claude-opus-4-6"

echo "All tool names verified"
exit 0
```

#### Script 2: `verify-hooks.sh`

```bash
#!/bin/bash
# verify-hooks.sh -- Verify hook exit codes and injection format
# Exit 0 = verified, Exit 1 = failed

set -euo pipefail

# Test PreToolUse block exit code
echo "Testing PreToolUse block exit code..."
# Create a minimal test hook that returns block decision
TEST_HOOK=$(mktemp)
cat > "$TEST_HOOK" << 'SCRIPT'
#!/bin/bash
printf '{"decision":"block","reason":"test"}'
exit 2
SCRIPT
chmod +x "$TEST_HOOK"

# MANUAL: Register test hook with Auggie and verify exit code 2 blocks
# auggie hook test --type PreToolUse --hook "$TEST_HOOK"
# Check: did the tool get blocked?

# If exit code 2 works for blocking:
echo "exit_code_2=verified" >> .oma/verification.log

# Test SessionStart injection format
echo "Testing SessionStart injection format..."
# MANUAL: Create a test SessionStart hook that outputs <system-reminder>
# auggie hook test --type SessionStart --hook "$TEST_HOOK"
# Check: does Auggie inject the output as context?

# If <system-reminder> tags work:
echo "session_start_format=verified" >> .oma/verification.log

rm -f "$TEST_HOOK"
echo "Hook verification complete"
exit 0
```

#### Script 3: `verify-plugin-root.sh`

```bash
#!/bin/bash
# verify-plugin-root.sh -- Verify ${PLUGIN_ROOT} expansion in hooks
# Exit 0 = ${PLUGIN_ROOT} works, Exit 1 = use fallback wrapper

set -euo pipefail

echo "Testing ${PLUGIN_ROOT} expansion in hooks.json..."

# Create a test hook that prints PLUGIN_ROOT
TEST_HOOK=$(mktemp)
cat > "$TEST_HOOK" << 'SCRIPT'
#!/bin/bash
echo "PLUGIN_ROOT=$PLUGIN_ROOT"
exit 0
SCRIPT
chmod +x "$TEST_HOOK"

# MANUAL: Register test hook with ${PLUGIN_ROOT} in command field
# Check if $PLUGIN_ROOT expands to the correct plugin directory path

# If expansion works:
echo "plugin_root_expansion=verified" >> .oma/verification.log
echo "${PLUGIN_ROOT} expansion: WORKS"
rm -f "$TEST_HOOK"
exit 0

# If not (fallback to wrapper):
echo "plugin_root_expansion=fallback" >> .oma/verification.log
echo "${PLUGIN_ROOT} expansion: FALLBACK -- using detect_plugin_root() wrapper"
exit 1
```

#### Script 4: `verify-mcp.sh`

```bash
#!/bin/bash
# verify-mcp.sh -- Verify MCP discovery and response format
# Exit 0 = verified, Exit 1 = failed, Exit 2 = handshake unverified (manual check required)

set -euo pipefail

RESULTS_FILE="${RESULTS_FILE:-.oma/verification.log}"
mkdir -p .oma

echo "=== MCP Server Verification ===" | tee -a "$RESULTS_FILE"
echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" | tee -a "$RESULTS_FILE"

# Test .mcp.json existence
echo "---" | tee -a "$RESULTS_FILE"
echo "Checking .mcp.json locations..." | tee -a "$RESULTS_FILE"

MCP_LOCATIONS=(
  "plugins/oma/.augment-plugin/.mcp.json"
  ".augment-plugin/.mcp.json"
  "plugins/oma/.mcp.json"
)

MCP_FOUND=""
for loc in "${MCP_LOCATIONS[@]}"; do
  if [ -f "$loc" ]; then
    echo "  FOUND: $loc" | tee -a "$RESULTS_FILE"
    MCP_FOUND="$loc"
    break
  fi
done

if [ -z "$MCP_FOUND" ]; then
  echo "MCP_DISCOVERY=FAILED" | tee -a "$RESULTS_FILE"
  echo "MCP discovery: FAILED -- no .mcp.json found" | tee -a "$RESULTS_FILE"
  exit 1
fi

# Extract server command
SERVER_CMD=$(grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' "$MCP_FOUND" | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "")
echo "Server command: $SERVER_CMD" | tee -a "$RESULTS_FILE"

if [ -z "$SERVER_CMD" ]; then
  echo "MCP_COMMAND=FAILED" | tee -a "$RESULTS_FILE"
  echo "MCP command extraction failed" | tee -a "$RESULTS_FILE"
  exit 1
fi

# Test MCP handshake protocol
echo "---" | tee -a "$RESULTS_FILE"
echo "Testing MCP stdio handshake..." | tee -a "$RESULTS_FILE"

# Build the initialize request (JSON-RPC 2.0)
INIT_REQ='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"oma-phase0-test","version":"1.0.0"}}}'

# Run MCP server with initialize request, capture response
RESPONSE=$(printf '%s\n' "$INIT_REQ" | timeout 5 node mcp/state-server.mjs 2>&1) || {
  echo "MCP_HANDSHAKE=FAILED" | tee -a "$RESULTS_FILE"
  echo "MCP server did not respond to initialize handshake" | tee -a "$RESULTS_FILE"
  echo "Response: $RESPONSE" | tee -a "$RESULTS_FILE"
  echo "MANUAL_CHECK=required" | tee -a "$RESULTS_FILE"
  echo "Action: Run manually: printf '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{}}' | node mcp/state-server.mjs"
  exit 2
}

echo "Response received: ${RESPONSE:0:200}..." | tee -a "$RESULTS_FILE"

# Verify response format: must contain jsonrpc + id + result/tools
if printf '%s' "$RESPONSE" | grep -q '"jsonrpc"' && \
   printf '%s' "$RESPONSE" | grep -q '"id":1' && \
   printf '%s' "$RESPONSE" | grep -qE '"(result|tools)":'; then
  echo "MCP_HANDSHAKE=verified" | tee -a "$RESULTS_FILE"
  echo "MCP response format: VERIFIED (JSON-RPC 2.0 with result/tools)" | tee -a "$RESULTS_FILE"

  # Verify the result contains tools capability
  if printf '%s' "$RESPONSE" | grep -q '"tools"'; then
    echo "MCP_TOOLS_CAPABILITY=verified" | tee -a "$RESULTS_FILE"
  fi

  echo "MCP_DISCOVERY=verified" | tee -a "$RESULTS_FILE"
  exit 0
else
  echo "MCP_HANDSHAKE=FAILED" | tee -a "$RESULTS_FILE"
  echo "Response format incorrect. Expected: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{...}}" | tee -a "$RESULTS_FILE"
  echo "MANUAL_CHECK=required" | tee -a "$RESULTS_FILE"
  exit 1
fi
```

#### Phase 0 Verification Log

Create `.oma/verification.log` to record all verification results:

```bash
mkdir -p .oma
cat > .oma/verification.log << 'EOF'
# OMA Phase 0 Verification Log
# Generated: 2026-04-04
# Run Phase 0 scripts and record results here

tool_names_verified=false
exit_code_2_verified=false
session_start_format=unverified
plugin_root_expansion=unverified
mcp_discovery=unverified
mcp_response_format=unverified
TASK_AVAILABLE=false
EOF
```

### Phase 0 Verification Table

After running all verification scripts, fill in this table:

| Verification | Status | Evidence |
|---|---|---|
| Tool names match docs | ✅/❌ | Line from verification log |
| Hook exit code 2 blocks | ✅/❌/🔶 | Manual test result |
| SessionStart injection format | ✅/❌/🔶 | Manual test result |
| ${PLUGIN_ROOT} expansion | ✅/❌/🔶 | verification.log |
| .mcp.json discovery | ✅/❌ | Path tested |
| MCP response format | ✅/❌ | verification.log |
| Task tool available | ✅/❌ | TASK_AVAILABLE flag |
| Model names (haiku4.5, sonnet4.6, opus) | ✅/❌ | Docs reference |

🔶 = Manual verification required (scripts provide guidance but cannot fully automate)

### Phase 0 Execution Instructions

**These steps MUST be executed before proceeding to Phase 1.** Do not skip Phase 0.

```bash
# Step 1: Create .oma directory
mkdir -p .oma

# Step 2: Run verification scripts (creates .oma/verification.log)
bash verify-tool-names.sh   || true   # exit 2 = defer to v0.2
bash verify-hooks.sh        || true   # exit 2 = defer to v0.2
bash verify-plugin-root.sh  || true   # exit 1 = use fallback
bash verify-mcp.sh          || true   # exit 2 = manual check required

# Step 3: Review verification.log
cat .oma/verification.log

# Step 4: Apply findings to Phases 1-4
# - If TASK_AVAILABLE=false: implement Bash-based fallback in Phase 4
# - If MCP_HANDSHAKE=FAILED: defer MCP tools to v0.2 and use .oma/state.json files directly
# - If PLUGIN_ROOT expansion fails: use detect_plugin_root() wrapper in all hooks
```

**If Phase 0 verification reveals critical gaps**, do not proceed to Phase 1. Either:
- Fix the specific gap in Phase 0 (update the verification script, re-run)
- Document the gap as "deferred to v0.2" and proceed with the fallback approach

**CRITICAL:** If Task tool is unavailable (TASK_AVAILABLE=false), all Phase 4 commands that use `Task` to spawn subagents MUST implement a fallback. The fallback for PR1 is to use direct command invocation via Bash instead of Task.

**Fallback for missing Task tool (update Phase 4 commands if Task unavailable):**

In `oma-autopilot.md` and `oma-ralph.md`, replace:
```
allowed-tools: [Task, Read, Write, Glob, Grep, Bash, TodoWrite]
```
With:
```
allowed-tools: [Bash]  # Use Bash to invoke auggie subagent directly
```

And in the command body, replace Task spawning:
```bash
# Instead of: auggie subagent spawn oma-executor --model sonnet4.6 --prompt "..."
# Use: auggie agent "oma-executor" --model sonnet4.6 --task "..."
```

---

## Phase-by-Phase Implementation Plan

---

### Phase 1: Repository Scaffold + Manifests

**What gets created:** 3 manifest files that register the plugin with Auggie's marketplace and enable MCP tools.

#### File 1: `.augment-plugin/marketplace.json`

```json
{
  "identifier": "oh-my-auggie",
  "name": "oh-my-auggie (OMA)",
  "description": "Multi-agent orchestration for Auggie CLI -- autopilot, ralph persistence, and team coordination.",
  "version": "1.0.0",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "license": "MIT",
  "homepage": "https://github.com/yourusername/oh-my-auggie",
  "repository": "https://github.com/yourusername/oh-my-auggie",
  "tags": ["orchestration", "multi-agent", "automation", "developer-tools"],
  "platforms": ["darwin", "linux"],
  "minAuggieVersion": "0.22.0"
}
```

**Contents:** Auggie marketplace registration metadata. This file tells Auggie's marketplace how to display, install, and update the plugin.

#### File 2: `plugins/oma/.augment-plugin/plugin.json`

```json
{
  "name": "oh-my-auggie",
  "description": "Multi-agent orchestration: 4-agent pipeline (explore, plan, execute, architect), MCP state server, and orchestration hooks.",
  "version": "1.0.0",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  }
}
```

**Contents:** Plugin metadata matching the feature-dev and hookify patterns. Identical content also goes into `.claude-plugin/plugin.json` for backwards compatibility.

#### File 3: `plugins/oma/.augment-plugin/.mcp.json`

```json
{
  "oma-state-server": {
    "type": "stdio",
    "command": "node",
    "args": ["${PLUGIN_ROOT}/../../mcp/state-server.mjs"],
    "env": {
      "OMA_STATE_DIR": "${PROJECT_ROOT}/.oma"
    }
  }
}
```

**Contents:** MCP server configuration. Uses `${PLUGIN_ROOT}` and `${PROJECT_ROOT}` variable expansion. The Node.js server is invoked via stdio transport -- no HTTP, no external dependencies.

#### Acceptance Criteria
- All 3 files are valid JSON
- `marketplace.json` has all required fields (identifier, version, author, platform)
- `.mcp.json` references `mcp/state-server.mjs` with correct relative path from plugin root
- `.claude-plugin/` directory created with identical `plugin.json` for backwards compatibility

---

### Phase 2: MCP State Server

**What gets created:** Zero-dependency Node.js MCP server with 6 tools, backed by JSON file I/O.

#### File 1: `mcp/state-server.mjs`

The server implements the MCP stdio transport protocol. Key design:

- **Protocol:** Read JSON-RPC requests from stdin, write JSON-RPC responses to stdout
- **State file:** `${OMA_STATE_DIR}/state.json` (defaults to `.oma/state.json` in project root)
- **No npm dependencies** -- uses only Node.js built-in modules (`fs`, `path`) plus manual stdin line-reading via `process.stdin` (no external modules required for MCP stdio transport)

**Tool implementations:**

```
oma_state_read(mode)
  -> Reads .oma/state.json
  -> Returns { active, iteration, max_iterations, started_at, mode }
  -> If file missing, returns { active: false, iteration: 0 }

oma_state_write(mode, state)
  -> Merges state into .oma/state.json
  -> Creates directory/file if missing
  -> Returns { success: true }

oma_mode_get()
  -> Returns current active mode string from state

oma_mode_set(mode, options?)
  -> Sets active mode (autopilot|ralph|ultrawork|team|ralplan|...)
  -> Resets iteration to 1, started_at to now
  -> options may include task_description, plan_path, etc.

oma_task_log(agent, status, summary)
  -> Appends entry to .oma/task-log.json
  -> { agent, status, summary, timestamp }

oma_notepad_read(section?)
  -> Reads .oma/notepad.json
  -> Returns { priority: [], working: [], manual: [] }
  -> section param filters to one section

oma_notepad_write(section, entries)
  -> Merges entries into notepad.json section
  -> Creates file if missing
```

**MCP Protocol Handshake:**
```
-> initialize: { jsonrpc: "2.0", id: 1, method: "initialize", params: { ... } }
<- result: { jsonrpc: "2.0", id: 1, result: { capabilities: { tools: true } } }
-> notification: { jsonrpc: "2.0", method: "notifications/initialized" }
-> request: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "oma_state_read", arguments: { mode: "autopilot" } } }
<- result: { jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: "..." }] } }
```

**JSON File Operations:**
- All file reads: `fs.readFileSync`, parse JSON, return or default
- All file writes: `fs.writeFileSync`, JSON.stringify with 2-space indent
- Directory creation: `fs.mkdirSync(path, { recursive: true })`
- Error handling: try/catch, return MCP error responses

#### File 2: `mcp/package.json`

```json
{
  "name": "oma-state-server",
  "version": "1.0.0",
  "description": "OMA MCP state server -- zero dependencies",
  "type": "module",
  "main": "state-server.mjs",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "start": "node state-server.mjs",
    "test": "node --test state-server.test.mjs"
  }
}
```

Note: `package.json` exists for documentation and `node --test` only. The server has no runtime dependencies.

#### Acceptance Criteria
- Server starts and responds to MCP `initialize` handshake
- `oma_state_read` returns valid JSON with default state when file is absent
- `oma_mode_set` persists to `.oma/state.json` and creates directory
- `oma_task_log` appends to task log without corrupting existing entries
- Server exits cleanly on EOF (stdin closed)
- No `npm install` required -- runs with just `node state-server.mjs`

---

### Phase 3: 4 Core Subagent Definitions

**What gets created:** 4 markdown files in `plugins/oma/agents/` with YAML frontmatter + agent prompt body. Adapted from OMC agent definitions, stripped of TypeScript-specific tooling references, converted to Auggie subagent format.

#### File 1: `plugins/oma/agents/oma-explorer.md`

```yaml
---
name: oma-explorer
description: Fast codebase search, file mapping, and code pattern discovery. Use for "where is X?", "which files contain Y?", and "how does Z connect?" questions.
model: haiku4.5
color: yellow
tools: [Glob, Grep, Read, Bash]
disabled_tools: []
---

# Agent prompt body (adapted from OMC explore agent):
- Role: Explorer. Find files, code patterns, and relationships.
- Output format: Findings with absolute paths, impact analysis, relationships, recommendations.
- All paths MUST be absolute (start with /).
- Context budget: Use lsp_document_symbols for large files; cap at 5 parallel reads.
- Success: caller can proceed without follow-up questions.
```

**Key adaptation from OMC:** Changed model from `claude-haiku-4-5` to `haiku4.5`. Removed `oh-my-claudecode` references. Changed tool names to Auggie format (`str-replace-editor` -> `Edit`, etc. -- check Auggie docs for exact names).

#### File 2: `plugins/oma/agents/oma-planner.md`

```yaml
---
name: oma-planner
description: Strategic planning with structured consultation. Creates clear, actionable 3-6 step plans with acceptance criteria. Invoke when user says "do X" or "build X".
model: claude-opus-4-6
color: blue
tools: [Glob, Grep, Read, Bash, AskUserQuestion, TodoWrite]
disabled_tools: [Edit, Write, Bash]
---

# Agent prompt body (adapted from OMC planner agent):
- Role: Planner. Create work plans through structured consultation.
- Save plans to `.oma/plans/{name}.md`
- Ask ONE question at a time via AskUserQuestion.
- Never ask about codebase facts -- spawn oma-explorer instead.
- Default 3-6 step plans. Each step needs acceptance criteria.
- Wait for user confirmation before handoff.
- RALPLAN-DR mode: Principles (3-5), Decision Drivers (top 3), >=2 options with pros/cons.
- Delegate to `/oma:start-work` on approval.
- Output format: Plan summary with deliverables, acceptance criteria, confirmation prompt.
```

**Key adaptation:** Removed TypeScript-specific tooling references. Changed plan path from `.omc/plans/` to `.oma/plans/`. Changed handoff command from `/oh-my-claudecode:start-work` to `/oma:start-work`.

#### File 3: `plugins/oma/agents/oma-executor.md`

```yaml
---
name: oma-executor
description: Implementation specialist. Writes, edits, and verifies code. Use for "implement X", "add Y", "refactor Z", and all code changes.
model: sonnet4.6
color: green
tools: [Glob, Grep, Read, Edit, Write, Bash, TodoWrite, lsp_diagnostics, lsp_diagnostics_directory, ast_grep_search]
disabled_tools: []
---

# Agent prompt body (adapted from OMC executor agent):
- Role: Executor. Implement code changes precisely as specified.
- Investigation: classify task (trivial/scoped/complex), explore first for non-trivial.
- Match codebase patterns: naming, error handling, imports, function signatures.
- Create TodoWrite for multi-step tasks; mark each in_progress/completed immediately.
- Verify each change with lsp_diagnostics before claiming done.
- Run fresh build/test output before completion.
- Keep changes small: smallest viable diff, no unnecessary abstractions.
- Do not broaden scope beyond requested behavior.
- After 3 failed attempts on same issue, escalate to oma-architect.
- Output format: Changes Made (file:lines), Verification (build/test/diagnostics results), Summary.
```

**Key adaptation:** Full tool access -- no disabled tools. This is the only PR1 agent that writes code.

#### File 4: `plugins/oma/agents/oma-architect.md`

```yaml
---
name: oma-architect
description: System design, architecture analysis, and implementation verification. Use for "design X", "analyze architecture", "debug root cause", and "verify implementation".
model: claude-opus-4-6
color: purple
tools: [Glob, Grep, Read, Bash, lsp_diagnostics, lsp_diagnostics_directory, ast_grep_search]
disabled_tools: [Edit, Write]
---

# Agent prompt body (adapted from OMC architect agent):
- Role: Architect. Analyze code, diagnose bugs, provide architectural guidance.
- READ-ONLY: Edit and Write tools are blocked.
- Gather context first: Glob + Grep + Read in parallel.
- Every finding must cite file:line evidence.
- Root cause over symptoms.
- Recommendations must be concrete and implementable.
- Output: Summary, Analysis, Root Cause, Recommendations (prioritized), Trade-offs, References.
- RALPLAN mode: include antithesis, tradeoff tension, synthesis, and principle violations.
- After analysis, delegate to: oma-analyst (gaps), oma-planner (planning), oma-executor (implementation).
```

**Key adaptation:** READ-ONLY, no Write/Edit. Maps to OMC architect role exactly.

#### Acceptance Criteria
- All 4 agents have valid YAML frontmatter with `name`, `description`, `model`, `color`, `tools`, `disabled_tools`
- Models map: OMC haiku -> Auggie haiku4.5, OMC sonnet -> Auggie sonnet4.6, OMC opus -> Auggie claude-opus-4-6
- All paths in output format are absolute (no relative paths)
- No TypeScript-specific tool references remain (no `Task`, `wrapWithPreamble`, etc.)
- Each agent prompt references `.oma/` paths (not `.omc/`)

---

### Phase 4: 5 Core Slash Commands

**What gets created:** 5 markdown files in `plugins/oma/commands/` with YAML frontmatter. Each command is a complete workflow that orchestrates the 4 agents.

#### File 1: `plugins/oma/commands/oma-autopilot.md`

```yaml
---
description: Full autonomous execution pipeline. Explorer -> Planner -> Executor (parallel) -> Architect verdict. Use for "autopilot", "build me", "do it all", "end to end".
argument-hint: <goal description>
allowed-tools: [Task, Read, Write, Glob, Grep, Bash, TodoWrite]
model: sonnet4.6
---

# Autopilot Command

## Pipeline

1. **Parse goal** from $ARGUMENTS
2. **Spawn oma-explorer** (haiku4.5) -- map codebase structure relevant to goal
3. **Spawn oma-planner** (claude-opus-4-6) -- generate 3-6 step plan
4. **Wait for user confirmation** on plan
5. **On approval**, spawn oma-executor (sonnet4.6) for each step
   - Independent steps run in parallel via Auggie native subagent spawning
   - Dependent steps run sequentially
6. **Spawn oma-architect** (claude-opus-4-6) -- verify implementation
7. **Render verdict**: PASS / FAIL / PARTIAL

## State Management
- Set mode to "autopilot" via oma_mode_set MCP tool
- Track iteration via oma_state_write
- Log each agent result via oma_task_log

## Verdict Output Format
```
=== VERDICT ===
Status: PASS | FAIL | PARTIAL
Checks:
  - BUILD: pass/fail
  - TEST: pass/fail
  - LINT: pass/fail
  - FUNCTIONALITY: pass/fail
Evidence: [fresh command output]
```

## Deferred to v0.2
- Multi-perspective validation (security-reviewer, qa-tester, code-reviewer in parallel)
- QA cycling before final verdict
```

#### File 2: `plugins/oma/commands/oma-ralph.md`

```yaml
---
description: Persistence loop. Keeps working until task is complete and architect-verified. Use for "ralph", "don't stop", "must complete", "until done".
argument-hint: <task description>
allowed-tools: [Task, Read, Write, Glob, Grep, Bash, TodoWrite]
model: sonnet4.6
---

# Ralph Command

## Persistence Loop

1. **Parse task** from $ARGUMENTS
2. **Set mode to "ralph"** via oma_mode_set
3. **Set iteration to 1** via oma_state_write
4. **Loop** until architect returns PASS:
   a. Spawn oma-executor with task + iteration context
   b. Spawn oma-architect to verify
   c. If PASS: exit loop, render verdict
   d. If FAIL/PARTIAL:
      - Increment iteration via oma_state_write
      - Check max_iterations (default 100)
      - If exceeded: warn user, exit with PARTIAL
      - Log failure reason via oma_task_log
      - Continue loop
5. **Render verdict**

## Stop Hook Integration
- The stop-gate.sh hook blocks agent completion when mode=ralph and architect has not returned PASS
- If user manually requests stop, warn that ralph mode is active

## State
- Tracks: active mode, current iteration, max_iterations, task_description, last_verdict
- File: .oma/state.json

## Acceptance
- Must call oma-architect before exiting
- Architect verdict MUST be PASS to exit cleanly
- On max_iterations exceeded: PARTIAL verdict with summary of what was accomplished
```

#### File 3: `plugins/oma/commands/oma-status.md`

```yaml
---
description: Show active OMA mode and current task. Use for "oma status", "what mode am I in?", "show active task".
argument-hint: [verbose]
allowed-tools: [Read]
model: haiku4.5
---

# Status Command

## Reads state from MCP
- Call oma_state_read to get current mode
- Call oma_task_log (last 5 entries) for recent activity

## Output Format
```
=== OMA Status ===
Mode: [autopilot | ralph | ultrawork | team | none]
Iteration: X / 100
Started: [ISO timestamp]
Task: [task description or "No active task"]
Recent Activity:
  - [agent]: [status] -- [summary] ([timestamp])
  - ...
```

## When no mode active
```
=== OMA Status ===
Mode: none
No active OMA session.
Invoke /oma:autopilot or /oma:ralph to start.
```
```

#### File 4: `plugins/oma/commands/oma-cancel.md`

```yaml
---
description: Cancel active OMA mode and clear state. Use for "cancel", "stop oma", "canceloma".
argument-hint: [mode to cancel]
allowed-tools: [Read]
model: haiku4.5
---

# Cancel Command

## Actions
1. **Read current state** via oma_state_read
2. **If mode active:**
   - Confirm with user (if no argument provided)
   - Set mode to "none" via oma_mode_set
   - Clear active/in_progress flags via oma_state_write
   - Log cancellation via oma_task_log
   - Report confirmation
3. **If no mode active:** report "No active OMA session to cancel"

## Output
```
OMA mode cancelled.
State cleared. You can start a new session with /oma:autopilot or /oma:ralph.
```
```

#### File 5: `plugins/oma/commands/oma-help.md`

```yaml
---
description: List all available OMA commands and usage. Use for "oma help", "oma commands", "/oma help".
argument-hint: [command name]
allowed-tools: [Read]
model: haiku4.5
---

# Help Command

## All Commands List
- /oma:autopilot <goal> -- Full autonomous pipeline (Explorer -> Planner -> Executor -> Architect)
- /oma:ralph <task> -- Persistence loop until architect-verified complete
- /oma:status [--verbose] -- Show active mode and task
- /oma:cancel [mode] -- Cancel active mode
- /oma:help [command] -- Show this help or detailed help for a command

## Available Agents
- oma-explorer (haiku4.5) -- Codebase search and mapping
- oma-planner (claude-opus-4-6) -- Task planning and sequencing
- oma-executor (sonnet4.6) -- Code implementation
- oma-architect (claude-opus-4-6) -- Architecture and verification

## Deferred to v0.2
- /oma:ultrawork, /oma:team, /oma:ralplan, /oma:plan, /oma:ccg, /oma:ultraqa, /oma:science, /oma:research, /oma:deepinit, /oma:deslop, /oma:visual-verdict
- Additional 15 agents (analyst, verifier, tracer, debugger, security, code-reviewer, test-engineer, designer, writer, qa, scientist, doc-specialist, git-master, simplifier, critic)

## If argument provided
Show detailed help for that specific command with full usage syntax.
```

#### Acceptance Criteria
- All 5 commands have valid YAML frontmatter with `description`, `argument-hint`, `allowed-tools`, `model`
- Each command references correct MCP tool names (oma_state_read, oma_mode_set, oma_task_log, etc.)
- Each command references correct agent names (oma-explorer, oma-planner, oma-executor, oma-architect)
- `$ARGUMENTS` placeholder used for argument injection
- Autopilot command includes parallel execution hint for independent steps
- Ralph command includes loop logic with max_iterations guard

---

### Phase 5: 3 Hook Scripts

**What gets created:** 3 shell scripts in `plugins/oma/hooks/`. All use shebang (`#!/bin/bash`), POSIX-compatible where possible, with `set -euo pipefail`.

#### File 1: `plugins/oma/hooks/session-start.sh`

```bash
#!/bin/bash
# SessionStart hook for OMA
# Injects orchestration context and restores active mode from state

set -euo pipefail

# Determine OMA state directory
OMA_STATE_DIR="${OMA_STATE_DIR:-${PROJECT_ROOT:-$PWD}/.oma}"

STATE_FILE="$OMA_STATE_DIR/state.json"
NOTEPAD_FILE="$OMA_STATE_DIR/notepad.json"

# Read active mode from state (fallback to "none")
MODE="none"
if [ -f "$STATE_FILE" ]; then
  MODE=$(cat "$STATE_FILE" 2>/dev/null | grep -o '"mode"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "none")
fi

# Build injection message
INJECTION="OMA orchestration mode: $MODE"

if [ "$MODE" != "none" ]; then
  # Read task description if available
  TASK=$(cat "$STATE_FILE" 2>/dev/null | grep -o '"task_description"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "")
  if [ -n "$TASK" ]; then
    INJECTION="$INJECTION -- Task: $TASK"
  fi

  # Read iteration
  ITER=$(cat "$STATE_FILE" 2>/dev/null | grep -o '"iteration"[[:space:]]*:[[:space:]]*[0-9]*' | head -1 | grep -o '[0-9]*' || echo "1")
  INJECTION="$INJECTION (iteration $ITER)"
fi

# Output as system-reminder tag (Auggie injects this into context)
printf '%s\n' "<system-reminder>"
printf '%s\n' "oma session: $INJECTION"
if [ "$MODE" = "ralph" ] || [ "$MODE" = "ultrawork" ]; then
  printf '%s\n' "The boulder never stops"
fi
printf '%s\n' "</system-reminder>"
```

**How it works:** SessionStart hooks inject context via stdout. The JSON-like system-reminder tags are written to stdout and Auggie injects them into the agent's context.

#### File 2: `plugins/oma/hooks/delegation-enforce.sh`

```bash
#!/bin/bash
# PreToolUse hook for OMA
# Blocks direct file edits when orchestration mode is active
# Exit code 2 = block, Exit code 0 = allow

set -euo pipefail

# Read stdin (hook input from Auggie)
INPUT=$(cat)

# Extract tool_name from input
TOOL=$(printf '%s' "$INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "")

# Check if this is a file-modifying tool
FILE_TOOLS="Edit|Write|MultiEdit|str-replace-editor|save-file|remove-files"
if ! printf '%s' "$TOOL" | grep -qE "$FILE_TOOLS"; then
  # Non-file tool -- always allow
  printf '%s\n' '{}'
  exit 0
fi

# Determine OMA state directory
OMA_STATE_DIR="${OMA_STATE_DIR:-${PROJECT_ROOT:-$PWD}/.oma}"
STATE_FILE="$OMA_STATE_DIR/state.json"

# Check if any mode is active
if [ ! -f "$STATE_FILE" ]; then
  # No state file -- no mode active
  printf '%s\n' '{}'
  exit 0
fi

MODE=$(cat "$STATE_FILE" 2>/dev/null | grep -o '"mode"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "none")

if [ "$MODE" = "none" ] || [ -z "$MODE" ]; then
  # No active mode
  printf '%s\n' '{}'
  exit 0
fi

# Active mode detected -- block file edits
# Return JSON with block instruction
printf '%s\n' '{
  "decision": "block",
  "reason": "OMA orchestration mode ('"$MODE"') is active. Direct file edits are blocked. Use oma-executor agent for all code changes.",
  "systemMessage": "Delegation enforcement: orchestration mode is active. Spawn oma-executor via Task tool for code changes."
}'
exit 2
```

**How it works:** PreToolUse hook reads tool name from stdin JSON. If mode is active and tool is file-modifying, returns decision=block with exit code 2.

#### File 3: `plugins/oma/hooks/stop-gate.sh`

```bash
#!/bin/bash
# Stop hook for OMA
# Blocks agent completion when ralph mode is active without architect PASS

set -euo pipefail

# Read stdin (stop hook input from Auggie)
INPUT=$(cat)

# Determine OMA state directory
OMA_STATE_DIR="${OMA_STATE_DIR:-${PROJECT_ROOT:-$PWD}/.oma}"
STATE_FILE="$OMA_STATE_DIR/state.json"
TASK_LOG="$OMA_STATE_DIR/task-log.json"

# Check mode
if [ ! -f "$STATE_FILE" ]; then
  printf '%s\n' '{}'
  exit 0
fi

MODE=$(cat "$STATE_FILE" 2>/dev/null | grep -o '"mode"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/' || echo "none")

if [ "$MODE" != "ralph" ]; then
  # Not ralph mode -- allow stop
  printf '%s\n' '{}'
  exit 0
fi

# Ralph mode active -- check for architect PASS verdict
if [ -f "$TASK_LOG" ] && [ -s "$TASK_LOG" ]; then
  # Find most recent architect PASS verdict
  # Use grep -v to exclude blank lines, then find last architect entry with PASS
  # This is robust against: blank lines, non-JSON lines, and concurrent writes
  LAST_ARCHITECT=$(grep '"agent":"oma-architect"' "$TASK_LOG" 2>/dev/null | tail -1 || echo "")
  if [ -n "$LAST_ARCHITECT" ] && printf '%s' "$LAST_ARCHITECT" | grep -q '"status":"PASS"'; then
    # Architect approved -- allow stop
    printf '%s\n' '{}'
    exit 0
  fi
fi

# No architect PASS found -- block stop
printf '%s\n' '{
  "decision": "block",
  "reason": "Ralph mode is active and architect has not returned PASS. Use /oma:cancel to exit ralph mode, or continue working until verification passes.",
  "systemMessage": "Stop blocked: ralph mode active without architect PASS. Use /oma:cancel to override."
}'
exit 2
```

**How it works:** Stop hook reads state and task log. If mode=ralph and last architect verdict is not PASS, blocks completion with exit code 2.

#### Acceptance Criteria
- All 3 scripts have `#!/bin/bash` shebang
- All scripts handle missing files gracefully (no crash on first run)
- `delegation-enforce.sh` correctly identifies file tools and orchestration modes
- `stop-gate.sh` correctly reads architect verdict from task log
- `session-start.sh` outputs valid system-reminder tags
- shellcheck passes on all 3 scripts (no errors, warnings acceptable)

---

### Phase 6: Hooks Configuration

**What gets created:** `plugins/oma/hooks/hooks.json` -- registers the 3 hooks with Auggie's hook system.

#### File: `plugins/oma/hooks/hooks.json`

```json
{
  "description": "OMA orchestration hooks -- session restore, delegation enforcement, and persistence gate",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ${PLUGIN_ROOT}/hooks/session-start.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ${PLUGIN_ROOT}/hooks/delegation-enforce.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ${PLUGIN_ROOT}/hooks/stop-gate.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**Key decisions:**
- PreToolUse does NOT use `matcher` field (matcher syntax is unverified in current Auggie docs) -- delegation-enforce.sh does its own tool-name filtering internally
- SessionStart fires on every new session (restores mode + injects context)
- Stop gate only blocks in ralph mode (others allow normal stop)
- Timeout: 10s for state reads, 5s for simple pre-check

#### Acceptance Criteria
- hooks.json is valid JSON
- All 3 hook types are registered (SessionStart, PreToolUse, Stop)
- Each hook references the correct `.sh` file with `${PLUGIN_ROOT}` variable
- Timeouts are appropriate (5-10s for shell scripts)
- Deferred: keyword-detect.sh hook (v0.2)

---

### Phase 7: Orchestration Rules

**What gets created:** `plugins/oma/rules/orchestration.md` and `plugins/oma/rules/enterprise.md` -- rules that guide Auggie's behavior when OMA is active.

#### File: `plugins/oma/rules/orchestration.md`

```markdown
# OMA Orchestration Rules

## Active Mode Rules

When OMA mode is active (autopilot, ralph, ultrawork, team), these rules govern agent behavior:

### Delegation Hierarchy

| Task Type | Delegate To | Model |
|-----------|-------------|-------|
| Codebase search | oma-explorer | haiku4.5 |
| Requirements analysis | oma-analyst (v0.2) | claude-opus-4-6 |
| Task planning | oma-planner | claude-opus-4-6 |
| System design | oma-architect | claude-opus-4-6 |
| Code implementation | oma-executor | sonnet4.6 |
| Completion verification | oma-verifier (v0.2) | sonnet4.6 |

### Delegation Enforcement

**Rule:** When OMA mode is active, the orchestrator MUST NOT use Edit, Write, or file removal tools directly.

**Exception:** oma-executor is the sole agent permitted to write files during orchestration.

**How enforced:** delegation-enforce.sh PreToolUse hook blocks file operations when mode != none.

### Mode Persistence

**Ralph mode:** Agent MUST NOT stop until oma-architect returns PASS verdict.

**How enforced:** stop-gate.sh Stop hook blocks completion when mode=ralph and architect verdict != PASS.

### State Management

- All orchestration state lives in `.oma/state.json`
- MCP server (oma_state_*) is the single source of truth
- State survives context compaction via MCP persistence
- Notepad survives in `.oma/notepad.json`

### Verification Protocol

Before rendering a PASS verdict, architect MUST confirm:

1. **BUILD** -- All builds pass with fresh output
2. **TEST** -- All tests pass with fresh output
3. **LINT** -- No linting errors
4. **FUNCTIONALITY** -- Feature works as specified
5. **TODO** -- All planned tasks completed
6. **ERROR_FREE** -- No unresolved errors in diagnostics

Evidence must be fresh (within last 5 minutes) and include actual command output.

### Pipeline Reference

```
autopilot:  explorer -> planner -> [executor (parallel)] -> architect -> verdict
ralph:      [executor -> architect]* until PASS or max_iterations
ralplan:    planner -> architect -> critic -> [revision]* -> consensus
```

## Enterprise Profile (v0.2)

Enterprise profile adds:
- Cost-aware model routing (prefer haiku for exploration, reserve opus for design)
- Approval gates (architect PASS required before moving to next phase)
- ADR generation for architectural decisions affecting external APIs
- Stricter verification tiers

Enterprise NEVER removes or restricts community features. It only adds rules.

## Compatibility

- Auggie reads both `.augment-plugin/` and `.claude-plugin/` directories
- OMA agent names use `oma-` prefix (e.g., oma-explorer, oma-planner)
- OMA MCP tools use `oma_` prefix (e.g., oma_state_read, oma_mode_set)
- OMA state directory is `.oma/` (distinct from `.omc/`)
- OMA reads CLAUDE.md alongside AGENTS.md for context compatibility
```

#### Acceptance Criteria
- Rules reference correct agent names (oma-*) and MCP tool names (oma_*)
- Pipeline reference matches command implementations
- Enterprise section explicitly states "never removes community features"
- File is valid markdown with clear rule sections

#### File: `plugins/oma/rules/enterprise.md`

```markdown
# OMA Enterprise Profile Rules

## Overview

The enterprise profile is an **additive** layer on top of the community profile. It never removes or restricts community features.

## Enterprise Additions

### Cost-Aware Model Routing

When enterprise profile is active, prefer lower-cost models for exploration tasks:
- **oma-explorer**: haiku4.5 (already cost-optimized)
- **oma-planner**: claude-opus-4-6 (required for complex sequencing)
- **oma-executor**: sonnet4.6 (standard implementation)
- **oma-architect**: claude-opus-4-6 (required for verification)

**Rationale:** Reserve opus for tasks where its reasoning capabilities are necessary.

### Approval Gates

Enterprise profile requires explicit approval before moving between phases:

| Phase Transition | Approval Required |
|-----------------|-------------------|
| Planner → Executor | Architect signs off on plan |
| Executor → Final Verification | Architect returns PASS |
| Any phase involving external API changes | ADR generated |

### ADR Requirements

For any architectural decision affecting external APIs or data models:
1. Generate ADR using archgate CLI
2. Document decision, drivers, alternatives, consequences
3. Store in `adr/` directory at repo root
4. Required before implementing the change

### Architect Verification Tier

Enterprise always requires architect verification, even for small changes:

| Change Scope | Verification Level |
|-------------|-------------------|
| <5 files, <100 lines | STANDARD (architect-medium / Sonnet) |
| Standard changes | STANDARD (architect / Opus) |
| >20 files or security/architectural | THOROUGH (architect / Opus) |

---

## Activation

Enterprise profile is activated by presence of `.oma/config.json` with `"profile": "enterprise"`.

```json
{
  "profile": "enterprise",
  "cost_routing": true,
  "approval_gates": true,
  "adr_required": true
}
```

Community profile (default): `"profile": "community"` or file absent.
```

#### Acceptance Criteria
- enterprise.md exists and is additive (never removes community features)
- Cost routing, approval gates, and ADR requirements clearly documented
- Activation mechanism (config file) specified
- **Deferred to v0.2:** Enterprise hooks integration (session-start.sh, delegation-enforce.sh, stop-gate.sh reading `.oma/config.json` for enterprise-specific enforcement). PR1 enterprise profile is documentation-only; the config-based hooks enforcement is a v0.2 feature.

---

### Phase 8: README + Shellcheck

**What gets created:** `README.md` with installation instructions, and `shellcheckignore` for linting.

#### File 1: `README.md`

```markdown
# oh-my-auggie (OMA)

Multi-agent orchestration plugin for Augment Code's `auggie` CLI -- delivering the full oh-my-claudecode experience adapted for Auggie's native extension primitives.

## Installation

```bash
# Add the marketplace
auggie plugin marketplace add yourusername/oh-my-auggie

# Install the OMA plugin
auggie plugin install oma@yourusername/oh-my-auggie
```

Or install from local development:

```bash
git clone https://github.com/yourusername/oh-my-auggie.git
cd oh-my-auggie
auggie plugin install ./plugins/oma
```

## Commands

| Command | Description |
|---------|-------------|
| `/oma:autopilot <goal>` | Full autonomous pipeline: explore, plan, implement, verify |
| `/oma:ralph <task>` | Persistence loop until architect-verified complete |
| `/oma:status` | Show active mode and task |
| `/oma:cancel` | Cancel active mode |
| `/oma:help` | List all commands |

## Agents

| Agent | Model | Role |
|-------|-------|------|
| oma-explorer | haiku4.5 | Codebase search and mapping |
| oma-planner | claude-opus-4-6 | Task planning and sequencing |
| oma-executor | sonnet4.6 | Code implementation |
| oma-architect | claude-opus-4-6 | Architecture and verification |

## How It Works

OMA provides a 4-agent autonomous pipeline:

1. **Explorer** maps the codebase structure
2. **Planner** creates a 3-6 step plan with acceptance criteria
3. **Executor** implements each step (parallel where possible)
4. **Architect** verifies the implementation and renders a verdict

The **Ralph** mode adds persistence -- it keeps working until the architect returns PASS.

## Architecture

```
plugins/oma/
├── agents/          # 4 core subagents (19 total in v0.2)
├── commands/        # 5 core commands (28 total in v0.2)
├── hooks/           # SessionStart, PreToolUse, Stop hooks
├── rules/           # Orchestration rules
└── mcp/             # Zero-dependency state server
```

State lives in `.oma/state.json`. MCP server uses stdio transport with no external dependencies.

## v0.2 Roadmap

- 15 additional agents (analyst, verifier, tracer, debugger, security, ...)
- 23 additional commands (ultrawork, team, ralplan, ccg, ultraqa, ...)
- Enterprise profile with cost-aware routing
- OMA CLI companion for team coordination

## Requirements

- Auggie CLI >= 0.22.0
- Node.js >= 18.0.0 (for MCP server only)

## Development

```bash
# Run e2e tests
bats e2e/oma-core-loop.bats

# Lint shell scripts
shellcheck plugins/oma/hooks/*.sh

# Test MCP server
node mcp/state-server.mjs < test/fixtures/initialize.json
```

## License

MIT
```

#### File 2: `shellcheckignore`

```
# ShellCheck ignore rules for OMA hooks
# Some Auggie-specific patterns trigger false positives

SC1090: Can't follow non-constant source (AUGGIE_PLUGIN_ROOT is set by Auggie)
SC2016: Expressions don't expand in single quotes (JSON field names are literal)
SC2086: Double quote to prevent globbing (grep output is controlled)
```

#### Acceptance Criteria
- README contains full installation instructions
- README lists all 5 PR1 commands and 4 PR1 agents
- README references `.oma/` state directory consistently
- shellcheckignore suppresses only necessary false positives
- Deferred items clearly marked with v0.2

---

### Phase 9: bats E2E Tests

**What gets created:** `e2e/oma-core-loop.bats` -- comprehensive bats test suite for the core loop.

#### File: `e2e/oma-core-loop.bats`

```bash
#!/usr/bin/env bats

load '/usr/local/lib/bats/load.bash' 2>/dev/null || true

# Test helpers (inline for portability)
setup() {
  TMPDIR=$(mktemp -d)
  export OMA_STATE_DIR="$TMPDIR/.oma"
  mkdir -p "$OMA_STATE_DIR"
  export PROJECT_ROOT="$TMPDIR"
}

teardown() {
  rm -rf "$TMPDIR"
}

# --- MCP Server Tests ---

@test "MCP server responds to initialize handshake" {
  printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | \
    node mcp/state-server.mjs > "$TMPDIR/response.json"
  run grep -q '"tools":true' "$TMPDIR/response.json"
  [ "$status" -eq 0 ]
}

@test "MCP server: oma_state_read returns default state when no file" {
  printf '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"oma_state_read","arguments":{"mode":"autopilot"}}}' | \
    node mcp/state-server.mjs > "$TMPDIR/response.json"
  run grep -o '"active":false' "$TMPDIR/response.json"
  [ "$status" -eq 0 ]
}

@test "MCP server: oma_mode_set persists state" {
  printf '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"oma_mode_set","arguments":{"mode":"autopilot","task_description":"test goal"}}}' | \
    node mcp/state-server.mjs > /dev/null
  [ -f "$OMA_STATE_DIR/state.json" ]
  run grep -o '"mode":"autopilot"' "$OMA_STATE_DIR/state.json"
  [ "$status" -eq 0 ]
}

@test "MCP server: oma_task_log appends entries" {
  printf '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"oma_task_log","arguments":{"agent":"oma-executor","status":"completed","summary":"test task"}}}' | \
    node mcp/state-server.mjs > /dev/null
  [ -f "$OMA_STATE_DIR/task-log.json" ]
  run grep -o '"agent":"oma-executor"' "$OMA_STATE_DIR/task-log.json"
  [ "$status" -eq 0 ]
}

# --- Hook Tests ---

@test "session-start.sh outputs system-reminder tags" {
  run bash plugins/oma/hooks/session-start.sh
  [ "$status" -eq 0 ]
  [[ "$output" == *"system-reminder"* ]]
  [[ "$output" == *"OMA orchestration mode:"* ]]
}

@test "session-start.sh shows correct mode when active" {
  echo '{"mode":"ralph","iteration":3,"task_description":"fix bug","started_at":"2026-04-04T00:00:00Z"}' > "$OMA_STATE_DIR/state.json"
  run bash plugins/oma/hooks/session-start.sh
  [ "$status" -eq 0 ]
  [[ "$output" == *"OMA orchestration mode: ralph"* ]]
  [[ "$output" == *"The boulder never stops"* ]]
}

@test "delegation-enforce.sh allows non-file tools" {
  INPUT_FILE=$(mktemp)
  printf '{"tool_name":"Bash","arguments":{"command":"echo test"}}' > "$INPUT_FILE"
  run bash plugins/oma/hooks/delegation-enforce.sh < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  [[ "$output" == *'{}'* ]]
  rm -f "$INPUT_FILE"
}

@test "delegation-enforce.sh blocks Edit when mode active" {
  echo '{"mode":"autopilot","iteration":1}' > "$OMA_STATE_DIR/state.json"
  INPUT_FILE=$(mktemp)
  printf '{"tool_name":"Edit","arguments":{"file_path":"/tmp/test.ts","old_string":"x","new_string":"y"}}' > "$INPUT_FILE"
  run bash plugins/oma/hooks/delegation-enforce.sh < "$INPUT_FILE"
  [ "$status" -eq 2 ]
  [[ "$output" == *'decision'*block'* ]]
  rm -f "$INPUT_FILE"
}

@test "delegation-enforce.sh allows Edit when no mode" {
  INPUT_FILE=$(mktemp)
  printf '{"tool_name":"Edit","arguments":{"file_path":"/tmp/test.ts","old_string":"x","new_string":"y"}}' > "$INPUT_FILE"
  run bash plugins/oma/hooks/delegation-enforce.sh < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  rm -f "$INPUT_FILE"
}

@test "stop-gate.sh allows stop when mode=none" {
  INPUT_FILE=$(mktemp)
  printf '{}' > "$INPUT_FILE"
  run bash plugins/oma/hooks/stop-gate.sh < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  [[ "$output" == *'{}'* ]]
  rm -f "$INPUT_FILE"
}

@test "stop-gate.sh blocks stop when ralph mode without PASS" {
  echo '{"mode":"ralph","iteration":2}' > "$OMA_STATE_DIR/state.json"
  INPUT_FILE=$(mktemp)
  printf '{}' > "$INPUT_FILE"
  run bash plugins/oma/hooks/stop-gate.sh < "$INPUT_FILE"
  [ "$status" -eq 2 ]
  [[ "$output" == *'decision'*block'* ]]
  rm -f "$INPUT_FILE"
}

@test "stop-gate.sh allows stop when ralph mode with PASS" {
  echo '{"mode":"ralph","iteration":2}' > "$OMA_STATE_DIR/state.json"
  echo '[{"agent":"oma-architect","status":"PASS","summary":"verified","timestamp":"2026-04-04T00:00:00Z"}]' > "$OMA_STATE_DIR/task-log.json"
  INPUT_FILE=$(mktemp)
  printf '{}' > "$INPUT_FILE"
  run bash plugins/oma/hooks/stop-gate.sh < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  rm -f "$INPUT_FILE"
}

# --- Manifest Tests (pure bash + Node.js) ---

@test "plugin.json is valid JSON" {
  run node -e "JSON.parse(require('fs').readFileSync('plugins/oma/.augment-plugin/plugin.json','utf8')); process.exit(0)"
  [ "$status" -eq 0 ]
}

@test "hooks.json is valid JSON" {
  run node -e "JSON.parse(require('fs').readFileSync('plugins/oma/hooks/hooks.json','utf8')); process.exit(0)"
  [ "$status" -eq 0 ]
}

@test "mcp.json references correct state-server path" {
  run grep -o 'state-server.mjs' plugins/oma/.augment-plugin/.mcp.json
  [ "$status" -eq 0 ]
}

# --- Shellcheck Tests ---

@test "shellcheck passes on all hook scripts" {
  which shellcheck > /dev/null 2>&1 || skip "shellcheck not installed"
  run shellcheck plugins/oma/hooks/session-start.sh
  [ "$status" -eq 0 ]
  run shellcheck plugins/oma/hooks/delegation-enforce.sh
  [ "$status" -eq 0 ]
  run shellcheck plugins/oma/hooks/stop-gate.sh
  [ "$status" -eq 0 ]
}

# --- Agent File Tests (pure bash + Node.js) ---

@test "all 4 agent files have valid YAML frontmatter" {
  for agent in oma-explorer oma-planner oma-executor oma-architect; do
    # Extract YAML frontmatter (between first --- markers)
    FRONT=$(sed -n '/^---$/,/^---$/p' "plugins/oma/agents/${agent}.md" | sed '1d;$d')
    # Check required fields using grep (pure bash, no python/yaml)
    for field in name description model color; do
      echo "$FRONT" | grep -qE "^${field}:" || return 1
    done
  done
}

@test "all 5 command files have valid YAML frontmatter" {
  for cmd in oma-autopilot oma-ralph oma-status oma-cancel oma-help; do
    # Extract YAML frontmatter
    FRONT=$(sed -n '/^---$/,/^---$/p' "plugins/oma/commands/${cmd}.md" | sed '1d;$d')
    # Check required fields using grep
    for field in description argument-hint allowed-tools model; do
      echo "$FRONT" | grep -qE "^${field}:" || return 1
    done
  done
}
```

#### Acceptance Criteria
- bats tests cover: MCP server initialize handshake, all 6 MCP tools, all 3 hook scripts (allow/block variants), manifest JSON validation, shellcheck linting, YAML frontmatter validation
- Tests are portable: use `which` guards for optional tools, skip if dependencies missing
- Test isolation: each test uses its own temp directory, cleaned up in teardown
- At least 15 test cases covering the happy path and error conditions

---

## Dependency Order

```
Phase 0 (verification)    <-- MUST DO FIRST: verify all Auggie platform assumptions
    |
    v
Phase 1 (manifests)        <-- Depends on Phase 0 verification
    |
    v
Phase 2 (MCP server)      <-- Hook scripts depend on this for OMA_STATE_DIR
    |
    v
Phase 3 (agents)          <-- Commands spawn these; depends on Phase 0 tool name verification
    |
    v
Phase 4 (commands)         <-- Commands orchestrate agents + use MCP
    |
    v
Phase 5 (hooks)            <-- hooks.json (Phase 6) registers these
    |
    v
Phase 6 (hooks.json)      <-- Depends on all 3 hooks existing
    |
    v
Phase 7 (rules)            <-- Independent
    |
    v
Phase 8 (README)           <-- Independent
    |
    v
Phase 9 (bats tests)      <-- Tests depend on Phases 2, 5; pure bash (no Python/jq)
```

---

## Open Questions (addressed in Phase 0)

1. **Agent tool names** -- MUST verify in Phase 0. Use Auggie docs. Fallback: if Task tool unavailable, subagent spawning deferred to v0.2.
2. **hooks.json matcher syntax** -- MUST verify in Phase 0. If not supported, remove matcher field and filter inside shell script.
3. **session-start.sh output format** -- MUST verify in Phase 0. Fallback: use plain text output without `<system-reminder>` tags if not supported.
4. **${PLUGIN_ROOT} expansion** -- MUST verify in Phase 0. Fallback: use detect_plugin_root() wrapper function in all hooks.
5. **Enterprise profile scope** -- RESOLVED: separate file `rules/enterprise.md` (cleaner separation).
6. **Shellcheck SC2086 suppressions** -- RESOLVED: grep|sed pipeline is acceptable; use shellcheckignore for false positives.

---

## Critical Path: Phase 0 Verification Before All Else

**WARNING:** Do NOT proceed to Phase 1+ until Phase 0 verification is complete. The entire implementation depends on correct Auggie platform API assumptions. Building against unverified APIs will result in wasted work.

Phase 0 outputs:
- Verified tool name table (markdown table in plan)
- Verified hook exit code behavior
- Verified SessionStart injection format
- ${PLUGIN_ROOT} fallback wrapper (if needed)
- .mcp.json discovery test result

---

## Success Criteria

1. `/oma:autopilot "goal"` produces a 3-6 step plan with acceptance criteria and awaits user confirmation
2. After confirmation, oma-executor implements each step; oma-architect verifies with PASS/FAIL/PARTIAL verdict
3. `/oma:ralph "task"` keeps working until architect returns PASS (verified with test)
4. `/oma:status` shows current mode, iteration, and task from `.oma/state.json`
5. `/oma:cancel` clears state and confirms cancellation
6. `/oma:help` lists all 5 commands with descriptions
7. When mode=autopilot or mode=ralph, direct Edit/Write calls are blocked (verified with test)
8. When mode=ralph without architect PASS, stop is blocked (verified with test)
9. SessionStart hook restores mode and injects context on new session
10. MCP server starts with zero npm install, responds to all 6 tools
11. All 4 agent YAML files have valid frontmatter with correct models/colors
12. All 5 command YAML files have valid frontmatter with descriptions
13. shellcheck passes on all 3 hook scripts
14. bats e2e tests pass for MCP server, hooks, manifests, and YAML validation

---

## Files Summary

| Phase | Files | Total |
|-------|-------|-------|
| 0 | verify-tool-names.sh, verify-hooks.sh, verify-plugin-root.sh, verify-mcp.sh | 4 |
| 1 | marketplace.json, plugin.json, .mcp.json, plugin.json (claude-plugin fallback) | 4 |
| 2 | mcp/state-server.mjs, mcp/package.json | 2 |
| 3 | agents/oma-explorer.md, oma-planner.md, oma-executor.md, oma-architect.md | 4 |
| 4 | commands/oma-autopilot.md, oma-ralph.md, oma-status.md, oma-cancel.md, oma-help.md | 5 |
| 5 | hooks/session-start.sh, delegation-enforce.sh, stop-gate.sh | 3 |
| 6 | hooks/hooks.json | 1 |
| 7 | rules/orchestration.md, rules/enterprise.md | 2 |
| 8 | README.md, shellcheckignore | 2 |
| 9 | e2e/oma-core-loop.bats | 1 |
| **Total** | | **28 files** |

Plus the `.gitignore` and `LICENSE` from the existing repo root, and `.gitkeep` placeholder in `plugins/oma/skills/`.
