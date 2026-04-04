---
name: deepinit
description: Deep project initialization with hierarchical AGENTS.md. Use for "initialize project", "create agents", "hierarchical setup".
trigger: /oma:deepinit
---

## Skill: deepinit

Create comprehensive project initialization with hierarchical agent structures.

## When to Use

- New project setup
- Creating multi-agent workflows
- Setting up team structures
- Complex project organization

## Deepinit Process

### 1. Project Analysis
- Understand project type
- Identify components
- Map dependencies
- Define scope

### 2. Structure Design
- Create hierarchy
- Define roles
- Map interactions
- Set boundaries

### 3. Agent Definition
- Create AGENTS.md
- Define each agent
- Set tools and limits
- Establish protocols

### 4. Skill Mapping
- Identify required skills
- Map to agents
- Configure triggers
- Set up routing

### 5. Integration
- Connect components
- Test interactions
- Verify flows
- Document

## Hierarchical Structure

```
Project
├── AGENTS.md (root)
├── agents/
│   ├── architect/
│   │   └── AGENTS.md
│   ├── planner/
│   │   └── AGENTS.md
│   └── executor/
│       └── AGENTS.md
└── skills/
    ├── skill1/
    └── skill2/
```

### Level 0: Project Root
- High-level goals
- Overall structure
- Entry points

### Level 1: Domain Agents
- Major domains
- End-to-end responsibility
- Peer coordination

### Level 2: Specialized
- Specific functions
- Tool-focused
- Detail work

## AGENTS.md Format

```markdown
# Agents: {project/domain}

## Overview
{high-level description}

## Agent Hierarchy

### Architect
**Role:** {what}
**Scope:** {boundaries}
**Reports to:** {who}

### Planner
**Role:** {what}
**Scope:** {boundaries}
**Reports to:** {who}

### Executor
**Role:** {what}
**Scope:** {boundaries}
**Reports to:** {who}

## Protocols

### Handoffs
- Architect → Planner: {trigger}
- Planner → Executor: {trigger}

### Escalation
{how issues rise up}

## Constraints
{global constraints}
```

## Output Format

```
## Deepinit: {project}

### Project Analysis
- **Type:** {type}
- **Domains:** {list}
- **Complexity:** {level}

### Structure Created
```
{structure tree}
```

### Agents Defined
| Agent | Role | Level |
|-------|------|-------|
| {agent} | {role} | {level} |

### Skills Configured
| Skill | Agent | Trigger |
|-------|-------|---------|
| {skill} | {agent} | {trigger} |

### Files Created
- {file 1}
- {file 2}

### Integration Status
- [ ] Hierarchy defined
- [ ] Agents configured
- [ ] Skills mapped
- [ ] Protocols established
- [ ] Integration tested

### Next Steps
1. {step}
```

## Constraints

- Match structure to complexity
- Keep agents focused
- Clear boundaries
- Test the hierarchy
- Document rationale
