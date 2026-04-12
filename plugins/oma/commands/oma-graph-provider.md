---
command: /oma:graph-provider
description: Configure which knowledge graph tool to use (graphwiki, graphify, or none)
triggers: graph-provider, graph provider, oma graph
---

# /oma:graph-provider

Sets which knowledge graph tool OMA uses for token-optimized codebase context.

## Usage

### Show current provider

`/oma:graph-provider`

Read the merged config value at graph.provider and display:
- Current provider (graphwiki, graphify, or none)
- Scope (global default or local override)
- Whether the tool is installed (check with `which graphwiki` or `pip show graphifyy`)

### Set provider

`/oma:graph-provider set <provider> [--local]`

- `/oma:graph-provider set graphwiki` -- sets graphwiki for this project (local)
- `/oma:graph-provider set graphify` -- sets graphify for this project (local)
- `/oma:graph-provider set none` -- disables graph context for this project
- `/oma:graph-provider set graphwiki --global` -- sets graphwiki as default for all projects

Default scope is LOCAL (only this project). Use --global to change the default for all projects.

Valid values: graphwiki, graphify, none. Reject anything else.

### Interactive selection (no arguments)

When called with no arguments, present options using the interactive menu pattern
defined in skills/interactive-menu/SKILL.md.

```
Graph Provider Configuration

Current: graphwiki (local override)

Select a provider:

  1. graphwiki  -- TypeScript knowledge graph with wiki compilation (recommended)
  2. graphify   -- Python knowledge graph with community detection
  3. none       -- Disable graph-based context loading
  4. Type something else

Your choice:
```

Wait for user input. Accept "1", "2", "3", "graphwiki", "graphify", "none".
For option 4, accept any text and explain that only graphwiki, graphify, or none are valid.

### Install check

After setting a provider, verify it is installed:
- graphwiki: run `which graphwiki` or check if graphwiki package is in node_modules
- graphify: run `pip show graphifyy` or `which graphify`

If not installed, print install instructions:
- graphwiki: `npm install -g graphwiki`
- graphify: `pip install graphifyy`

Do NOT auto-install. Just inform the user.

## How OMA Uses the Provider

When graph.provider is set, OMA's session-start hook checks for the provider's output directory:
- graphwiki: checks for graphwiki-out/GRAPH_REPORT.md
- graphify: checks for graphify-out/GRAPH_REPORT.md

If the output directory exists, the session-start hook injects a context-loading instruction telling the agent to use the graph for codebase understanding instead of scanning raw files.

If the output directory does not exist, session-start prints a suggestion to run the initial build:
- graphwiki: `graphwiki build .`
- graphify: `/graphify .`

## Dependency Notes

graphwiki is included as an optional dependency of OMA.
If not available, install manually: npm install -g graphwiki
