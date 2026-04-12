<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# skills

## Purpose
Contains 36 skill subdirectories. Each subdirectory holds a `SKILL.md` file with the full workflow instructions for that skill. Skills are invoked by auggie commands and provide focused, reusable workflows (e.g., TDD, deslop, deep-interview). Individual skill subdirectories are self-documenting via their own `SKILL.md` and do not have child `AGENTS.md` files.

## Key Files
| File | Description |
|------|-------------|
| ask/ | Route questions to Claude, Codex, or Gemini and synthesize results |
| ccg/ | Claude-Codex-Gemini tri-model orchestration workflow |
| debug/ | Diagnose OMA session or repo state using logs and traces |
| deep-dive/ | Two-stage pipeline: trace (causal) → deep-interview (requirements) |
| deep-interview/ | Socratic interview with ambiguity gating before autonomous execution |
| deepinit/ | Deep codebase initialization generating hierarchical AGENTS.md docs |
| deslop/ | AI-slop cleaner: regression-safe, deletion-first cleanup workflow |
| doctor/ | Diagnose and fix OMA installation issues |
| external-context/ | Parallel document-specialist agents for web/docs lookup |
| graph-context/ | Graph provider context integration workflow |
| hud/ | Configure HUD display options (layout, presets, elements) |
| improve-codebase-architecture/ | Architectural improvement analysis and planning |
| interactive-menu/ | Interactive menu navigation workflow |
| interview/ | General interview workflow |
| learner/ | Extract a learned skill from the current session |
| mcp-setup/ | Configure MCP servers for enhanced agent capabilities |
| note/ | Write to the OMA notepad |
| notifications/ | Configure notification integrations (Telegram, Discord, Slack) |
| plan/ | Strategic planning with optional interview workflow |
| ralplan/ | Consensus planning: Architect + Critic review before execution |
| release/ | Generic release assistant analyzing repo release rules |
| remember/ | Review reusable project knowledge for memory/notepad/docs |
| research/ | External documentation and web research workflow |
| science/ | Parallel scientist agents for comprehensive analysis |
| self-improve/ | Autonomous evolutionary code improvement with tournament selection |
| session/ | Worktree-first dev environment manager for issues/PRs |
| setup/ | Install or refresh OMA plugin |
| skill/ | Manage local skills (list, add, remove, search, edit) |
| tdd/ | Test-driven development workflow before writing implementation code |
| team/ | N coordinated agents on shared task list (native teams) |
| trace/ | Evidence-driven tracing with competing hypotheses |
| ultraqa/ | QA cycling: test, verify, fix, repeat until goal met |
| ultrawork/ | Parallel execution engine for high-throughput task completion |
| verify/ | Verify a change really works before claiming completion |
| visual-verdict/ | Structured visual QA verdict for screenshot-to-reference comparisons |
| writer-memory/ | Agentic memory system for writers (characters, scenes, themes) |

## For AI Agents
### Working In This Directory
When adding a new skill, create a `skills/<name>/` directory containing a single `SKILL.md` file. The `SKILL.md` provides the full workflow instructions loaded by auggie when the skill is invoked. Do NOT create child `AGENTS.md` files inside skill subdirectories — each already has `SKILL.md` as its documentation.

### Testing Requirements
Skills are loaded at runtime by auggie. After adding a skill, verify it appears in `/oma:skills` and can be invoked via `/oma:<name>`.

### Common Patterns
- Each skill directory contains exactly one `SKILL.md`.
- `SKILL.md` files follow progressive disclosure: brief summary at top, detailed workflow below.
- Skills are invoked either directly (e.g., `/oma:tdd`) or by orchestration commands.

## Dependencies
### Internal
- `../commands/` — command files that invoke skills

### External
- auggie CLI — discovers and loads skills from this directory

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
