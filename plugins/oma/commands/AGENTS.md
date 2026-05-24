<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# commands

## Purpose
Contains 44 slash command definition files loaded by auggie. Each command is a Markdown file whose filename becomes the slash command name (e.g., `ralph.md` → `/oma:ralph`). Commands range from full orchestration pipelines to single-purpose utilities and skill invocations.

## Key Files
| File | Description |
|------|-------------|
| autopilot.md | Full automated pipeline: explore → plan → implement → verify |
| ralph.md | Persistence loop: execute → architect verify → PASS → done |
| ultrawork.md | Parallel multi-agent implementation (high throughput) |
| ultraqa.md | QA cycling: test, verify, fix, repeat until quality |
| ralplan.md | Consensus planning with Architect + Critic review |
| team.md | Coordinated team of N specialized agents |
| ralphthon.md | Extended ralph loop variant for long-running tasks |
| tdd.md | Test-driven development workflow |
| deepinit.md | Deep codebase initialization with hierarchical AGENTS.md generation |
| deslop.md | AI-slop cleaner: behavior-preserving deletion-first cleanup |
| deep-interview.md | Socratic deep interview before autonomous execution |
| science.md | Parallel scientist agents for comprehensive analysis |
| trace.md | Evidence-driven tracing with competing hypotheses |
| research.md | External documentation and web research |
| ask.md | Route questions to Claude, Codex, or Gemini |
| ccg.md | Claude-Codex-Gemini tri-model orchestration |
| plan.md | Strategic planning workflow |
| learner.md | Extract a learned skill from the current session |
| skillify.md | Turn a repeatable workflow into a reusable skill |
| skill.md | Manage local skills (list, add, remove, search) |
| skills.md | List available skills |
| setup.md | Install or refresh OMA plugin |
| update.md | Update OMA to latest version |
| doctor.md | Diagnose and fix OMA installation issues |
| config.md | Configure OMA settings |
| note.md | Write to the OMA notepad |
| status.md | Show current OMA session state and HUD |
| hud.md | Configure HUD display options |
| version.md | Display OMA version information |
| help.md | Show OMA help and command listing |
| cancel.md | Cancel any active OMA orchestration mode |
| session.md | Manage worktree dev environments for issues/PRs |
| session-search.md | Search session history |
| teleport.md | Navigate to a worktree session |
| notifications.md | Configure notification integrations |
| mcp-setup.md | Configure MCP servers |
| release.md | Generic release assistant |
| improve-codebase-architecture.md | Architectural improvement workflow |
| interview.md | Interactive interview workflow |
| wait.md | Pause execution until a condition is met |
| whatsnew.md | Show recent OMA changelog |
| visual-verdict.md | Structured visual QA verdict for screenshot comparisons |
| writer-memory.md | Agentic memory for writers |
| graph-provider.md | Graph provider configuration and context |

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
