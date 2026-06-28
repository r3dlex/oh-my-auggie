# ADR 0004: AGENTS.md as single source of truth; CLAUDE.md/GEMINI.md as thin pointers

## Status
Accepted.

## Context
`AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` are static-context rule files; portability
across tools and vendors is a core goal of the AI-SDLC scaffold. Having
`CLAUDE.md` carry content-bearing sections causes it to drift from `AGENTS.md`
and breaks tool-agnostic discovery. Any AI surface that reads only `CLAUDE.md`
misses content carried exclusively in `AGENTS.md`, and vice versa.

The init-ai-repo v3 standard requires AGENTS.md to be the single source of truth
and mandates that CLAUDE.md and GEMINI.md are thin pointers with no content-bearing
sections.

## Decision
- `AGENTS.md` is the **single source of truth** for rule-file/static context,
  including the Harness Map, workflow links, system-prompt references, and the
  AI SDLC methodology.
- `CLAUDE.md` and `GEMINI.md` are **thin pointers** to `AGENTS.md` — a single
  header line and a link, no content-bearing sections (per `modules/documentation-blueprint.md`).
- Self-apply to `oh-my-auggie`: `CLAUDE.md` is replaced with a thin pointer;
  `GEMINI.md` is newly created as a thin pointer.
- Every tool that ingests `CLAUDE.md` or `GEMINI.md` receives a deterministic
  pointer to `AGENTS.md` and the full operating contract therein.

## Consequences
- One canonical rule file to maintain; `CLAUDE.md` and `GEMINI.md` never drift
  from it.
- Tool-agnostic discovery: auggie, Claude Code, Gemini, and future tools all
  resolve to the same operating contract.
- AGENTS.md Harness Map becomes the cross-tool discovery surface for the six
  context types (Instructions, Knowledge, Memory, Examples, Tools, Guardrails).
