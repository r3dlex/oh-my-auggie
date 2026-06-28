# Traceability Validation Report

- schema_version: `1.1`
- status: `pass`
- graph: `.ai/traceability/graph.json`
- node_count: `5`
- edge_count: `4`
- dangling_edges: `0`
- dangling_backlinks: `0`
- covered_types: `adr, workflow, validation, handoff`

All edge endpoints resolve to declared nodes and all backlinks reference existing node IDs. No eval evidence is wired yet; `eval-result`/`trajectory-trace` nodes (schema 1.1) may be added when evalsets are generated.
