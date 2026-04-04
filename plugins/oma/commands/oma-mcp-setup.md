---
name: oma-mcp-setup
description: Configure MCP servers — add, remove, and manage Model Context Protocol server connections
argument-hint: "<action> [server-name]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

## /oma:mcp-setup

**Purpose:** Configure MCP (Model Context Protocol) servers for extended capabilities.

**Usage:**
- `/oma:mcp-setup list` — List configured servers
- `/oma:mcp-setup add <name>` — Add a server
- `/oma:mcp-setup remove <name>` — Remove a server
- `/oma:mcp-setup test <name>` — Test server connection

**Examples:**
- `/oma:mcp-setup list`
- `/oma:mcp-setup add github`
- `/oma:mcp-setup add filesystem --path /projects`
- `/oma:mcp-setup remove unused-server`
- `/oma:mcp-setup test slack`

---

## MCP Servers

### Available Servers

| Server | Description | Auth |
|--------|-------------|------|
| `github` | GitHub API integration | Token |
| `filesystem` | Direct filesystem access | Path |
| `slack` | Slack workspace integration | Token |
| `aws` | AWS SDK access | IAM |
| `docker` | Docker daemon control | Socket |
| `postgres` | PostgreSQL database | Connection string |

### Configuration

Each server requires:
- **Name:** Unique identifier
- **Command:** How to start the server
- **Env:** Environment variables (tokens, paths)
- **Permissions:** What tools it can access

---

## Commands

### List Servers
```
OMA MCP SERVERS
================
[active] github    — GitHub API
[active] filesystem — /projects
[stopped] slack    — Slack notifications
```

### Add Server
```
/oma:mcp-setup add <name>
# Interactive prompts for config
```

### Remove Server
```
/oma:mcp-setup remove <name>
# Confirms before deletion
```

### Test Connection
```
/oma:mcp-setup test <name>
# Verifies server responds
```

---

## Configuration File

Servers are configured in `.oma/mcp-servers.json`:
```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": { "GITHUB_TOKEN": "..." }
  }
}
```

### Constraints

- Servers require compatible MCP SDK
- Auth tokens stored in env vars, not config
- Test servers before adding to active set
