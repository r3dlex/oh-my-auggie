---
name: visual-verdict
description: Structured visual QA — compare screenshots, validate UI changes, and report regressions
argument-hint: "<baseline> <candidate>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

[EXECUTING /oma:visual-verdict — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:visual-verdict

**Purpose:** Perform visual QA by comparing screenshots and validating UI changes.

**Usage:**
- `/oma:visual-verdict <baseline> <candidate>` — Compare two screenshots
- `/oma:visual-verdict run` — Run all visual tests
- `/oma:visual-verdict approve <test>` — Approve new baseline

**Examples:**
- `/oma:visual-verdict screenshots/v1/login.png screenshots/v2/login.png`
- `/oma:visual-verdict run`
- `/oma:visual-verdict approve dashboard-dark-mode`

---

## How It Works

### Visual Comparison

**Phase 1: Baseline Capture**
- Store reference screenshots
- Label with test names
- Track in version control

**Phase 2: Candidate Comparison**
- Capture new screenshot
- Pixel-diff against baseline
- Calculate similarity score

**Phase 3: Analysis**
- Diff regions highlighted
- Ignore acceptable changes (font rendering, antialiasing)
- Flag significant regressions

**Phase 4: Verdict**
- PASS: Visually equivalent
- FAIL: Significant differences detected
- REVIEW: Marginal differences need human review

### Output Structure

```
VISUAL VERDICT: dashboard
==========================

Baseline: screenshots/baseline/dashboard.png
Candidate: screenshots/candidate/dashboard.png

Similarity: 94.2%

Diff Regions:
  [FAIL] Header area — 3px shift in logo position
  [ACCEPT] Button hover state — color variation (acceptable)

VERDICT: REVIEW
Reason: Marginal differences require human judgment

Action Required:
- Review highlighted regions
- Run /oma:visual-verdict approve if acceptable
```

### Comparison Metrics

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Similarity | >95% | Overall match |
| Layout | 100% | Element positions |
| Color | >90% | Per-pixel color accuracy |

### Commands

| Command | Description |
|---------|-------------|
| `/oma:visual-verdict baseline <path>` | Register baseline |
| `/oma:visual-verdict compare <a> <b>` | Compare two images |
| `/oma:visual-verdict run` | Run visual test suite |
| `/oma:visual-verdict approve <name>` | Accept as new baseline |
| `/oma:visual-verdict list` | Show registered baselines |

### Constraints

- Requires image comparison tools
- Baselines must be committed to repo
- Web apps need screenshot capture tool
- Platform differences flagged as acceptable
