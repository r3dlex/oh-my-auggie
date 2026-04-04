---
name: visual-verdict
description: Visual QA verdict for screenshots and UI. Use for "verify UI", "visual check", "screenshot verdict", and "visual comparison".
trigger: /oma:visual-verdict
---

## Skill: visual-verdict

Evaluate screenshots and visual outputs for quality and correctness.

## When to Use

- UI verification after changes
- Screenshot comparison
- Visual regression testing
- Design implementation review
- Before/after comparisons

## Verdict Process

### 1. Load Reference
- Get expected design/screenshot
- Understand intended appearance
- Note key elements

### 2. Load Actual
- Get actual screenshot
- Ensure same viewport/context
- Note environment differences

### 3. Element Comparison

#### Layout
- [ ] Elements in expected positions
- [ ] Correct spacing
- [ ] Proper alignment
- [ ] No overflow/clipping

#### Styling
- [ ] Correct colors
- [ ] Appropriate fonts
- [ ] Expected sizes
- [ ] Shadows/elevation

#### Content
- [ ] Text matches
- [ ] No truncation
- [ ] Images load
- [ ] Icons correct

#### Functionality
- [ ] Interactive elements visible
- [ ] Hover states shown
- [ ] Animations captured
- [ ] Responsive layout

### 4. Issue Classification

| Severity | Description | Action |
|----------|-------------|--------|
| Critical | Wrong/missing content | Must fix |
| Major | Significant layout/style issues | Should fix |
| Minor | Small deviations | Consider fixing |
| Trivial | Imperceptible differences | Ignore |

### 5. Verdict

**PASS** — Matches expected, no issues
**CONDITIONAL** — Minor issues, acceptable
**FAIL** — Major issues need fixing
**INCONCLUSIVE** — Cannot determine

## Output Format

```
## Visual Verdict

### Comparison
**Reference:** {file/URL}
**Actual:** {file/URL}

### Element Checks

#### Layout
| Element | Expected | Actual | Status |
|---------|----------|--------|--------|
| {elem} | {pos} | {pos} | ✅/❌ |

#### Styling
| Element | Expected | Actual | Status |
|---------|----------|--------|--------|
| {elem} | {style} | {style} | ✅/❌ |

#### Content
| Element | Expected | Actual | Status |
|---------|----------|--------|--------|
| {elem} | {text} | {text} | ✅/❌ |

### Issues Found

#### Critical
- **{issue}** — {description}

#### Major
- **{issue}** — {description}

#### Minor
- **{issue}** — {description}

### Verdict

| Criterion | Status |
|-----------|--------|
| Layout | ✅/❌ |
| Styling | ✅/❌ |
| Content | ✅/❌ |
| Functionality | ✅/❌ |

**Overall:** PASS / CONDITIONAL / FAIL / INCONCLUSIVE

**Reason:** {explanation}
**Recommendation:** {if any}
```

## Constraints

- Compare equivalent views
- Note environmental differences
- Be consistent in evaluation
- Document all issues
- Provide specific feedback
