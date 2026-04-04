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
