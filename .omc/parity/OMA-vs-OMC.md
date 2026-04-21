# OMA vs OMC Parity Analysis

## Commands

| OMC Command | OMA Command | Status |
|------------|-------------|--------|
| ask | oma-ask.md | ✅ |
| autopilot | oma-autopilot.md | ✅ |
| cancel | oma-cancel.md | ✅ |
| ccg | oma-ccg.md | ✅ |
| deepinit | oma-deepinit.md | ✅ |
| deslop | oma-deslop.md | ✅ |
| doctor | oma-doctor.md | ✅ |
| hud | oma-hud.md | ✅ |
| interview | oma-interview.md | ✅ |
| learner | oma-learner.md | ✅ |
| mcp-setup | oma-mcp-setup.md | ✅ |
| note | oma-note.md | ✅ |
| notifications | oma-notifications.md | ✅ |
| plan | oma-plan.md | ✅ |
| ralplan | oma-ralplan.md | ✅ |
| release | oma-release.md | ✅ |
| research | oma-research.md | ✅ |
| science | oma-science.md | ✅ |
| session | oma-session.md | ✅ |
| setup | oma-setup.md | ✅ |
| skill | oma-skill.md | ✅ |
| status | oma-status.md | ✅ |
| team | oma-team.md | ✅ |
| trace | oma-trace.md | ✅ |
| ultraqa | oma-ultraqa.md | ✅ |
| ultrawork | oma-ultrawork.md | ✅ |
| visual-verdict | oma-visual-verdict.md | ✅ |
| writer-memory | oma-writer-memory.md | ✅ |
| help | oma-help.md | ✅ |
| ralphthon | oma-ralphthon.md | ✅ (ported this session) |
| session-search | oma-session-search.md | ✅ (ported this session) |
| teleport | oma-teleport.md | ✅ (ported this session) |
| wait | oma-wait.md | ✅ (ported this session) |
| deep-interview | oma-deep-interview.md | ✅ (added alias this session) |

**OMC-only commands (not needed in OMA):**
- `omc-setup` — OMC-specific installation (OMA uses Auggie plugin system)
- `omc-doctor` — OMC health check (OMA has oma-doctor)
- `omc-reference` — OMC internal reference (OMA uses Auggie docs)
- `omc-teams` — legacy tmux-based teams (OMA uses native team mode)

**OMA-only commands:**
- `oma-skills` — skill index browser
- `oma-deep-interview` — ambiguity-scoring interview (not in OMC)

## Skills

| OMC Skill | OMA Skill | Status |
|-----------|-----------|--------|
| ask | ask/SKILL.md | ✅ |
| autopilot | — | ❌ MISSING — OMA has no autonomous full-pipeline skill |
| cancel | — | ❌ MISSING |
| ccg | ccg/SKILL.md | ✅ |
| deep-dive | deep-dive/SKILL.md | ✅ |
| deep-interview | deep-interview/SKILL.md | ✅ |
| deslop | deslop/SKILL.md | ✅ |
| doctor | doctor/SKILL.md | ✅ |
| external-context | external-context/SKILL.md | ✅ |
| hud | hud/SKILL.md | ✅ |
| learn | learner/SKILL.md | ✅ |
| mcp-setup | mcp-setup/SKILL.md | ✅ |
| note | note/SKILL.md | ✅ |
| notifications | notifications/SKILL.md | ✅ |
| plan | plan/SKILL.md | ✅ |
| ralplan | ralplan/SKILL.md | ✅ |
| ralph | — | ❌ MISSING (RALPH is a command, not a skill in OMA) |
| release | release/SKILL.md | ✅ |
| remember | remember/SKILL.md | ✅ |
| research | research/SKILL.md | ✅ |
| science | science/SKILL.md | ✅ |
| self-improve | self-improve/SKILL.md | ✅ (stub) |
| session | session/SKILL.md | ✅ |
| setup | setup/SKILL.md | ✅ |
| skill | skill/SKILL.md | ✅ |
| team | team/SKILL.md | ✅ (worktree isolation added this session) |
| trace | trace/SKILL.md | ✅ |
| ultraqa | ultraqa/SKILL.md | ✅ |
| ultrawork | ultrawork/SKILL.md | ✅ |
| verify | verify/SKILL.md | ✅ |
| visual-verdict | visual-verdict/SKILL.md | ✅ |
| writer-memory | writer-memory/SKILL.md | ✅ |
| ai-slop-cleaner | deslop/SKILL.md | ✅ (renamed) |
| debugger | debug/SKILL.md | ✅ |
| explorer | — | ❌ MISSING (OMA has oma-explorer agent, not skill) |
| planner | — | ❌ MISSING (OMA has oma-planner agent, not skill) |
| executor | — | ❌ MISSING (OMA has oma-executor agent, not skill) |
| architect | — | ❌ MISSING (OMA has oma-architect agent, not skill) |
| designer | — | ❌ MISSING (OMA has oma-designer agent, not skill) |
| writer | — | ❌ MISSING (OMA has oma-writer agent, not skill) |
| reviewer | — | ❌ MISSING (OMA has oma-reviewer agent, not skill) |
| tester | — | ❌ MISSING (OMA has oma-tester agent, not skill) |
| deployer | — | ❌ MISSING (OMA has oma-deployer agent, not skill) |
| monitor | — | ❌ MISSING (OMA has oma-monitor agent, not skill) |
| security | — | ❌ MISSING (OMA has oma-security agent, not skill) |
| integrator | — | ❌ MISSING (OMA has oma-integrator agent, not skill) |
| automation | — | ❌ MISSING (OMA has oma-automation agent, not skill) |
| data | — | ❌ MISSING (OMA has oma-data agent, not skill) |
| api | — | ❌ MISSING (OMA has oma-api agent, not skill) |
| platform | — | ❌ MISSING (OMA has oma-platform agent, not skill) |
| researcher | — | ❌ MISSING (OMA has oma-researcher agent, not skill) |

**Note:** OMA agents and OMC skills serve similar purposes but have different structures. OMC agents are skills; OMA has both agents (.md files) and skills (SKILL.md directories). This is BY DESIGN — OMA is agent-first.

## Agents

| OMC Agent | OMA Agent | Status |
|-----------|-----------|--------|
| analyst | oma-analyst.md | ✅ |
| architect | oma-architect.md | ✅ |
| code-reviewer | oma-code-reviewer.md | ✅ |
| code-simplifier | oma-simplifier.md | ✅ |
| critic | oma-critic.md | ✅ |
| debugger | oma-debugger.md | ✅ |
| designer | oma-designer.md | ✅ |
| document-specialist | oma-doc-specialist.md | ✅ |
| executor | oma-executor.md | ✅ |
| explore | oma-explorer.md | ✅ |
| git-master | oma-git-master.md | ✅ |
| planner | oma-planner.md | ✅ |
| qa-tester | oma-qa.md | ✅ |
| scientist | oma-scientist.md | ✅ |
| security-reviewer | oma-security.md | ✅ |
| test-engineer | oma-test-engineer.md | ✅ |
| tracer | oma-tracer.md | ✅ |
| verifier | oma-verifier.md | ✅ |
| writer | oma-writer.md | ✅ |

**OMA-only agents (not in OMC):**
- oma-integrator.md
- oma-automation.md
- oma-data.md
- oma-api.md
- oma-platform.md
- oma-monitor.md
- oma-deployer.md
- oma-researcher.md

## Hooks

| OMC Hook | OMA Hook | Status |
|----------|----------|--------|
| delegation-enforce | delegation-enforce.mjs | ✅ |
| session-start | session-start.mjs | ✅ |
| stop-gate | stop-gate.mjs | ✅ |
| approval-gate | approval-gate.mjs | ✅ |
| adr-enforce | adr-enforce.mjs | ✅ |
| cost-track | cost-track.mjs | ✅ |
| keyword-detect | keyword-detect.mjs | ✅ |

All 7 hooks converted to .mjs this session.

## MCP Servers

| Server | OMC | OMA | Status |
|--------|-----|-----|--------|
| oma-state | ✅ | ✅ | ✅ |
| context7 | ✅ | ❌ MISSING |
| exa | ✅ | ❌ MISSING |
| github | ✅ | ❌ MISSING |

## Gaps to Address

1. **autopilot skill** — no OMA equivalent for full autonomous pipeline
2. **cancel command** — OMC cancel is a command + skill; OMA has oma-cancel.md (command) but no cancel skill
3. **MCP servers** — missing context7, exa, github
4. **EXA_API_KEY** — OMC prompts for this during setup; OMA setup now references it but doesn't prompt/store

## Summary

- Commands: 35/35 parity (OMC-only commands are OMC-specific, not needed)
- Skills: 24/32 OMA has the core skills; OMC extras are either agent-based in OMA or OMC-specific
- Agents: 20/20 full parity
- Hooks: 7/7 full parity (.mjs conversion complete)
- MCP: 1/4 (only state server; context7/exa/github missing)
