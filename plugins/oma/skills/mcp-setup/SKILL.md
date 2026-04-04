---
name: mcp-setup
description: Configure MCP servers and integrations. Use for "setup MCP", "configure server", and "MCP integration".
trigger: /oma:mcp-setup
---

## Skill: mcp-setup

Configure and manage Model Context Protocol (MCP) servers.

## When to Use

- Setting up new MCP server
- Configuring server connections
- Troubleshooting MCP issues
- Managing server credentials

## MCP Concepts

### Server
A MCP server provides tools/resources to OMA.
- Has unique name/ID
- Provides specific capabilities
- Connects via stdio or HTTP

### Resource
Data provided by server for context.
- Files
- URLs
- Structured data

### Tool
Actions the server can perform.
- API calls
- File operations
- External integrations

### Prompt
Templates for common interactions.
- Reusable templates
- Variable substitution
- Multi-step workflows

## Common MCP Servers

### Filesystem
- Direct file access
- Directory operations
- Glob patterns

### Git
- Repository operations
- Commit history
- Branch management

### Search
- Code search
- Web search
- Documentation lookup

### Database
- Query execution
- Schema inspection
- Data manipulation

### API
- HTTP requests
- REST/GraphQL
- Authentication

## Configuration

### Server Config Format
```json
{
  "mcpServers": {
    "{server-name}": {
      "command": "{command}",
      "args": ["{arg1}"],
      "env": {
        "{var}": "{value}"
      }
    }
  }
}
```

### Authentication
```yaml
{server-name}:
  auth:
    type: {none|api_key|oauth|basic}
    credentials: {stored-securely}
```

## Commands

### List Servers
```
/oma:mcp-setup list
```

### Add Server
```
/oma:mcp-setup add {server-name} {config}
```

### Remove Server
```
/oma:mcp-setup remove {server-name}
```

### Test Server
```
/oma:mcp-setup test {server-name}
```

### Show Server Config
```
/oma:mcp-setup config {server-name}
```

## Output Format

```
## MCP Setup

### Configured Servers
| Server | Status | Capabilities |
|--------|--------|--------------|
| {name} | ✅ | {tools}, {resources} |

### Server Details

#### {server-name}
**Type:** {type}
**Command:** {command}
**Status:** {running|stopped|error}

**Tools:**
- {tool 1}
- {tool 2}

**Resources:**
- {resource 1}
- {resource 2}

**Last tested:** {date}
**Issues:** {if any}

### Available Servers
| Server | Description |
|--------|-------------|
| {name} | {description} |
```

## Constraints

- Secure credential storage
- Test after configuration
- Document server purpose
- Monitor server health
- Keep config versioned
