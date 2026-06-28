# ADR 0005: MCP/A2A open standards and an observability harness surface

## Status
Accepted.

## Context
The init-ai-repo v3 governance standard treats observability (logs, traces,
eval/cost/latency metering) as non-optional harness surface — without it there
is no way to tell whether an agent is doing well or quietly drifting. It also
recommends adopting open standards now: Model Context Protocol (MCP) for tool
access and Agent2Agent (A2A) for cross-agent delegation. Prior to this upgrade,
`oh-my-auggie` had no observability surface and no MCP/A2A surface.

The `AGENTS.md` Harness Map enumerates six context types and documents the
static-vs-dynamic context boundary as a reviewed, versioned decision.

## Decision
- Generate an **observability** surface: `.ai/observability/conventions.md`
  (logging and trace conventions) and `.ai/observability/audit-checklist.md`
  (token-cost and trajectory-audit checklist). These are generated conventions
  and a checklist, not live metering — token-cost and trajectory metering execute
  out-of-band and are recorded as evidence; CI validates only that the conventions
  and checklist exist.
- Promote **MCP/A2A** from a mention to a real surface: `.ai/mcp/registry.json`
  (MCP-server registry stub — `status: "stub"`, no live endpoint resolved) and
  `.ai/mcp/a2a-handoff.md` (A2A cross-agent handoff convention). Generation makes
  no network or model call.
- Generated `AGENTS.md` carries an explicit **Harness Map** enumerating the six
  context types and documents the static-vs-dynamic context boundary as a reviewed,
  versioned architectural decision.

## Consequences
- Agent drift, cost, and trajectory become auditable; supports the model-routing
  audit defined in ADR-0003.
- Choosing MCP/A2A now preserves multi-vendor/framework optionality and avoids
  re-platforming later.
- The static/dynamic context boundary becomes a first-class architectural decision
  rather than an implicit one; moving a context type across it requires an ADR update.
- CI validates only that the generated conventions and checklist exist
  (offline-structural check); it never runs a live model or network call.
