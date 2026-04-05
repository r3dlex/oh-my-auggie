---
name: deep-interview
description: Socratic deep interview with mathematical ambiguity gating before autonomous execution
argument-hint: "[--quick|--standard|--deep] [--autoresearch] <idea or vague description>"
trigger: /oma:deep-interview
level: 3
---

<Purpose>
Deep Interview implements Ouroboros-inspired Socratic questioning with mathematical ambiguity scoring. It replaces vague ideas with crystal-clear specifications by asking targeted questions that expose hidden assumptions, measuring clarity across weighted dimensions, and refusing to proceed until ambiguity drops below a configurable threshold (default: 20%). The output feeds into a 3-stage pipeline: **deep-interview → ralplan (consensus refinement) → ralph/team (execution)**, ensuring maximum clarity at every stage.
</Purpose>

<Use_When>
- User has a vague idea and wants thorough requirements gathering before execution
- User says "deep interview", "interview me", "ask me everything", "don't assume", "make sure you understand"
- User says "ouroboros", "socratic", "I have a vague idea", "not sure exactly what I want"
- User wants to avoid "that's not what I meant" outcomes from autonomous execution
- Task is complex enough that jumping to code would waste cycles on scope discovery
- User wants mathematically-validated clarity before committing to execution
</Use_When>

<Do_Not_Use_When>
- User has a detailed, specific request with file paths, function names, or acceptance criteria -- execute directly
- User wants to explore options or brainstorm -- use `plan` skill instead
- User wants a quick fix or single change -- delegate to executor or ralph
- User says "just do it" or "skip the questions" -- respect their intent
- User already has a PRD or plan file -- use ralph or team with that plan
</Do_Not_Use_When>

<Why_This_Exists>
AI can build anything. The hard part is knowing what to build. OMA's autopilot Phase 0 expands ideas into specs via analyst + architect, but this single-pass approach struggles with genuinely vague inputs. It asks "what do you want?" instead of "what are you assuming?" Deep Interview applies Socratic methodology to iteratively expose assumptions and mathematically gate readiness, ensuring the AI has genuine clarity before spending execution cycles.
</Why_This_Exists>

<Execution_Policy>
- Ask ONE question at a time -- never batch multiple questions
- Target the WEAKEST clarity dimension with each question
- Make weakest-dimension targeting explicit every round: name the weakest dimension, state its score/gap, and explain why the next question is aimed there
- Gather codebase facts via `Explore` agent BEFORE asking the user about them
- Score ambiguity after every answer -- display the score transparently
- Do not proceed to execution until ambiguity ≤ threshold (default 0.2)
- Allow early exit with a clear warning if ambiguity is still high
- Persist interview state for resume across session interruptions
- Challenge agents activate at specific round thresholds to shift perspective
</Execution_Policy>

<Steps>

## Phase 1: Initialize

1. **Parse the user's idea** from `{{ARGUMENTS}}`
2. **Detect brownfield vs greenfield**:
   - Run `Explore` agent (haiku): check if cwd has existing source code, package files, or git history
   - If source files exist AND the user's idea references modifying/extending something: **brownfield**
   - Otherwise: **greenfield**
3. **For brownfield**: Run `Explore` agent to map relevant codebase areas, store as `codebase_context`
4. **Initialize state** via `state_write(mode="deep-interview")`:

```json
{
  "active": true,
  "current_phase": "deep-interview",
  "state": {
    "interview_id": "<uuid>",
    "type": "greenfield|brownfield",
    "initial_idea": "<user input>",
    "rounds": [],
    "current_ambiguity": 1.0,
    "threshold": 0.2,
    "codebase_context": null,
    "challenge_modes_used": [],
    "ontology_snapshots": []
  }
}
```

5. **Announce the interview** to the user

## Phase 2: Interview Loop

Repeat until `ambiguity ≤ threshold` OR user exits early:

### Step 2a: Generate Next Question

Build the question generation prompt with:
- The user's original idea
- All prior Q&A rounds (conversation history)
- Current clarity scores per dimension (which is weakest?)
- Challenge agent mode (if activated -- see Phase 3)
- Brownfield codebase context (if applicable)

**Question targeting strategy:**
- Identify the dimension with the LOWEST clarity score
- Generate a question that specifically improves that dimension
- State, in one sentence before the question, why this dimension is now the bottleneck to reducing ambiguity
- Questions should expose ASSUMPTIONS, not gather feature lists
- If the scope is still conceptually fuzzy (entities keep shifting, the user is naming symptoms, or the core noun is unstable), switch to an ontology-style question

**Question styles by dimension:**
| Dimension | Question Style | Example |
|-----------|---------------|---------|
| Goal Clarity | "What exactly happens when...?" | "When you say 'manage tasks', what specific action does a user take first?" |
| Constraint Clarity | "What are the boundaries?" | "Should this work offline, or is internet connectivity assumed?" |
| Success Criteria | "How do we know it works?" | "If I showed you the finished product, what would make you say 'yes, that's it'?" |
| Context Clarity (brownfield) | "How does this fit?" | "I found JWT auth middleware in `src/auth/` — should this feature extend that path or diverge?" |

### Step 2b: Ask the Question

Use `AskUserQuestion` with the generated question.

### Step 2c: Score Ambiguity

After receiving the user's answer, score clarity across all dimensions using opus model (temperature 0.1).

**Calculate ambiguity:**

Greenfield: `ambiguity = 1 - (goal × 0.40 + constraints × 0.30 + criteria × 0.30)`
Brownfield: `ambiguity = 1 - (goal × 0.35 + constraints × 0.25 + criteria × 0.25 + context × 0.15)`

### Step 2d: Report Progress

Show the user their progress after each round:

```
Round {n} complete.

| Dimension | Score | Weight | Weighted | Gap |
|-----------|-------|--------|----------|-----|
| Goal | {s} | {w} | {s*w} | {gap or "Clear"} |
| Constraints | {s} | {w} | {s*w} | {gap or "Clear"} |
| Success Criteria | {s} | {w} | {s*w} | {gap or "Clear"} |
| Context (brownfield) | {s} | {w} | {s*w} | {gap or "Clear"} |
| **Ambiguity** | | | **{score}%** | |
```

### Step 2f: Check Soft Limits

- **Round 3+**: Allow early exit if user says "enough", "let's go", "build it"
- **Round 10**: Show soft warning
- **Round 20**: Hard cap

## Phase 3: Challenge Agents

At specific round thresholds, shift the questioning perspective:

### Round 4+: CONTRARIAN Mode
Ask "What if the opposite were true?" or "What if this constraint doesn't actually exist?"

### Round 6+: SIMPLIFIER Mode
Ask "What's the simplest version that would still be valuable?" or "Which constraints are actually necessary vs. assumed?"

### Round 8+: ONTOLOGIST Mode (if ambiguity > 0.3)
Ask "What IS this, really?" to find the essence

Challenge modes are used ONCE each, then return to normal Socratic questioning.

## Phase 4: Crystallize Spec

When ambiguity ≤ threshold (or hard cap / early exit):

1. **Generate the specification** using opus model with the full interview transcript
2. **Write to file**: `.oma/specs/deep-interview-{slug}.md`

## Phase 5: Execution Bridge

After the spec is written, present execution options via `AskUserQuestion`:

**Question:** "Your spec is ready (ambiguity: {score}%). How would you like to proceed?"

**Options:**

1. **Ralplan → Team (Recommended)** — consensus-refine then execute with N coordinated agents
2. **Ralplan → Ralph** — consensus-refine then execute with persistence loop
3. **Team directly** — N coordinated parallel agents with the spec as shared plan
4. **Ralph directly** — persistence loop until all acceptance criteria pass
5. **Refine further** — continue interviewing

**IMPORTANT:** Invoke the chosen execution mode via `Skill()`. Do NOT implement directly.

<Tool_Usage>
- Use `AskUserQuestion` for each interview question
- Use `Explore` agent (haiku) for brownfield codebase exploration
- Use opus model (temperature 0.1) for ambiguity scoring
- Use `state_write` / `state_read` for interview state persistence
- Use `Write` tool to save the final spec to `.oma/specs/`
- Use `Skill()` to bridge to execution modes
</Tool_Usage>

<Escalation_And_Stop_Conditions>
- Hard cap at 20 rounds: proceed with whatever clarity exists
- Soft warning at 10 rounds: offer to continue or proceed
- Early exit (round 3+): allow with warning if ambiguity > threshold
- User says "stop": stop immediately, save state for resume
- Ambiguity stalls: activate Ontologist mode to reframe
</Escalation_And_Stop_Conditions>
