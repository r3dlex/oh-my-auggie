---
name: ask
description: Query with a specific model — get a targeted answer from a named model
argument-hint: "<model> <query>"
allowed-tools:
  - Read
  - Glob
  - Grep
model: haiku4.5
---

[EXECUTING /oma:ask — DO NOT SUMMARIZE. EXECUTE THE STEPS BELOW IMMEDIATELY.]

## /oma:ask

**Purpose:** Query a specific model directly for targeted answers.

**Usage:** `/oma:ask <model> <query>`

**Available Models:**
- `haiku` — Fast, concise responses
- `sonnet` — Balanced analysis
- `opus` — Deep reasoning
- `gemini` — Research-heavy
- `gpt` — Alternative perspective

**Examples:**
- `/oma:ask haiku explain this regex pattern`
- `/oma:ask opus analyze the architecture trade-offs`
- `/oma:ask sonnet summarize the test results`

---

## How It Works

### Direct Model Query

1. **Route** query to specified model
2. **Apply** model's strengths to query
3. **Return** concise, focused answer

### Model Characteristics

| Model | Best For | Response Style |
|-------|----------|---------------|
| Haiku | Quick lookups | Concise |
| Sonet | Balanced analysis | Detailed |
| Opus | Complex reasoning | Thorough |
| Gemini | Research | Citation-heavy |
| GPT | Alternative views | Creative |

### Constraints

- Long contexts may be truncated
- Rate limits apply per model
- Not all models may be available in your tier
