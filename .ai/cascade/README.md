# Cascade

`oh-my-auggie` is a standalone repository (`topology_type: standalone`, depth 0),
so multi-repo cascade is a **no-op**. No parent/child work items are created
unless explicit multi-repo selection is later enabled.

- `cascade-plan.json` — the no-op standalone plan (`cascade_mode: no-op-standalone`).

Hosted parent/child mutation, host-adapter contracts, audit logs, and
reconciliation reports are only generated for umbrella topologies. See
`modules/cascade.md` for the full multi-repo contract.
