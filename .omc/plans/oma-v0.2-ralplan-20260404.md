# RALPLAN: oh-my-auggie v0.2 Full Implementation

**Date:** 2026-04-04
**Status:** Approved for team execution
**Approver:** User
**Execution mode:** Team (3 parallel lanes)

---

## Decision

Build all remaining v0.2 components for oh-my-auggie using coordinated team execution with 3 parallel lanes.

**Why team over sequential ralph:**
- Scope is large (23 commands + 15 agents + skills + enterprise hooks)
- Independent component categories enable true parallelism
- Demonstrates OMA's own team orchestration working in the OMA repo itself
- Time-to-market critical for marketplace credibility

## Principles

1. **Plugin-first**: All OMA capabilities as Auggie plugin primitives
2. **Zero dependencies**: MCP server uses no npm deps — pure Node.js stdio
3. **Additive only**: Enterprise profile adds rules without restricting community
4. **Bats-first**: Every new command/agent ships with e2e test coverage
5. **Parallel execution**: Independent components built concurrently

## Decision Drivers

1. **Auggie marketplace credibility** — v0.1 skeleton; v0.2 (19 agents, 28 commands) makes OMA marketplace-ready
2. **Migration parity** — OMC users expect full command/agent parity; missing skills/commands break workflows
3. **Time-to-market** — Parallel team minimizes wall clock time

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Sequential ralph | thorough verification, clean commits | slow (~30+ stories), serial | Rejected |
| Coordinated team | fastest, demonstrates OMA | coordination overhead | **Chosen** |
| Hybrid (cmds+agents parallel, skills seq) | balanced | suboptimal splitting | Rejected |

## Viable Options

### Option A: Sequential ralph (rejected)
Build story-by-story with architect verification per story. Too slow for 30+ items.

### Option B: Coordinated team (chosen)
Three parallel lanes, clear task boundaries, coordinator tracks cross-lane dependencies.

## Implementation Scope

### Lane A: Commands + Hooks (Priority order)
1. `/oma:deslop` (P0) — Anti-slop cleanup
2. `/oma:ultrawork` (P0) — Parallel subagent execution
3. `/oma:ralplan` (P0) — Consensus planning
4. `/oma:plan` (P0) — Strategic planning
5. `/oma:team` (P0) — N coordinated agents
6. `/oma:ultraqa` (P1) — QA cycling
7. `/oma:ccg` (P1) — Tri-model orchestration
8. `/oma:ask` (P1) — Query specific model
9. `/oma:note` (P2) — Write to notepad
10. `/oma:doctor` (P2) — Diagnose install issues
11. `/oma:setup` (P2) — Install/refresh OMA
12. `/oma:mcp-setup` (P3) — Configure MCP servers
13. `/oma:hud` (P3) — HUD display config
14. `/oma:trace` (P3) — Causal tracing
15. `/oma:release` (P3) — Automated release
16. `/oma:session` (P3) — Worktree dev env
17. `/oma:skill` (P1) — Skill management
18. `/oma:writer-memory` (P4) — Writer memory
19. `/oma:notifications` (P4) — Notifications
20. `/oma:science` (P2) — Research workflow
21. `/oma:research` (P2) — Parallel docs lookup
22. `/oma:deepinit` (P2) — AGENTS.md generation
23. `/oma:interview` (P2) — Socratic requirements
24. `/oma:visual-verdict` (P3) — Visual QA
25. `/oma:learner` (P3) — Extract learned skill

### Lane B: Agents + Skills
**Agents (15 missing):**
1. `oma-analyst` (opus) — Requirements clarity | P0
2. `oma-verifier` (sonnet) — Completion evidence | P0
3. `oma-code-reviewer` (opus) — Code review | P0
4. `oma-test-engineer` (sonnet) — Testing strategy | P0
5. `oma-critic` (opus) — Plan/design challenge | P0
6. `oma-tracer` (sonnet) — Trace gathering | P1
7. `oma-debugger` (sonnet) — Root-cause | P1
8. `oma-security` (sonnet) — Trust boundaries | P1
9. `oma-qa` (sonnet) — Runtime validation | P1
10. `oma-doc-specialist` (sonnet) — SDK/docs lookup | P1
11. `oma-designer` (sonnet) — UX/interaction | P2
12. `oma-writer` (haiku) — Documentation | P2
13. `oma-scientist` (sonnet) — Data analysis | P2
14. `oma-git-master` (sonnet) — Commit hygiene | P2
15. `oma-simplifier` (opus) — Simplification | P2

**Skills:**
Each skill as `plugins/oma/skills/<name>/SKILL.md` with YAML frontmatter and trigger config.

### Lane C: Enterprise + Testing (starts after Lane A produces hooks)
1. Hook-based ADR enforcement (PreToolUse blocking without ADR reference)
2. Hook-based approval gates (sensitive paths)
3. Cost tracking MCP tool
4. Expand bats coverage for all new commands/agents

## Consequences

**Positive:**
- v0.2 complete: 19 agents, 28 commands, full skills system
- OMA demonstrates its own team orchestration capability
- Marketplace-ready feature set

**Risks:**
- Coordination overhead across lanes
- Auggie API gaps for some features (validate against docs first)
- Some features (team tmux workers) still need external CLI companion

## Follow-ups

- [ ] Validate Auggie SDK docs for each new primitive before implementing
- [ ] Write bats tests for every new command/agent
- [ ] Update SPEC.md with final v0.2 feature count
- [ ] Update marketplace.json version to 0.2.0
- [ ] Update README.md with full command/agent tables
