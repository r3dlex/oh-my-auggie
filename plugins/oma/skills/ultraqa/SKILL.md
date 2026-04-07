---
name: ultraqa
description: QA cycling - test, verify, fix, repeat until quality. Use for "quality assurance", "test driven", and "verify thoroughly".
trigger: /oma:ultraqa
---

## Skill: ultraqa

Quality assurance through iterative test-verify-fix cycles.

## When to Use

- Critical code requiring thorough validation
- Bug fixes that need regression testing
- Feature development with TDD approach
- Pre-release quality gates

## QA Cycle

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  Test   │ -> │ Verify  │ -> │  Fix    │
└─────────┘    └─────────┘    └─────────┘
     ^              │              │
     └──────────────┴──────────────┘
            (repeat until clean)
```

### Phase 1: Test
- Run unit tests
- Execute integration tests
- Perform manual checks
- Document test results

### Phase 2: Verify
- Compare results to expectations
- Check for regressions
- Validate edge cases
- Review test coverage

### Phase 3: Fix
- Address failures found
- Update tests if needed
- Document known issues
- Repeat cycle

## QA Criteria

### Must Pass
- All critical path tests
- No regressions in existing functionality
- Error rate below threshold
- Performance within bounds

### Should Pass
- Non-critical path tests
- Accessibility checks
- Security scans
- Code quality metrics

### Nice to Pass
- Code coverage > 80%
- No linter warnings
- Documentation complete
- Type hints present

## Cycle Limits

- **Max cycles:** 5
- **Exit criteria:** Must-pass tests green, no critical issues
- **Escalation:** After 5 cycles, report and move on

## Output Format

```
## QA Cycle: {iteration}

### Cycle {n} Results

#### Test Phase
- **Tests run:** {n}
- **Passed:** {n}
- **Failed:** {n}
- **Skipped:** {n}

#### Verify Phase
| Check | Status | Notes |
|-------|--------|-------|
| {check 1} | ✅ | {notes} |
| {check 2} | ❌ | {notes} |

#### Fix Phase
- **{file}:{line}** — {fix applied}

### Cycle Summary
- **Status:** PASS / FAIL / PARTIAL
- **Critical issues:** {n}
- **Remaining issues:** {n}
- **Cycles remaining:** {n}

### Final Verdict
{verdict}
```

## Constraints

- Max 5 cycles per QA session
- Critical issues block completion
- Document all failures
- Don't skip verification
- Time-box each cycle

<Do_Not_Use_When>
- When a single-pass verification is sufficient (e.g., trivial one-line fixes)
- When the codebase has no existing tests to compare against (no regression baseline)
- When the user explicitly says "just run it and tell me if it works" — respect the intent
- When the task is purely exploratory or research-oriented (not code being shipped)
- When running QA would significantly delay a time-critical hotfix the user needs immediately
- Within ralph mode, which already has its own architect-verification gates built in
</Do_Not_Use_When>

<Tool_Usage>
- **oma-qa**: Use when a dedicated QA cycle is the primary task (user invoked `/oma:ultraqa` directly)
- **oma-executor**: Use for applying fixes found during the QA cycle — the executor runs each Fix phase
- **oma-architect**: Consult when a QA failure reveals an architectural issue rather than a simple bug
- **oma-verifier**: Use instead of oma-qa when the task is to verify an already-fixed change — a single verification pass rather than a full cycle
</Tool_Usage>

<Why_This_Exists>
OMA runs inside Auggie's CLI and often operates on code that is being actively developed across multiple sessions. Without a formal QA loop, fixes applied in one session can silently break things that won't surface until much later. ultraqa exists to make quality gates explicit and iterative — test, verify, fix, repeat — so that work delivered through OMA is genuinely trustworthy rather than just "looks fine in the moment."
</Why_This_Exists>

<Examples>

### Good Usage

**Bug fix with regression risk:**
```
User: "Fix the auth token refresh bug and make sure nothing else breaks"
Agent: /oma:ultraqa
OMA: [QA Cycle 1: Run existing auth tests — 2 failures found]
OMA: [QA Cycle 1: Fix applied to token refresh logic]
OMA: [QA Cycle 2: Re-run — all auth tests pass, 1 unrelated test now failing]
OMA: [QA Cycle 2: Investigating — unrelated; file-scoped change to expiry date]
OMA: [QA Cycle 3: Fix confirmed clean]
OMA: [Final verdict: PASS — 1 known limitation documented]
```

**Pre-release quality gate:**
```
User: "Ship the new MCP server code"
Agent: /oma:ultraqa
OMA: [QA Cycle 1-5: Tests run, coverage measured, edge cases checked]
OMA: [Result: 3 Must-Pass failures block release]
User is informed: "Not ready — fix these 3 issues first"
```

### Bad Usage

**Overkill on a one-line doc fix:**
```
User: "Change the README description from 'builds' to 'compiles'"
Agent: /oma:ultraqa
OMA: [Runs 5 QA cycles on a README string change — overhead >> value]
```

**No test baseline:**
```
User: "QA the new feature I just described"
Agent: /oma:ultraqa
OMA: [No existing tests exist — Cycle 1 has no regression baseline]
OMA: [QA stalls at "compare to expectations" with no measurable baseline]
```
→ Should use oma-executor directly with manual spot-checks instead.
</Examples>

<Escalation_And_Stop_Conditions>
- **Stop and report:** After 5 cycles with Must-Pass tests still failing — surface the exact failures and stop further cycles
- **Stop and escalate:** A QA failure points to an architectural problem (not a bug) — escalate to oma-architect before continuing
- **Continue:** Non-critical (Should-Pass / Nice-to-Pass) failures remain; document and proceed
- **Escalate to user:** After 5 cycles, Must-Pass tests pass but Should-Pass issues remain — ask user whether to iterate further or accept with caveats
- **Hard stop:** User says "enough" or "ship it" — respect the intent, document remaining issues, close out
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] All Must-Pass tests are green (no exceptions unless explicitly accepted by user)
- [ ] No new regressions introduced in existing functionality
- [ ] All critical path tests pass
- [ ] Cycle count is documented (do not exceed 5 without user consent)
- [ ] Remaining failures are categorized (Must/Should/Nice) and surfaced to user
- [ ] Fixes applied during each Fix phase are documented with file:line references
- [ ] If early exit was taken, the ambiguity/limitation is explicitly noted in the verdict
- [ ] Output format matches the QA Cycle template with all required fields populated
</Final_Checklist>
