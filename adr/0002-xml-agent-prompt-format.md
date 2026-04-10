# ADR 0002: XML-Tagged Agent Prompt Format for OMA Agents

**Date:** 2026-04-10
**Status:** Proposed
**Deciders:** oh-my-auggie team

## Context

OMA agent definition files (in `plugins/oma/agents/`) currently use plain markdown with `## Section:` headers. This format lacks machine-readable structure, making it difficult to:
- Parse agent capabilities programmatically
- Enforce consistent sections across agents
- Automatically validate agent definitions
- Generate agent documentation from structured data

A richer XML-tagged format already exists in the OMC agent definitions (`~/.claude/plugins/marketplaces/omc/agents/analyst.md`) using tags like `<Role>`, `<Why_This_Matters>`, `<Investigation_Protocol>`, `<Tool_Usage>`, `<Output_Format>`, `<Failure_Modes_To_Avoid>`, `<Examples>`, and `<Final_Checklist>`.

## Decision

All 19 OMA agent definition files in `plugins/oma/agents/` will be migrated to the XML-tagged format wrapped in `<Agent_Prompt>...</Agent_Prompt>` tags.

**Mandatory sections for all agents:**

| Tag | Purpose |
|-----|---------|
| `<Role>` | One-line role description (what the agent specializes in) |
| `<Why_This_Matters>` | 2-3 sentences on why this role's work matters to the project |
| `<Success_Criteria>` | Bulleted list of what "good work" looks like for this agent |
| `<Constraints>` | Direct constraints on tools, behavior, and approach |
| `<Output_Format>` | The structured output format the agent produces |
| `<Failure_Modes_To_Avoid>` | Common failure patterns specific to this agent |
| `<Examples>` | 1-3 `<Good>`/`<Bad>` example output pairs |
| `<Final_Checklist>` | Agent-specific pre-completion checklist |

**Optional sections by agent type:**

| Tag | Applies To |
|-----|-----------|
| `<Investigation_Protocol>` | Agents with multi-step investigation processes |
| `<Tool_Usage>` | Agents with constrained or non-default tool sets |
| `<Execution_Policy>` | Agents with restricted tool access |
| `<Consensus_RALPLAN_DR_Protocol>` | oma-architect, oma-critic, oma-planner |
| `<Open_Questions>` | oma-analyst, oma-planner |

**Format rules:**
1. All agent content goes inside `<Agent_Prompt>...</Agent_Prompt>` after the YAML frontmatter
2. Tags must be properly nested and closed
3. `<Examples>` uses `<Good>` and `<Bad>` sub-tags
4. No markdown `## Section:` headers inside `<Agent_Prompt>` blocks
5. The YAML frontmatter (name, description, model, color, tools, disabled_tools) remains unchanged

## Consequences

1. **Parseable**: Agent files can now be parsed as structured documents, enabling tooling
2. **Enforceable**: The `adr-enforce.ts` hook can validate XML structure on commits
3. **Consistent**: All 19 agents follow the same section structure
4. **Self-documenting**: `<Examples>` and `<Final_Checklist>` make agent behavior explicit
5. **Migration cost**: All 19 files need mechanical conversion (one-time cost)

## Alternatives Considered

### Option A: Keep plain markdown (rejected)
Plain markdown is human-readable but machine-parseable only with fragile regex. It does not support nested examples or structured constraints.

### Option B: JSON schema (rejected)
JSON is machine-friendly but poor for human authors. Agent prompts are primarily human-authored documentation that also happens to be machine-readable.

### Option C: XML-tagged format (chosen)
Strikes the right balance: structured enough for tooling, readable enough for human authors. Already proven in OMA skill definitions.

## Links

- Existing example: `~/.claude/plugins/marketplaces/omc/agents/analyst.md`
- ADR enforcement hook: `plugins/oma/src/hooks/adr-enforce.ts`