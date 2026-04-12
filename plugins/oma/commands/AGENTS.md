<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# commands

## Purpose
Contains 44 slash command definition files loaded by auggie. Each command is a Markdown file whose filename becomes the slash command name (e.g., `oma-ralph.md` → `/oma:ralph`). Commands range from full orchestration pipelines to single-purpose utilities and skill invocations.

## Key Files
| File | Description |
|------|-------------|
| oma-autopilot.md | Full automated pipeline: explore → plan → implement → verify |
| oma-ralph.md | Persistence loop: execute → architect verify → PASS → done |
| oma-ultrawork.md | Parallel multi-agent implementation (high throughput) |
| oma-ultraqa.md | QA cycling: test, verify, fix, repeat until quality |
| oma-ralplan.md | Consensus planning with Architect + Critic review |
| oma-team.md | Coordinated team of N specialized agents |
| oma-ralphthon.md | Extended ralph loop variant for long-running tasks |
| oma-tdd.md | Test-driven development workflow |
| oma-deepinit.md | Deep codebase initialization with hierarchical AGENTS.md generation |
| oma-deslop.md | AI-slop cleaner: behavior-preserving deletion-first cleanup |
| oma-deep-interview.md | Socratic deep interview before autonomous execution |
| oma-science.md | Parallel scientist agents for comprehensive analysis |
| oma-trace.md | Evidence-driven tracing with competing hypotheses |
| oma-research.md | External documentation and web research |
| oma-ask.md | Route questions to Claude, Codex, or Gemini |
| oma-ccg.md | Claude-Codex-Gemini tri-model orchestration |
| oma-plan.md | Strategic planning workflow |
| oma-learner.md | Extract a learned skill from the current session |
| oma-skillify.md | Turn a repeatable workflow into a reusable skill |
| oma-skill.md | Manage local skills (list, add, remove, search) |
| oma-skills.md | List available skills |
| oma-setup.md | Install or refresh OMA plugin |
| oma-update.md | Update OMA to latest version |
| oma-doctor.md | Diagnose and fix OMA installation issues |
| oma-config.md | Configure OMA settings |
| oma-note.md | Write to the OMA notepad |
| oma-status.md | Show current OMA session state and HUD |
| oma-hud.md | Configure HUD display options |
| oma-version.md | Display OMA version information |
| oma-help.md | Show OMA help and command listing |
| oma-cancel.md | Cancel any active OMA orchestration mode |
| oma-session.md | Manage worktree dev environments for issues/PRs |
| oma-session-search.md | Search session history |
| oma-teleport.md | Navigate to a worktree session |
| oma-notifications.md | Configure notification integrations |
| oma-mcp-setup.md | Configure MCP servers |
| oma-release.md | Generic release assistant |
| oma-improve-codebase-architecture.md | Architectural improvement workflow |
| oma-interview.md | Interactive interview workflow |
| oma-wait.md | Pause execution until a condition is met |
| oma-whatsnew.md | Show recent OMA changelog |
| oma-visual-verdict.md | Structured visual QA verdict for screenshot comparisons |
| oma-writer-memory.md | Agentic memory for writers |
| oma-graph-provider.md | Graph provider configuration and context |

## For AI Agents
### Working In This Directory
When adding a new command, create a new `.md` file following the existing naming convention (`oma-<name>.md`). The file content becomes the command prompt loaded by auggie. The filename (without `.md`) is the command name used after the `oma:` prefix.

### Testing Requirements
Commands are loaded by auggie at runtime. Verify a new command loads by running `/oma:help` or `/oma:<name>` in a live auggie session after rebuild.

### Common Patterns
- Orchestration commands (autopilot, ralph, ultrawork, team) delegate to multiple agents.
- Utility commands (note, status, config) operate on OMA state directly.
- Skill commands (tdd, deslop, trace) invoke specialized single-purpose workflows.

## Dependencies
### Internal
- `../agents/` — agent definitions invoked by orchestration commands
- `../skills/` — skill SKILL.md files invoked by skill commands

### External
- auggie CLI — loads command files and routes `/oma:<name>` invocations

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
