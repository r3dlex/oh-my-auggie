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
3. Read graphwiki-out/wiki/index.md to find relevant pages (~1-3K tokens) (falls back to wiki/index.md if graphwiki-out/ layout differs)
4. Read targeted wiki pages (~2-5K each, max 3 pages per query)
5. Only read raw source files if wiki page is missing or confidence is low

### Commands

| Command | Use When |
|---------|----------|
| `graphwiki query "<question>"` | General questions about the codebase |
| `graphwiki path <nodeA> <nodeB>` | How two modules/concepts connect |
| `graphwiki status` | Check graph health and drift score |
| `graphwiki lint` | Find contradictions in the graph |
| `graphwiki build . --update` | After changing files (incremental) |
| `graphwiki build . --resume` | Resume a crashed/interrupted build |
| `graphwiki ingest <file>` | Add a new file to the graph |
| `graphwiki benchmark "<question>"` | Measure token cost of a query |

### Hard Constraints
- **NEVER** modify files in `raw/` (immutable source files)
- **NEVER** modify files in `graphwiki-out/` (auto-generated output)
- Maximum 3 wiki pages per query (token budget)

## Provider: graphify

If graphify-out/ exists:

1. Read graphify-out/GRAPH_REPORT.md for project overview
2. Use graphify query "<question>" for targeted lookups
3. Use graphify path "<nodeA>" "<nodeB>" for structural connections
4. Read graphify-out/graph.json only for programmatic traversal
5. Only read raw source files if graph data is insufficient

### Commands

| Command | Use When |
|---------|----------|
| `/graphify query "<question>"` | General codebase questions (BFS) |
| `/graphify query "<question>" --dfs` | Trace a specific path (DFS) |
| `/graphify path "<nodeA>" "<nodeB>"` | Shortest path between two concepts |
| `/graphify explain "<node>"` | Understand what a specific node does |
| `/graphify .` | Full rebuild of the knowledge graph |
| `/graphify . --update` | Incremental rebuild (changed files only) |
| `/graphify . --wiki` | Generate agent-crawlable wiki output |
| `/graphify add <url>` | Fetch and add a URL to the graph |
| `/graphify . --watch` | Auto-rebuild on file changes |
| `/graphify . --mcp` | Start MCP stdio server for agent access |

### Hard Constraints
- **NEVER** modify files in `graphify-out/` (auto-generated output)
- `graphify-out/graph.json` is for programmatic traversal only. Use query/path commands.

## Token Budget

The entire point of using a graph provider is to avoid re-reading raw source files every session. A 50-file codebase costs ~100K+ tokens to read raw. The graph reduces this to ~2-5K tokens per query.

Do NOT fall back to reading raw files unless the graph explicitly lacks the information needed.