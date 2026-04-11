---
name: graph-context
description: Load codebase context from knowledge graph instead of scanning raw files
trigger: auto (injected by session-start when graph provider is configured)
---

# Graph Context Loading

A knowledge graph has been built for this project. Use it instead of scanning raw files.

## Provider: graphwiki

If graphwiki-out/ exists:

1. Read graphwiki-out/GRAPH_REPORT.md for project overview (~1-2K tokens)
2. Use `graphwiki path <nodeA> <nodeB>` for structural queries (0 extra tokens)
3. Read wiki/index.md to find relevant pages (~1-3K tokens)
4. Read targeted wiki pages (~2-5K each, max 3 pages per query)
5. Only read raw source files if wiki page is missing or confidence is low

## Provider: graphify

If graphify-out/ exists:

1. Read graphify-out/GRAPH_REPORT.md for project overview
2. Use graphify query "<question>" for targeted lookups
3. Use graphify path "<nodeA>" "<nodeB>" for structural connections
4. Read graphify-out/graph.json only for programmatic traversal
5. Only read raw source files if graph data is insufficient

## Token Budget

The entire point of using a graph provider is to avoid re-reading raw source files every session. A 50-file codebase costs ~100K+ tokens to read raw. The graph reduces this to ~2-5K tokens per query.

Do NOT fall back to reading raw files unless the graph explicitly lacks the information needed.