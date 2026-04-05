---
name: science
description: Science/research workflow — hypothesis → experiment → analysis → conclusion
argument-hint: "<topic>"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
  - Task
  - WebSearch
model: sonnet4.6
---

## /science

**Purpose:** Run a rigorous research workflow following scientific methodology.

**Usage:** `/science <topic>`

**Examples:**
- `/science evaluate Redis vs Memcached for session storage`
- `/science compare ML frameworks for time-series prediction`

---

## How It Works

### Research Methodology

**Step 1: Hypothesis Formation**
- Define research question precisely
- Identify variables to measure
- State null and alternative hypotheses

**Step 2: Research Design**
- Select evaluation criteria
- Define experimental setup
- Establish baseline for comparison

**Step 3: Data Collection**
- Gather benchmarks where applicable
- Research external sources
- Compile expert opinions

**Step 4: Analysis**
- Compare findings against criteria
- Identify patterns and correlations
- Test statistical significance (if applicable)

**Step 5: Conclusion**
- Accept or reject hypothesis
- Quantify confidence level
- Document limitations

### Output Structure

```
## Research: <topic>

### Hypothesis
...

### Methodology
...

### Findings
| Criterion | Option A | Option B |
|-----------|----------|----------|
| Performance | ... | ... |
| Ease of use | ... | ... |
| Community | ... | ... |

### Analysis
...

### Conclusion
**Verdict:** ...
**Confidence:** High/Medium/Low
**Limitations:** ...
```

### Constraints

- Objective analysis only
- Cite sources for claims
- Acknowledge conflicts of interest
- Document methodology for reproducibility
