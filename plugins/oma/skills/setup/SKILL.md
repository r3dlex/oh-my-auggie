---
name: setup
description: Setup routing and environment configuration. Use for "setup", "configure", and "get started".
trigger: /oma:setup
---

## Skill: setup

Set up development environments and configurations.

## When to Use

- New project initialization
- Environment configuration
- First-time setup
- Onboarding to a project

## Setup Modes

### `/oma:setup new`
Create a new project structure.
- Initialize files
- Configure tools
- Set up dependencies

### `/oma:setup existing`
Configure for existing project.
- Detect project type
- Configure tools
- Verify setup

### `/oma:setup doctor`
Diagnose setup issues.
- Check dependencies
- Verify configurations
- Report status

### `/oma:setup mcp`
Configure MCP servers.
- List available servers
- Configure connections
- Test integrations

## Setup Steps

### 1. Detect Environment
- Project type
- Language/framework
- Existing configs

### 2. Check Prerequisites
- Required tools installed
- Permissions correct
- Network access

### 3. Configure
- Create config files
- Set up dependencies
- Configure tools

### 4. Verify
- Run basic checks
- Test configuration
- Confirm working

## Project Types

### JavaScript/TypeScript
- package.json
- tsconfig.json
- eslint/prettier
- Jest/Vitest

### Python
- requirements.txt
- pyproject.toml
- pytest
- virtual env

### Rust
- Cargo.toml
- rustfmt.toml
- clippy

### Multi-language
- Nx monorepo
- Turborepo
- Lerna

## Output Format

```
## Setup: {project}

### Environment
- **Type:** {project type}
- **Location:** {path}
- **Existing config:** {yes/no}

### Prerequisites
| Check | Status |
|-------|--------|
| {check} | ✅/❌ |

### Configuration
| Item | Status | Notes |
|------|--------|-------|
| {config} | ✅ | {notes} |

### Files Created
- {file 1}
- {file 2}

### Verification
```bash
{verify command}
```

### Next Steps
1. {step 1}
2. {step 2}
```

## Constraints

- Don't overwrite without backup
- Preserve existing config
- Verify after each step
- Document what was done
- Make setup repeatable

<Tool_Usage>
- **oma-executor**: Primary agent for running the actual setup steps — executor creates files, installs dependencies, runs commands
- **oma-analyst**: Use when the project type cannot be auto-detected — analyst determines what kind of project this is and what it needs
- **oma-architect**: Consult when setup involves architectural decisions (e.g., choosing between monorepo vs. polyrepo, choosing a framework)
- **oma-verifier**: After setup completes, use verifier to confirm the environment is healthy and ready for development
- **Direct Bash tools**: For reading existing config files, running diagnostics, and executing setup commands directly (not for spawning agents)
</Tool_Usage>

<Why_This_Exists>
OMA operates inside Auggie's CLI and needs a reliable way to initialize new projects or configure existing ones for use with OMA's orchestration tools. Setting up `.oma/`, `plugins/oma/`, MCP configurations, and skill directories is a prerequisite for most orchestration modes. Rather than scattering setup logic across agents, setup provides a dedicated entry point so the environment is correctly initialized before ralph, ultraqa, or team modes run — preventing failures from missing state directories or unconfigured MCP servers.
</Why_This_Exists>

<Examples>

### Good Usage

**First-time OMA setup on a new Auggie project:**
```
User: "/oma:setup"
OMA: [Detects: new project, no .oma directory]
OMA: [Creates .oma/state.json, .oma/notepad.json, .oma/plans/]
OMA: [Configures plugins/oma/ if not present]
OMA: [Runs setup doctor: MCP server reachable, Auggie CLI version check]
OMA: [Result: environment ready for /oma:ralph, /oma:team, etc.]
```

**Configure OMA on an existing project:**
```
User: "/oma:setup existing"
OMA: [Detects: existing TypeScript project with tsconfig.json]
OMA: [Checks for .oma/ — not found]
OMA: [Creates .oma/ directory structure]
OMA: [Writes initial .oma/state.json with project type]
OMA: [Result: OMA now aware of the project]
```

### Bad Usage

**Re-running setup on an already-configured environment:**
```
User: "/oma:setup"
OMA: [Detects: .oma/ already exists, .oma/state.json valid]
OMA: [Overwrites existing state, destroying in-progress mode state]
```
→ Use `/oma:setup doctor` instead to verify without re-initializing.

**Setup as a substitute for manual environment understanding:**
```
User: "/oma:setup" on a highly custom monorepo with non-standard tooling
OMA: [Auto-detects wrong project type due to non-standard structure]
OMA: [Misconfigures plugins/oma/ paths]
OMA: [Modes fail with confusing errors]
```
→ Use `/oma:setup doctor` first to see what was detected, then manually configure if needed.
</Examples>
