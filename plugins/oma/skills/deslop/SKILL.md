---
name: deslop
description: Remove AI slop - low-quality, generic, or verbose content. Use for "clean up", "remove fluff", and "make concise".
trigger: /oma:deslop
---

## Skill: deslop

Remove AI slop and low-quality content patterns. Make writing concise and genuine.

## When to Use

- After content generation that feels generic or verbose
- When output has padding, filler, or obvious AI patterns
- Before publishing or presenting content

## Slop Patterns to Remove

### Padding Patterns
- Excessive hedging ("It is important to note that...", "It should be mentioned that...")
- Filler phrases ("In today's fast-paced world...", "The intersection of X and Y...")
- Obvious statements ("It goes without saying that...")
- Qualifiers that don't add value ("very", "really", "basically", "actually")

### Generic Writing
- Vague claims without specifics
- Repeated restatements of the same point
- Flowery language for simple ideas
- Buzzwords without substance

### Structure Issues
- Headers without content
- Lists where items need 3+ sentences
- Conclusions that just restate the introduction
- Tangents that don't support the main point

## How to Clean

1. **Read for substance** — what is this actually saying?
2. **Cut padding** — remove words/sentences that don't add information
3. **Strengthen verbs** — "made a decision to" → "decided"
4. **Be direct** — say what you mean
5. **Preserve voice** — don't sterilize, just clarify

## Examples

### Before (slop)
"It is important to note that the implementation of this feature has been shown to provide significant benefits in terms of efficiency and productivity. In today's competitive landscape, organizations are constantly seeking ways to optimize their workflows and reduce operational costs."

### After (clean)
"This feature improves efficiency and reduces costs."

### Before (slop)
"Very basically, what this means is that we need to very carefully consider the implications of our decision."

### After (clean)
"We need to consider the implications of our decision."

## Verification

- Does each sentence add information?
- Is every word necessary?
- Does the content feel genuine?
- Is the point made clearly and directly?

## Constraints

- Preserve meaning, remove only noise
- Don't over-correct into terseness
- Keep personality and voice
- When in doubt, keep it

<Do_Not_Use_When>
- The content is already concise and genuine — deslop will add no value and may introduce unwanted changes
- The user specifically wants verbose or decorative writing (e.g., marketing copy, storytelling)
- The content is code or structured data — deslop operates on prose, not code
- The content has a specific required format (e.g., PR descriptions, commit messages with conventional commits spec) where padding may be structural
- When used inside another skill (e.g., as a sub-step of oma-writer) — deslop should be invoked intentionally, not accidentally triggered mid-output
</Do_Not_Use_When>

<Examples>

### Good Usage

**AI-generated prose with obvious slop patterns:**
```
Before: "It is important to note that the implementation of this feature has been carefully designed to provide significant improvements to the overall user experience. In today's fast-paced development environment, it is essential to leverage cutting-edge solutions."
OMA: [deslop applied]
After: "This feature improves user experience using a cutting-edge approach."
```

**Verbose task descriptions:**
```
Before: "What we essentially need to do is to basically remove all the unnecessary fluff and padding from our documentation so that it becomes much more clean and readable."
OMA: [deslop applied]
After: "Remove all unnecessary padding from our documentation to improve readability."
```

### Bad Usage

**Code comments — not prose:**
```
// It is important to note that this function uses a map to store values
OMA: [deslop would incorrectly "clean" a comment that was already fine in its original form]
```
→ deslop should not be applied to source code or code-adjacent text without human review.

**Conventional commit messages:**
```
fix(auth): resolve token refresh issue under high load
OMA: [deslop "fixes" it to "fix: resolve token refresh issue"]
```
→ Commits are already maximally concise; deslop adds no value and may violate commit conventions.
</Examples>

<Final_Checklist>
- [ ] Each sentence in the cleaned output adds new information (no pure restatements)
- [ ] Padding phrases ("it is important to note that...", "in today's fast-paced...") are removed
- [ ] Filler qualifiers ("very", "really", "basically", "actually") are removed where they add no value
- [ ] Verbs are strong and direct ("made a decision to" → "decided")
- [ ] Meaning is preserved — no substantive content was removed
- [ ] Personality and voice of the original author are maintained (not sterilized)
- [ ] Structure of the original (paragraphs, lists, headings) is preserved where it aids readability
- [ ] Content feels genuine and specific, not generic or formulaic
</Final_Checklist>
