---
name: deep-dive
description: "2-stage pipeline: trace (causal investigation) -> deep-interview (requirements crystallization) with 3-point injection"
argument-hint: "<problem or exploration target>"
trigger: /oma:deep-dive
pipeline: [deep-dive, ralplan, ralph]
next-skill: ralplan
next-skill-args: --consensus --direct
handoff: .oma/specs/deep-dive-{slug}.md
level: 3
---

<Purpose>
Deep Dive orchestrates a 2-stage pipeline that first investigates WHY something happened (trace) then precisely defines WHAT to do about it (deep-interview). The trace stage runs 3 parallel causal investigation lanes, and its findings feed into the interview stage via a 3-point injection mechanism — enriching the starting point, providing system context, and seeding initial questions. The result is a crystal-clear spec grounded in evidence, not assumptions.
</Purpose>

<Use_When>
- User has a problem but doesn't know the root cause — needs investigation before requirements
- User says "deep dive", "investigate deeply", "trace and interview"
- Bug investigation: "Something broke and I need to figure out why, then plan the fix"
- Feature exploration: "I want to improve X but first need to understand how it currently works"
</Use_When>

<Do_Not_Use_When>
- User already knows the root cause — use `/oma:deep-interview` directly
- User has a clear, specific request with file paths and function names — execute directly
- User wants to trace only — use `/oma:trace` directly
- User says "just do it" or "skip the investigation" — respect their intent
</Do_Not_Use_When>

<Execution_Policy>
- Phase 1-2: Initialize and confirm trace lane hypotheses (1 user interaction)
- Phase 3: Trace runs autonomously after lane confirmation
- Phase 4: Interview follows `/oma:deep-interview` protocol (one question at a time)
- State persists across phases via `state_write(mode="deep-interview")` with `source: "deep-dive"`
- Do not proceed to execution — always hand off via Execution Bridge (Phase 5)
</Execution_Policy>

<Steps>

## Phase 1: Initialize

1. **Parse the user's idea** from `{{ARGUMENTS}}`
2. **Generate slug**: kebab-case from first 5 words
3. **Detect brownfield vs greenfield** via `Explore` agent
4. **Generate 3 trace lane hypotheses**:
   - **Lane 1**: Code-path / implementation cause
   - **Lane 2**: Config / environment / orchestration cause
   - **Lane 3**: Measurement / artifact / assumption mismatch cause
5. **Initialize state** via `state_write(mode="deep-interview")`

## Phase 2: Lane Confirmation

Present the 3 hypotheses to the user via `AskUserQuestion`:

> **Starting deep dive.** I'll investigate your problem through 3 parallel trace lanes, then use the findings for a targeted interview.
>
> **Your problem:** "{initial_idea}"
> **Proposed trace lanes:**
> 1. {hypothesis_1}
> 2. {hypothesis_2}
> 3. {hypothesis_3}
>
> Are these hypotheses appropriate?

**Options:**
- Confirm and start trace
- Adjust hypotheses

## Phase 3: Trace Execution

Run 3 parallel tracer lanes. Each lane gathers evidence FOR and AGAINST its hypothesis, names the critical unknown, and recommends a discriminating probe.

**Trace Output Structure** (saved to `.oma/specs/deep-dive-trace-{slug}.md`):

```markdown
# Deep Dive Trace: {slug}

## Ranked Hypotheses
| Rank | Hypothesis | Confidence | Evidence Strength |
|------|------------|------------|-------------------|
| 1 | ... | High/Med/Low | Strong/Moderate/Weak |

## Per-Lane Critical Unknowns
- **Lane 1**: {critical_unknown}
- **Lane 2**: {critical_unknown}
- **Lane 3**: {critical_unknown}

## Most Likely Explanation
[current best explanation]

## Recommended Discriminating Probe
[next probe to collapse uncertainty]
```

## Phase 4: Interview with Trace Injection

Follow `/oma:deep-interview` protocol with 3 initialization overrides:

**Override 1 — initial_idea enrichment**:
```
Original problem: {ARGUMENTS}

<trace-context>
Trace finding: {most_likely_explanation}
</trace-context>

Given this root cause, what should we do about it?
```

**Override 2 — codebase_context replacement**: Skip deep-interview's explore step. Inject trace synthesis as `codebase_context`.

**Override 3 — initial question queue**: Extract per-lane `critical_unknowns` from trace result. Ask these FIRST, then continue with normal ambiguity-driven questioning.

**Low-confidence handling**: If all lanes low-confidence, use original user input without enrichment.

Follow `/oma:deep-interview` ambiguity scoring (goal 40%, constraints 30%, criteria 30%) until ambiguity ≤ 20%.

## Phase 5: Crystallize Spec

Generate spec in standard deep-interview format with additional section:

```markdown
## Trace Findings
[summarizes trace results that shaped the interview]
```

Save to `.oma/specs/deep-dive-{slug}.md`.

## Phase 6: Execution Bridge

**Question:** "Your spec is ready (ambiguity: {score}%). How would you like to proceed?"

**Options:**

1. **Ralplan → Team (Recommended)** — consensus-refine then execute with N coordinated agents
2. **Ralplan → Ralph** — consensus-refine then execute with persistence loop
3. **Team directly** — N coordinated agents with spec as shared plan
4. **Ralph directly** — persistence loop until acceptance criteria pass
5. **Refine further** — continue interviewing

**IMPORTANT:** Invoke via `Skill()`. Do NOT implement directly.

<Tool_Usage>
- Use `Explore` agent for brownfield codebase exploration
- Use `AskUserQuestion` for lane confirmation and interview questions
- Use `state_write` / `state_read` for state persistence
- Use `Write` tool to save trace result and spec
- Use `Skill()` to bridge to execution modes
- Wrap trace-derived text in `<trace-context>` delimiters
</Tool_Usage>

<Examples>
```
/oma:deep-dive "Production pipeline fails intermittently on the transformation step"
/oma:deep-dive "I want to improve the auth flow but first need to understand how it works"
```
</Examples>

<Final_Checklist>
- [ ] Phase 1 detects brownfield/greenfield and generates 3 hypotheses
- [ ] Phase 2 confirms hypotheses via AskUserQuestion (1 round)
- [ ] Phase 3 runs 3 parallel tracer lanes with evidence FOR/AGAINST
- [ ] Phase 3 saves trace result with per-lane critical unknowns
- [ ] Phase 4 starts with 3-point injection from trace
- [ ] Phase 4 handles low-confidence trace gracefully
- [ ] Phase 4 wraps trace-derived text in `<trace-context>` delimiters
- [ ] Final spec contains "Trace Findings" section
- [ ] Phase 5 execution bridge passes spec_path to downstream skills
- [ ] State uses `mode="deep-interview"` with `source: "deep-dive"` discriminator
</Final_Checklist>
