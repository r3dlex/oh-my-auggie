---
name: mcp-setup
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

[EXECUTING /oma:mcp-setup — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

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
| `context7` | Code search and context (context7.com) | None |
| `exa` | Web search (exa.ai) | EXA_API_KEY env var |
| `github` | GitHub API integration | GITHUB_TOKEN env var |
| `oma-state` | OMA session state management | None (built-in) |

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

## JIRA

Add JIRA MCP for issue tracking and project management.

### Package
```bash
npm install -g jira-mcp
```
Or use npx: `npx jira-mcp-server`

### Single Instance (.mcp.json)

```json
"jira": {
  "command": "npx",
  "args": ["-y", "jira-mcp-server"],
  "env": {
    "JIRA_URL": "${JIRA_URL}",
    "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
    "JIRA_EMAIL": "${JIRA_EMAIL}"
  },
  "protocol": "stdio"
}
```

### Multiple Instances

For teams needing multiple JIRA contexts (e.g. cloud + on-prem, or different projects):

```json
"jira-cloud": {
  "command": "npx",
  "args": ["-y", "jira-mcp-server"],
  "env": {
    "JIRA_URL": "${JIRA_CLOUD_URL}",
    "JIRA_API_TOKEN": "${JIRA_CLOUD_TOKEN}",
    "JIRA_EMAIL": "${JIRA_CLOUD_EMAIL}"
  },
  "protocol": "stdio"
},
"jira-onprem": {
  "command": "npx",
  "args": ["-y", "jira-mcp-server"],
  "env": {
    "JIRA_URL": "${JIRA_ONPREM_URL}",
    "JIRA_API_TOKEN": "${JIRA_ONPREM_TOKEN}",
    "JIRA_EMAIL": "${JIRA_ONPREM_EMAIL}"
  },
  "protocol": "stdio"
}
```

### Credentials

Store credentials in `.oma/config.json` (git-ignored):

```json
{
  "mcp": {
    "jira": {
      "instances": {
        "cloud": {
          "url": "http://your-company.atlassian.net",
          "email": "you@example.com",
          "token": "your-api-token"
        }
      }
    }
  }
}
```

Environment variables are substituted via `${VAR_NAME}` in `.mcp.json`.

### Restart Required

After adding or modifying JIRA entries, restart auggie:
```bash
# Exit auggie and restart
auggie
```

### Verifying

Run `/oma:doctor mcp` after setup to confirm JIRA connection.
