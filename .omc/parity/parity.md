# OMC vs OMA Parity Comparison

**Generated:** 2026-04-05
**OMC Source:** `~/.claude/plugins/marketplaces/omc/` (TypeScript plugin + markdown skills)
**OMA Source:** `plugins/oma/` (Augment Code plugin with markdown agents/commands/skills)

---

## Commands

> **Note on OMC Commands:** OMC is a TypeScript plugin; it does not ship a `commands/` directory of `.md` files. Instead, slash commands are provided via **markdown skills** in `~/.claude/plugins/marketplaces/omc/skills/` (registered at `~/.claude/commands/` by the OMC setup script), plus **4 CLI commands** (`doctor-conflicts`, `ralphthon`, `session-search`, `team`, `teleport`, `wait`) in `src/cli/commands/`.

### OMC Slash Commands (markdown skills, registered as commands)

| Command | OMC | OMA | Status |
|---------|-----|-----|--------|
| `ask` | yes | `oma-ask.md` | **Ported** |
| `autopilot` | yes | `oma-autopilot.md` | **Ported** |
| `cancel` | yes | `oma-cancel.md` | **Ported** |
| `ccg` | yes | `oma-ccg.md` | **Ported** |
| `deepinit` | yes | `oma-deepinit.md` | **Ported** |
| `deslop` | yes | `oma-deslop.md` | **Ported** |
| `doctor` | yes | `oma-doctor.md` | **Ported** |
| `help` | yes | `oma-help.md` | **Ported** |
| `hud` | yes | `oma-hud.md` | **Ported** |
| `interview` | yes | `oma-interview.md` | **Ported** |
| `learner` | yes | `oma-learner.md` | **Ported** |
| `mcp-setup` | yes | `oma-mcp-setup.md` | **Ported** |
| `note` | yes | `oma-note.md` | **Ported** |
| `notifications` | yes | `oma-notifications.md` | **Ported** |
| `oma-ask` | — | yes | **OMA-specific** |
| `oma-autopilot` | — | yes | **OMA-specific** |
| `oma-cancel` | — | yes | **OMA-specific** |
| `oma-ccg` | — | yes | **OMA-specific** |
| `oma-deep-interview` | — | yes | **OMA-specific** |
| `oma-deepinit` | — | yes | **OMA-specific** |
| `oma-deslop` | — | yes | **OMA-specific** |
| `oma-doctor` | — | yes | **OMA-specific** |
| `oma-help` | — | yes | **OMA-specific** |
| `oma-hud` | — | yes | **OMA-specific** |
| `oma-interview` | — | yes | **OMA-specific** |
| `oma-learner` | — | yes | **OMA-specific** |
| `oma-mcp-setup` | — | yes | **OMA-specific** |
| `oma-note` | — | yes | **OMA-specific** |
| `oma-notifications` | — | yes | **OMA-specific** |
| `oma-plan` | — | yes | **OMA-specific** |
| `oma-ralph` | — | yes | **OMA-specific** |
| `oma-ralphthon` | — | yes | **OMA-specific** |
| `oma-ralplan` | — | yes | **OMA-specific** |
| `oma-release` | — | yes | **OMA-specific** |
| `oma-research` | — | yes | **OMA-specific** |
| `oma-science` | — | yes | **OMA-specific** |
| `oma-session-search` | — | yes | **OMA-specific** |
| `oma-session` | — | yes | **OMA-specific** |
| `oma-setup` | — | yes | **OMA-specific** |
| `oma-skill` | — | yes | **OMA-specific** |
| `oma-skills` | — | yes | **OMA-specific** |
| `oma-status` | — | yes | **OMA-specific** |
| `oma-team` | — | yes | **OMA-specific** |
| `oma-teleport` | — | yes | **OMA-specific** |
| `oma-trace` | — | yes | **OMA-specific** |
| `oma-ultraqa` | — | yes | **OMA-specific** |
| `oma-ultrawork` | — | yes | **OMA-specific** |
| `oma-visual-verdict` | — | yes | **OMA-specific** |
| `oma-wait` | — | yes | **OMA-specific** |
| `oma-writer-memory` | — | yes | **OMA-specific** |
| `plan` | yes | `oma-plan.md` | **MISSING** — port needed |
| `ralph` | yes | `oma-ralph.md` | **MISSING** — port needed |
| `ralphthon` | CLI only | `oma-ralphthon.md` | **MISSING** — CLI port needed |
| `release` | yes | `oma-release.md` | **Ported** |
| `research` | yes | `oma-research.md` | **Ported** |
| `science` | yes | `oma-science.md` | **Ported** |
| `session` | yes | `oma-session.md` | **Ported** |
| `session-search` | CLI only | `oma-session-search.md` | **Ported** |
| `setup` | yes | `oma-setup.md` | **Ported** |
| `skill` | yes | `oma-skill.md` | **Ported** |
| `skills` | yes | `oma-skills.md` | **MISSING** — list-all-skills command port needed |
| `status` | yes | `oma-status.md` | **MISSING** — status command port needed |
| `team` | yes | `oma-team.md` | **Ported** |
| `teleport` | CLI only | `oma-teleport.md` | **Ported** |
| `trace` | yes | `oma-trace.md` | **Ported** |
| `ultraqa` | yes | `oma-ultraqa.md` | **Ported** |
| `ultrawork` | yes | `oma-ultrawork.md` | **Ported** |
| `visual-verdict` | yes | `oma-visual-verdict.md` | **Ported** |
| `wait` | CLI only | `oma-wait.md` | **Ported** |
| `writer-memory` | yes | `oma-writer-memory.md` | **Ported** |

**Summary:** 3 commands missing from OMA (`plan`, `ralph`, `skills`/`status`). 41 OMA-specific `oma-*` prefixed commands exist for Auggie namespace isolation.

---

## Skills

> **Note on OMC Skills:** OMC skills are markdown `.md` files in `~/.claude/plugins/marketplaces/omc/skills/` (same files that double as slash commands). OMA skills are in `plugins/oma/skills/` with `SKILL.md` per directory.

### OMC Skills vs OMA Skills

| Skill | OMC | OMA | Status |
|-------|-----|-----|--------|
| `ai-slop-cleaner` | yes | **MISSING** | **Needs porting** |
| `ask` | yes | yes | **Ported** |
| `autopilot` | yes | yes | **Ported** |
| `cancel` | — | **MISSING** | **Needs porting** — mode-cancellation skill |
| `ccg` | yes | yes | **Ported** |
| `configure-notifications` | yes | **MISSING** | **Needs porting** — notification config |
| `debug` | — | yes | **OMA-specific** |
| `deep-dive` | yes | yes | **Ported** |
| `deep-interview` | yes | yes | **Ported** |
| `deepinit` | yes | yes | **Ported** |
| `deslop` | yes | yes | **Ported** |
| `doctor` | yes | yes | **Ported** |
| `external-context` | yes | yes | **Ported** |
| `hud` | yes | yes | **Ported** |
| `learner` | yes | yes | **Ported** |
| `mcp-setup` | yes | yes | **Ported** |
| `note` | — | yes | **OMA-specific** |
| `notifications` | yes | yes | **Ported** |
| `omc-doctor` | yes | **MISSING** | **Needs porting** — OMC installation diagnostics |
| `omc-reference` | yes | **MISSING** | **Needs porting** — OMC full reference |
| `omc-setup` | yes | **MISSING** | **Needs porting** — initial OMC setup wizard |
| `omc-teams` | yes | **MISSING** | **Needs porting** — team orchestration skill |
| `plan` | yes | yes | **Ported** |
| `project-session-manager` | yes | **MISSING** | **Needs porting** — cross-project session mgmt |
| `ralplan` | yes | yes | **Ported** |
| `release` | yes | yes | **Ported** |
| `remember` | — | yes | **OMA-specific** |
| `research` | yes | yes | **Ported** |
| `science` | yes | yes | **Ported** |
| `sciomc` | yes | **MISSING** | **Low priority** — OMC research agent |
| `self-improve` | — | yes | **OMA-specific** |
| `session` | yes | yes | **Ported** |
| `setup` | yes | yes | **Ported** |
| `skill` | yes | yes | **Ported** |
| `team` | yes | yes | **Ported** |
| `trace` | yes | yes | **Ported** |
| `ultraqa` | yes | yes | **Ported** |
| `ultrawork` | yes | yes | **Ported** |
| `verify` | — | yes | **OMA-specific** |
| `visual-verdict` | yes | yes | **Ported** |
| `writer-memory` | yes | yes | **Ported** |

**Summary:** 8 skills missing from OMA. 4 OMA-specific skills (`cancel`, `configure-notifications`, `omc-doctor`, `omc-reference`, `omc-setup`, `omc-teams`, `project-session-manager`, `sciomc`) are OMC-internal tools that may or may not belong in OMA. 4 skills are OMA-specific (`debug`, `note`, `remember`, `verify`).

---

## Agents

> **Note on OMC Agents:** OMC agents are TypeScript template functions defined in `src/agents/`. OMA agents are markdown `.md` files in `plugins/oma/agents/`.

### OMC Agents vs OMA Agents

| Agent | OMC | OMA | Status |
|-------|-----|-----|--------|
| `analyst` | yes | `oma-analyst.md` | **Ported** |
| `architect` | yes | `oma-architect.md` | **Ported** |
| `code-reviewer` | yes | `oma-code-reviewer.md` | **Ported** |
| `code-simplifier` | yes | `oma-simplifier.md` | **Ported** (renamed) |
| `critic` | yes | `oma-critic.md` | **Ported** |
| `debugger` | yes | `oma-debugger.md` | **Ported** |
| `designer` | yes | `oma-designer.md` | **Ported** |
| `document-specialist` | yes | `oma-doc-specialist.md` | **Ported** |
| `executor` | yes | `oma-executor.md` | **Ported** |
| `explore` | yes | `oma-explorer.md` | **Ported** |
| `git-master` | yes | `oma-git-master.md` | **Ported** |
| `planner` | yes | `oma-planner.md` | **Ported** |
| `qa-tester` | yes | `oma-qa.md` | **Ported** (renamed) |
| `scientist` | yes | `oma-scientist.md` | **Ported** |
| `security-reviewer` | yes | `oma-security.md` | **Ported** |
| `test-engineer` | yes | `oma-test-engineer.md` | **Ported** |
| `tracer` | yes | `oma-tracer.md` | **Ported** |
| `verifier` | yes | `oma-verifier.md` | **Ported** |
| `writer` | yes | `oma-writer.md` | **Ported** |

**Summary:** Full agent parity. All 19 OMC agents are ported to OMA. Naming is consistent (no `oma-` prefix collisions since agents live in separate directories).

---

## Hooks

> **Note on OMC Hooks:** OMC uses a JSON `hooks.json` registry that maps hook types (`UserPromptSubmit`, `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, `SessionEnd`, etc.) to Node.js scripts. OMA uses a similar JSON registry plus shell scripts.

### OMC Hooks vs OMA Hooks

| Hook | Type | OMC | OMA | Status |
|------|------|-----|-----|--------|
| `adr-enforce` | PreToolUse | OMC only | yes | **Both** — OMA has its own implementation |
| `agent-usage-reminder` | PostToolUse | yes | **MISSING** | **Needs porting** |
| `agents-overlay` | PreToolUse | yes | **MISSING** | **Needs porting** — show active agents in HUD |
| `approval-gate` | PreToolUse | OMC only | yes | **Both** — different implementations |
| `auto-slash-command` | PreToolUse | yes | **MISSING** | **Low priority** — OMA uses .md command files directly |
| `background-notification` | PostToolUse | yes | **MISSING** | **Needs porting** |
| `beads-context` | UserPromptSubmit | yes | **MISSING** | **Low priority** — OMC-specific context optimization |
| `bridge-normalize` | UserPromptSubmit | yes | **MISSING** | **Low priority** |
| `code-simplifier` | Stop | yes | **MISSING** | **Needs porting** |
| `comment-checker` | PostToolUse | yes | **MISSING** | **Low priority** |
| `context-guard-stop` | Stop | yes | **MISSING** | **Needs porting** |
| `cost-track` | PostToolUse | OMC only | yes | **Both** — different implementations |
| `deep-interview` | Stop | yes | **MISSING** | **Needs porting** |
| `delegation-enforce` | PreToolUse | OMC only | yes | **Both** — OMA-specific delegation enforcement |
| `directory-readme-injector` | PostToolUse | yes | **MISSING** | **Low priority** |
| `empty-message-sanitizer` | PostToolUse | yes | **MISSING** | **Low priority** |
| `factcheck` | PostToolUse | yes | **MISSING** | **Needs porting** |
| `keyword-detect` | PostToolUse | yes | yes | **Both** — different implementations |
| `keyword-detector` | UserPromptSubmit | yes | **MISSING** | **Low priority** (OMC uses JS, OMA uses shell) |
| `learner` | PostToolUse | yes | **MISSING** | **Needs porting** — update CLAUDE.md from session |
| `mode-registry` | various | yes | **MISSING** | **Needs porting** — track active modes |
| `non-interactive-env` | SessionStart | yes | **MISSING** | **Low priority** |
| `notepad` | various | yes | **MISSING** | **Needs porting** — notepad auto-sync |
| `omc-orchestrator` | various | yes | **MISSING** | **Low priority** — OMC-specific |
| `permission-handler` | PermissionRequest | yes | **MISSING** | **Needs porting** |
| `persistent-mode` | Stop | yes | **MISSING** | **Needs porting** |
| `plugin-patterns` | UserPromptSubmit | yes | **MISSING** | **Low priority** |
| `pre-compact` | PreCompact | yes | **MISSING** | **Needs porting** |
| `preemptively-compaction` | PostToolUse | yes | **MISSING** | **Low priority** |
| `pre-tool-enforcer` | PreToolUse | yes | **MISSING** | **Needs porting** |
| `project-memory` | various | yes | **MISSING** | **Needs porting** — session/posttool/precompact |
| `ralph` | Stop | yes | **MISSING** | **Needs porting** — ralph mode stop logic |
| `recovery` | PostToolUseFailure | yes | **MISSING** | **Needs porting** |
| `rules-injector` | UserPromptSubmit | yes | **MISSING** | **Low priority** |
| `session-end` | SessionEnd | yes | **MISSING** | **Needs porting** |
| `session-start` | SessionStart | yes | yes | **Both** — different implementations |
| `setup` | SessionStart | yes | **MISSING** | **Low priority** |
| `skill-injector` | UserPromptSubmit | yes | **MISSING** | **Low priority** |
| `skill-state` | various | yes | **MISSING** | **Low priority** |
| `stop-gate` | Stop | OMC only | yes | **Both** — OMA-specific stop gate |
| `subagent-tracker` | SubagentStart/Stop | yes | **MISSING** | **Needs porting** |
| `team-dispatch-hook` | various | yes | **MISSING** | **Needs porting** — team pipeline dispatch |
| `team-leader-nudge-hook` | various | yes | **MISSING** | **Needs porting** |
| `team-pipeline` | various | yes | **MISSING** | **Needs porting** |
| `team-worker-hook` | various | yes | **MISSING** | **Needs porting** |
| `think-mode` | Stop | yes | **MISSING** | **Low priority** |
| `thinking-block-validator` | PostToolUse | yes | **MISSING** | **Low priority** |
| `todo-continuation` | PostToolUse | yes | **MISSING** | **Needs porting** |
| `ultraqa` | Stop | yes | **MISSING** | **Needs porting** |
| `ultrawork` | Stop | yes | **MISSING** | **Needs porting** |
| `verify-deliverables` | SubagentStop | yes | **MISSING** | **Needs porting** |

**Summary:** OMA has 4 hooks that OMC lacks (`delegation-enforce`, `stop-gate`, `adr-enforce`, `approval-gate`, `cost-track`) — all enterprise-grade enforcement hooks. OMC has ~40 hooks OMA is missing, many low-priority or OMC-platform-specific.

---

## Gap Summary

### Priority: High (Core orchestration features)

| Category | Item | Action |
|----------|------|--------|
| commands | `plan` command | Port from OMC skills/plan |
| commands | `ralph` command | Port from OMC skills/ralph |
| commands | `oma-skills` (list-all) | Port from OMC skills/skills |
| commands | `oma-status` command | Port from OMC skills/status |
| skills | `ai-slop-cleaner` | Port from OMC skills/ai-slop-cleaner |
| hooks | `keyword-detect` / `keyword-detector` | OMA already has; verify parity |
| hooks | `session-end` | Port from OMC scripts/session-end.mjs |
| hooks | `persistent-mode` | Port from OMC scripts/persistent-mode.cjs |
| hooks | `project-memory` (session, posttool, precompact) | Port from OMC scripts |
| hooks | `pre-tool-enforcer` | Port from OMC scripts/pre-tool-enforcer.mjs |
| hooks | `permission-handler` | Port from OMC scripts/permission-handler.mjs |
| hooks | `learner` (CLAUDE.md update) | Port from OMC hooks/learner |
| hooks | `subagent-tracker` | Port from OMC scripts/subagent-tracker.mjs |

### Priority: Medium

| Category | Item | Action |
|----------|------|--------|
| skills | `cancel` | Port as OMA mode-cancellation skill |
| skills | `omc-teams` | Evaluate — may not apply to Auggie |
| skills | `project-session-manager` | Evaluate — may not apply |
| hooks | `ralph` (mode stop logic) | Port ralph-mode Stop hook |
| hooks | `mode-registry` | Port mode tracking hook |
| hooks | `notepad` | Port notepad auto-sync hook |
| hooks | `code-simplifier` | Port Stop hook from OMC scripts |
| hooks | `context-guard-stop` | Port from OMC scripts |
| hooks | `ultraqa` / `ultrawork` Stop hooks | Port mode Stop hooks |
| hooks | `pre-compact` | Port PreCompact hook |
| hooks | `todo-continuation` | Port PostToolUse hook |
| hooks | `recovery` | Port PostToolUseFailure hook |
| hooks | `deep-interview` | Port Stop hook |

### Priority: Low / OMC-specific (may not belong in OMA)

| Category | Item | Reason |
|----------|------|--------|
| skills | `omc-doctor` | OMC installation diagnostics only |
| skills | `omc-reference` | OMC internal reference |
| skills | `omc-setup` | OMC setup wizard only |
| skills | `sciomc` | OMC research agent |
| hooks | `agents-overlay` | OMC agent HUD overlay |
| hooks | `auto-slash-command` | OMC TypeScript skill routing |
| hooks | `beads-context` | OMC context optimization |
| hooks | `bridge-normalize` | OMC cross-platform bridging |
| hooks | `omc-orchestrator` | OMC orchestration core |
| hooks | `setup` | OMC init hook |
| hooks | `skill-injector` | OMC skill routing |
| hooks | `skill-state` | OMC skill state tracking |
| hooks | `team-dispatch-hook` / `team-leader-nudge-hook` / `team-worker-hook` / `team-pipeline` | OMC native team orchestration |
| hooks | `think-mode` | OMC thinking mode |
| hooks | `agent-usage-reminder` | OMC cost tracking |
| hooks | `background-notification` | OMC background notification |
| hooks | `non-interactive-env` | OMC CI/CD support |
| hooks | `plugin-patterns` | OMC pattern injection |
| hooks | `rules-injector` | OMC rules injection |
| hooks | `thinking-block-validator` | OMC response validation |
| hooks | `comment-checker` | OMC comment quality |
| hooks | `directory-readme-injector` | OMC auto-docs |
| hooks | `empty-message-sanitizer` | OMC UX |

### OMA-Specific (Not Needed in OMC)

| Item | Category | Reason |
|------|----------|--------|
| `oma-*` prefixed commands (41) | commands | Auggie namespace isolation — correct |
| `debug` skill | skills | OMA debugging skill |
| `note` skill | skills | OMA note-taking skill |
| `remember` skill | skills | OMA memory skill |
| `verify` skill | skills | OMA verification skill |
| `delegation-enforce` hook | hooks | OMA direct-edit blocking |
| `stop-gate` hook | hooks | OMA architect PASS gate |
| `adr-enforce` hook | hooks | OMA ADR enforcement |
| `approval-gate` hook | hooks | OMA enterprise approval |
| `cost-track` hook | hooks | OMA cost tracking |

---

## SPEC.md Planned Items

Per `SPEC.md`, the following are already documented as planned/deferred:

- `keywords-detect` / `canceloma` keyword: already implemented as `keyword-detect.mjs` hook
- Enterprise hooks (`adr-enforce`, `approval-gate`, `cost-track`): implemented
- `delegation-enforce` hook: implemented
- `stop-gate` hook: implemented
- Team tmux workers: noted as "External CLI" in v0.2, native approach is future work

No SPEC.md items conflict with the gap analysis above.

---

## Totals

| Category | OMC | OMA | Ported | Missing | OMA-Specific | OMC-Only |
|----------|-----|-----|--------|---------|-------------|---------|
| Commands | 33 | 75 | 24 | 4 | 41 | 9 |
| Skills | 38 | 32 | 24 | 8 | 4 | 10 |
| Agents | 19 | 19 | 19 | 0 | 0 | 0 |
| Hooks | ~50 | 8 | 1 | ~40 | 7 | ~43 |
