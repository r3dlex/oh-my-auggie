<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# templates

## Purpose
Template files used by OMA commands and skills when scaffolding new project artifacts. Contains a `rules/` subdirectory with template rule files that are copied into projects during `oma-setup` or rule initialization.

## Key Files
| File | Description |
|------|-------------|
| rules/adr-template.md | Template for Architecture Decision Records (ADRs) injected by the ADR enforce hook |
| rules/coding-style.md | Coding style rule template installed into projects |
| rules/git-workflow.md | Git workflow rule template installed into projects |
| rules/rib-specific.md | Repository-specific rule template for project customization |
| rules/security.md | Security policy rule template installed into projects |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| rules/ | Rule file templates copied to projects by setup commands |

## For AI Agents
### Working In This Directory
When modifying a template, ensure the resulting file is valid Markdown and follows the same structure as the existing templates. Templates in `rules/` are installed verbatim into target projects by `src/setup-rules.ts` — keep them general and project-agnostic.

### Testing Requirements
Template installation is tested via `tests/setup-rules.test.ts`. After modifying a template, run `npm test` to verify the setup logic still works.

### Common Patterns
- Templates use placeholder comments (`<!-- customize below -->`) to guide project-specific additions.
- `adr-template.md` is referenced by `src/hooks/adr-enforce.ts` when creating new ADR stubs.

## Dependencies
### Internal
- `../src/setup-rules.ts` — reads and installs these templates into target projects

### External
- None

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
