---
name: external-context
description: Parallel document-specialist agents for external web searches and documentation lookup
argument-hint: "<search query or topic>"
trigger: /oma:external-context
level: 4
---

<Purpose>
Fetch external documentation, references, and context for a query. Decomposes the query into 2-5 independent facets and spawns parallel document-specialist agents that search the web and synthesize findings.
</Purpose>

<Use_When>
- User says "external-context", "look up", "research docs", "search the web"
- A question requires official documentation, not just codebase context
- Multiple independent aspects of a topic need research simultaneously
- Verification of facts against official sources is needed
</Use_When>

<Do_Not_Use_When>
- The answer is in the codebase (use explore instead)
- The question is trivial (just answer it directly)
- Only one aspect of the topic needs research (parallelism adds overhead)
- User wants opinions rather than factual documentation
</Do_Not_Use_When>

<Why_This_Exists>
Codebase context is limited. External documentation, official specs, and web research provide the full picture. Parallel research is faster than sequential research.
</Why_This_Exists>

<Execution_Policy>
- Decompose into 2-5 independent facets for parallel research
- Spawn document-specialist agents in parallel (max 5)
- All findings must cite sources with URLs
- Synthesize results into a coherent answer
</Execution_Policy>

<Steps>

## Phase 1: Facet Decomposition

Given a query, decompose into 2-5 independent search facets:

```markdown
## Search Decomposition

**Query:** <original query>

### Facet 1: <facet-name>
- **Search focus:** What to search for
- **Sources:** Official docs, GitHub, blogs, etc.
```

## Phase 2: Parallel Agent Invocation

Fire independent facets in parallel via `Agent`:

```
Agent(subagent_type="oh-my-claudecode:document-specialist", model="sonnet", prompt="Search for: <facet 1 description>. Use WebSearch and WebFetch to find official documentation and examples. Cite all sources with URLs.")
```

Maximum 5 parallel document-specialist agents.

## Phase 3: Synthesis Output Format

Present synthesized results:

```markdown
## External Context: <query>

### Key Findings
1. **<finding>** — Source: [title](url)
2. **<finding>** — Source: [title](url)

### Detailed Results

#### Facet 1: <name>
<aggregated findings with citations>

#### Facet 2: <name>
<aggregated findings with citations>

### Sources
- [Source 1](url)
- [Source 2](url)
```

<Tool_Usage>
- Use `Agent` with `oh-my-claudecode:document-specialist` for parallel web research
- Use `WebSearch` for initial search queries
- Use `WebFetch` to retrieve specific pages
- Maximum 5 parallel agents to avoid rate limits
</Tool_Usage>

<Examples>
```
/oma:external-context What are the best practices for JWT token rotation in Node.js?
/oma:external-context Compare Prisma vs Drizzle ORM for PostgreSQL
/oma:external-context Latest React Server Components patterns and conventions
```
</Examples>

<Final_Checklist>
- [ ] Query decomposed into 2-5 facets
- [ ] All facets fired in parallel
- [ ] All findings cite sources with URLs
- [ ] Results synthesized into a coherent answer
- [ ] No facet is skipped due to parallelism limits
</Final_Checklist>
