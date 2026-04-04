---
name: ask
description: Route questions to appropriate intelligence. Use for "ask", "query", and "external knowledge".
trigger: /oma:ask
---

## Skill: ask

Route questions to the best available intelligence source.

## When to Use

- Questions beyond current context
- Need for external knowledge
- Verification of facts
- Researching unfamiliar topics

## Intelligence Sources

### Claude (built-in)
- Code and technical questions
- Reasoning and analysis
- Writing and editing
- General knowledge

### Codex (via API)
- Deep code search
- Repository context
- Implementation patterns
- Code review

### Gemini (via API)
- Web search
- Recent information
- Multi-modal queries
- Broad research

## Routing Logic

### Route to Claude When:
- Technical code questions
- Reasoning or analysis needed
- Writing assistance
- General knowledge

### Route to Codex When:
- Codebase-specific questions
- Finding implementations
- Understanding patterns
- Cross-reference code

### Route to Gemini When:
- Recent events or news
- Web search needed
- Broad research topics
- Verification of facts

## Usage

```
/oma:ask {question}
```

The system will route to the best source based on the question content.

## Examples

```
/oma:ask How does React's useEffect work?
→ Claude (technical explanation)

/oma:ask Find all uses of auth in our codebase
→ Codex (code search)

/oma:ask What's the latest on the React 19 release?
→ Gemini (recent information)
```

## Output Format

```
## Ask: {question}

### Routing
**Source:** {claude|codex|gemini}
**Reason:** {why this source}

### Response
{answer}

### Confidence
{confidence level}
```

## Constraints

- Choose best source, not multiple
- Credit sources in response
- Verify facts when possible
- Be clear about limitations
- Escalate when unsure
