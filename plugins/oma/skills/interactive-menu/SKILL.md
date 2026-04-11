---
name: interactive-menu
description: Pattern for presenting numbered choices to the user in Auggie's conversational TUI
trigger: none (referenced by commands that need selection)
---

# OMA Interactive Menu Pattern

Auggie does not have a native menu widget. Use this conversational pattern when a command needs user selection.

## Format

```
{Title}

{Optional context line}

  1. {Option A}  -- {description}
  2. {Option B}  -- {description}
  3. {Option C}  -- {description}
  4. Type something else

Your choice:
```

## Rules

1. Present options as a numbered list. Keep descriptions to one line each.
2. Always include a "Type something else" option as the last item.
3. Wait for user input. Do not assume a choice.
4. Accept the number ("1") or the option name ("graphwiki") as valid input.
5. If the user types something not in the list (via the last option), validate it against allowed values. If invalid, re-present the menu with an error message.
6. After selection, confirm what was set: "Set graph.provider to graphwiki (local)."
7. Maximum 6 options. If more choices exist, group them or paginate.
8. Do not use emoji, decorative borders, or ASCII art. Clean text only.

## Example: Graph Provider

```
Graph Provider

Current: graphwiki (from local config)

  1. graphwiki   -- TypeScript knowledge graph with wiki compilation
  2. graphify    -- Python knowledge graph with community detection
  3. none        -- Disable graph context
  4. Type something else

Your choice:
```

User types: 2

Agent responds: "Set graph.provider to graphify (local). Install graphify if not already: pip install graphifyy"

## Example: Orchestration Mode

```
Orchestration Mode

Current: ralph

  1. ralph       -- Persistence loop with architect verification
  2. autopilot   -- Full autonomous pipeline
  3. ultrawork   -- Parallel execution
  4. ultraqa     -- QA cycling
  5. Type something else

Your choice:
```
