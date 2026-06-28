# ADR 0003: init-ai-repo v3 governance upgrade

## Status
Accepted.

## Context
`oh-my-auggie` adopted the v3 AI-SDLC scaffold (ADR-0001) with a minimal `.ai/`
layer (rules, skills, system-prompts, drift) and a `.memory/`/`docs/` tree.
The current init-ai-repo v3 standard adds governance layers that were missing:
workflow manifests, traceability graph, eval-coverage scaffold, MCP/A2A surface,
provider-neutral model-routing policy, observability conventions, an
AI-failure-mode review checklist, command surfaces, and phased status files.

## Decision
Additively generate the missing v3 governance layers, adapted to a standalone
node CLI tool (`topology_type: standalone`, depth 0). Refresh `AGENTS.md` as the
single source of truth (with a Harness Map and workflow links) and make
`CLAUDE.md` and `GEMINI.md` thin pointers to `AGENTS.md` (ADR-0004).

Skills-catalog-specific artifacts are intentionally excluded — this repo is not a
skills catalog. Cascade is a no-op for standalone topology. No example evalsets
are shipped; the eval-coverage gate remains offline-structural.

## Consequences
- The repo now exposes the full v3 surface map: `Instructions`, `Knowledge`,
  `Memory`, `Examples`, `Tools`, and `Guardrails`.
- Existing governance content (`.ai/rules/`, `.ai/skills/`, `.ai/system-prompts/`,
  `.ai/drift/`, `.memory/`, prior ADRs) is preserved unchanged.
- The upgrade is documentation/governance only: no application source code,
  package version, or runtime behavior changed.
