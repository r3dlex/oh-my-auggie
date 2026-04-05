---
name: self-improve
description: Autonomous improvement loop — tournament selection with benchmark-driven iteration (HIGH COMPLEXITY — deferred)
argument-hint: "<goal or improvement target>"
trigger: /oma:self-improve
level: 4
---

<Deferral_Notice>
**This skill is deferred for OMA.** The full implementation requires significant OMC-specific infrastructure (worktree-based tournament execution, benchmark harness validation, git-master integration for atomic branch operations).

This document describes the TARGET state — what self-improve would look like when fully implemented — and a PREVIEW of the loop structure adapted for OMA's architecture.

See `.omc/plans/omc-to-oma-skill-mapping.md` Phase 3 status.
</Deferral_Notice>

<Purpose>
Self-Improvement Orchestrator runs a tournament-based autonomous loop: multiple executor agents propose plans for a defined improvement goal, a benchmark measures each candidate's quality, and the best candidate is merged while preserving a visualization of all attempts.

The loop runs fully autonomously once the goal and benchmark are confirmed — no mid-loop interruption.
</Purpose>

<Use_When>
- User says "self-improve", "improve this repo", "tournament", "benchmark"
- A measurable improvement target is defined (e.g., "reduce test time by 50%", "improve accuracy metric X")
- A benchmark command can be created or wrapped for the target
</Use_When>

<Do_Not_Use_When>
- No measurable metric exists — self-improve requires a benchmark
- User wants to understand or explore — use `trace` or `deep-dive` instead
- User wants to make a specific change directly — use `ralph` or `team`
</Do_Not_Use_When>

<Why_This_Exists>
Manual optimization hits plateaus. Self-improve runs N agents in parallel, each with a different hypothesis, and lets the benchmark select the winner — discovering approaches a single agent might miss.

## Target Architecture for OMA

When fully implemented, self-improve for OMA would use:

| Component | OMC | OMA Target |
|-----------|-----|-----------|
| Isolation | git worktrees | OMA worktrees (TBD) |
| Orchestration | tmux CLI workers | OMA team agents |
| Merge strategy | git-master agent | OMA git integration |
| Tournament | SKILL.md direct | SKILL.md + executor agents |
| State | `.omc/self-improve/` | `.oma/self-improve/` |

**Key open questions:**
- Does OMA have a worktree equivalent? (Augment Code workspaces?)
- Does OMA team support parallel executor agents with shared state?
- What's the OMA equivalent of the benchmark validation harness?

## Loop Structure (Target)

```
Step 0: Stale worktree cleanup
Step 1: Refresh state (30min TTL)
Step 2: Check stop request
Step 3: Check user ideas
Step 4: Research — spawn researcher agent
Step 5: Plan — spawn N planner agents in parallel
Step 6: Review — architect + critic per plan
Step 7: Execute — N executor agents in parallel (worktree per executor)
Step 8: Tournament selection — rank by benchmark, merge best
Step 9: Record & visualize — update history, plot progress
Step 10: Cleanup — remove worktrees
Step 11: Stop condition check → loop or exit
```

## Prerequisites Before Full Implementation

1. **OMA worktree model**: Define how OMA handles isolated execution environments per agent
2. **Benchmark harness**: Create `/oma:benchmark` skill that wraps measurement commands with validation
3. **Tournament state machine**: Define state schema in `.oma/self-improve/state/`
4. **Git integration**: OMA equivalent of git-master for atomic merge/tag/PR

## Preview: Minimal Viable Self-Improve

When the prerequisites above are resolved, the minimal viable self-improve for OMA would:

1. **Goal + benchmark setup** — user confirms target metric and benchmark command
2. **N planner agents** — each generates a hypothesis + plan
3. **Critic filtering** — reject plans that don't meet quality criteria
4. **N executor agents** — implement approved plans in parallel
5. **Tournament selection** — benchmark each result, merge the winner
6. **Visualization** — plot improvement over iterations

## How to Help Progress This

1. Create the `/oma:benchmark` skill — benchmark wrapper with validation
2. Define OMA worktree model in `.oma/adr/`
3. After those exist, revisit this skill with the architect agent

<Final_Checklist>
- [ ] **DEFERRED** — OMA worktree model not yet defined
- [ ] **DEFERRED** — Benchmark harness not yet implemented
- [ ] When worktree + benchmark exist: re-implement with full tournament loop
</Final_Checklist>
