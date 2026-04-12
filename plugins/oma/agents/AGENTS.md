<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# agents

## Purpose
Contains 19 agent definition files for auggie. Each file defines a specialized agent role via YAML frontmatter (`name`, `description`, `model`, `color`, `tools`) followed by an XML `Agent_Prompt` body. Agents cover the full OMA pipeline from exploration and planning through implementation, verification, and documentation.

## Key Files
| File | Description |
|------|-------------|
| oma-analyst.md | Requirements clarity and hidden constraints. Use for "analyze requirements", "find edge cases", and "identify risks" before implementation. |
| oma-architect.md | System design, architecture analysis, and implementation verification. Use for "design X", "analyze architecture", "debug root cause", and "verify implementation". |
| oma-code-reviewer.md | Comprehensive code review. Use for "review this code", "assess quality", and "find issues" in implementation. |
| oma-critic.md | Plan/design challenge and review. Use for "critique this plan", "challenge this design", and "find weaknesses". |
| oma-debugger.md | Root-cause analysis and failure diagnosis. Use for "debug this", "find the bug", and "diagnose failure". |
| oma-designer.md | UX and interaction design. Use for "design this feature", "UX review", and "interaction design". |
| oma-doc-specialist.md | SDK/API/docs lookup. Use for "find docs", "look up API", and "get documentation". |
| oma-executor.md | Implementation specialist. Writes, edits, and verifies code. Use for "implement X", "add Y", "refactor Z", and all code changes. |
| oma-explorer.md | Fast codebase search, file mapping, and code pattern discovery. Use for "where is X?", "which files contain Y?", and "how does Z connect?" questions. |
| oma-git-master.md | Commit strategy and history hygiene. Use for "git strategy", "commit message review", and "history cleanup". |
| oma-planner.md | Strategic planning with structured consultation. Creates clear, actionable 3-6 step plans with acceptance criteria. |
| oma-qa.md | Runtime/manual validation. Use for "QA this", "manual test", and "runtime validation". |
| oma-scientist.md | Data analysis and statistical reasoning. Use for "analyze this data", "find patterns", and "statistical analysis". |
| oma-security.md | Trust boundaries and vulnerabilities. Use for "security review", "find vulnerabilities", and "assess trust boundaries". |
| oma-simplifier.md | Behavior-preserving simplification. Use for "simplify this", "reduce complexity", and "clean up without changing behavior". |
| oma-test-engineer.md | Testing strategy and regression coverage. Use for "add tests", "improve test coverage", and "design testing strategy". |
| oma-tracer.md | Trace gathering and evidence capture. Use for "trace this", "gather evidence", and "capture execution flow". |
| oma-verifier.md | Completion evidence and validation. Use for "verify this works", "check completion", and "gather evidence" after implementation. |
| oma-writer.md | Documentation and concise content. Use for "write docs", "update README", and "create content". |

## For AI Agents
### Working In This Directory
When adding a new agent, copy an existing `.md` file as a template and update the YAML frontmatter fields (`name`, `description`, `model`, `color`, `tools`). Do NOT alter the XML `Agent_Prompt` structure or element names. After adding a new file, run `auggie plugin install` to register the agent with the runtime.

Model choices: `claude-opus-4-6` for complex reasoning (analyst, architect, code-reviewer, critic, planner, simplifier), `sonnet4.6` for standard work (debugger, designer, doc-specialist, executor, git-master, qa, scientist, security, test-engineer, tracer, verifier), `haiku4.5` for fast/cheap tasks (explorer, writer).

### Testing Requirements
No automated tests cover agent definition files directly. After adding or modifying an agent, verify it loads correctly by running `/oma:status` inside an auggie session.

### Common Patterns
- YAML frontmatter is the agent identity; the XML body is the behavioral prompt.
- Color values are used by the OMA HUD for visual identification.
- `tools` in frontmatter restricts which auggie tools the agent can invoke.

## Dependencies
### Internal
- `../hooks/hooks.json` — hooks that fire on agent tool use
- `../commands/` — commands that delegate to agents

### External
- auggie CLI — loads and executes agent definitions at session start

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
