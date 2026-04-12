<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# mcp

## Purpose
MCP (Model Context Protocol) state server for OMA runtime state. Provides `state_read`, `state_write`, and `state_clear` tools to agents via the MCP protocol, enabling persistent state sharing across agent turns. Started automatically by auggie when the OMA plugin loads.

## Key Files
| File | Description |
|------|-------------|
| state-server.mjs | MCP server implementation. Exposes state_read/state_write/state_clear tools over stdio transport. |
| package.json | MCP server package manifest. Declares dependencies for the standalone MCP process. |

## For AI Agents
### Working In This Directory
The MCP server runs as a separate Node.js process started by auggie. After modifying `state-server.mjs`, restart auggie to pick up changes (no build step needed — it is plain `.mjs`). Do not modify `package.json` dependencies without testing that the server starts cleanly.

### Testing Requirements
The MCP server is exercised indirectly via hook tests that call state read/write. Verify the server starts without errors by checking auggie session logs after restart.

### Common Patterns
- Uses stdio transport (stdin/stdout) for MCP communication.
- State is keyed by session ID and persisted to `.oma/state.json` in the project root.
- The `state_clear` tool is called by `/oma:cancel` to reset orchestration state.

## Dependencies
### Internal
- `../src/hooks/` — hooks that call state_read/state_write via MCP tool calls

### External
- auggie CLI — spawns the MCP server process and routes tool calls to it
- Node.js >= 18 — runtime for the `.mjs` server

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
