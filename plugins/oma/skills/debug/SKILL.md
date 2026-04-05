---
name: debug
description: Root-cause analysis — isolate regressions, interpret stack traces, and resolve build/compilation errors
argument-hint: "<error message or bug description>"
trigger: /oma:debug
level: 2
---

<Purpose>
Systematic root-cause analysis for code defects, regressions, and build failures. Traces symptoms to fundamental causes using evidence-driven causal tracing with competing hypotheses.
</Purpose>

<Use_When>
- User says "debug", "why is this broken", "root cause", "regression", "stack trace"
- Build fails with cryptic errors
- Tests fail unexpectedly after a change
- A bug has unclear origin
</Use_When>

<Do_Not_Use_When>
- User wants a full refactor or new feature -- delegate to executor or ralph
- The problem is obvious (typo, missing import) -- fix directly
- User wants performance optimization -- use the research skill instead
</Do_Not_Use_When>

<Why_This_Exists>
Blind fixing wastes cycles. Debug applies structured root-cause analysis so fixes are targeted and regressions are prevented.
</Why_This_Exists>

<Execution_Policy>
- Never assume; trace each hypothesis with evidence
- Isolate the regression: is it the change or the environment?
- Distinguish correlation from causation
- Track uncertainty explicitly
</Execution_Policy>

<Steps>

## Phase 1: Gather Evidence

1. **Parse the error/symptom** from arguments
2. **Reproduce the failure** — run the failing command and capture output
3. **Establish baseline** — git diff, recent commits, affected files
4. **Form hypotheses**:
   - H1: The change introduced the bug
   - H2: Environment/dependency issue
   - H3: Pre-existing latent bug exposed by the change
   - H4: Intermittent/flaky issue

## Phase 2: Trace Each Hypothesis

For each hypothesis, gather evidence FOR and AGAINST:

```
## Hypothesis: <H1 description>
**Evidence FOR:**
- <fact from code/output/logs>

**Evidence AGAINST:**
- <fact that contradicts>

**Verdict:** [CONFIRMED / DISPROVED / UNCERTAIN]
```

## Phase 3: Isolate the Root Cause

1. **Binary search on changes**: `git bisect` if regression range is known
2. **Check the smallest unit**: isolate whether a single file/chunk is responsible
3. **Reproduce in isolation**: can the bug be triggered independently?

## Phase 4: Fix and Verify

1. Apply the targeted fix
2. Re-run the failing command
3. Confirm the fix resolves the issue with no regressions
4. Write a brief note on what caused it and what prevented recurrence

<Tool_Usage>
- Use `Bash` to run reproduction commands
- Use `Read` to examine affected code
- Use `Grep` to trace symbol references
- Use `git bisect` for regression isolation
</Tool_Usage>

<Examples>
<Good>
```
## Hypothesis: The new TypeScript version introduced the type error
**Evidence FOR:**
- Error appeared after npm upgrade typescript@5.x
- Same code compiled on typescript@4.x

**Evidence AGAINST:**
- Other files using the same types compile fine

**Verdict:** DISPROVED — the issue is file-scoped, not version-wide
```
</Good>

<Bad>
```
"Probably a dependency issue. Let's reinstall node_modules."
```
Why bad: No evidence, no hypothesis testing. Random shooting.
</Bad>
</Examples>

<Escalation_And_Stop_Conditions>
- If root cause is external (OS, hardware, upstream bug): report and stop
- If the fix requires more than isolated changes: escalate to ralph/team
- If bisect takes more than 10 steps: narrow scope first
</Escalation_And_Stop_Conditions>
