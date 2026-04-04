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
