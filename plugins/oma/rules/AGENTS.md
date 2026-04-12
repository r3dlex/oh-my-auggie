<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# rules

## Purpose
Two Auggie policy rule files defining orchestration constraints injected by auggie as context into every agent session. `orchestration.md` defines core OMA orchestration policies; `enterprise.md` defines enterprise-grade constraints (approval gates, ADR requirements, audit logging).

## Key Files
| File | Description |
|------|-------------|
| orchestration.md | Core OMA orchestration policies: delegation rules, verification requirements, execution protocols |
| enterprise.md | Enterprise constraints: approval gates for sensitive paths, ADR requirements, audit log policies |

## For AI Agents
### Working In This Directory
Edit rule files carefully — their content is injected as system context and affects all agent behavior in every session. Changes take effect after auggie restart (no build step needed). When adding new orchestration constraints, prefer editing existing rule files over adding new ones. Keep rule language declarative and unambiguous.

### Testing Requirements
Rules are not unit-tested directly. After editing, restart auggie and verify the targeted behavior is enforced via `/oma:status` or by triggering the constrained action.

### Common Patterns
- Rules use declarative markdown with clear policy statements.
- `enterprise.md` constraints are opt-in — they activate only when enterprise hooks are enabled.
- Rules should state WHAT is required, not HOW to implement it (implementation is in `../src/hooks/`).

## Dependencies
### Internal
- `../src/hooks/adr-enforce.ts` — implements ADR enforcement policy from `enterprise.md`
- `../src/hooks/approval-gate.ts` — implements approval gate policy from `enterprise.md`
- `../src/hooks/delegation-enforce.ts` — implements delegation policy from `orchestration.md`

### External
- auggie CLI — injects rule file contents as agent context at session start

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
