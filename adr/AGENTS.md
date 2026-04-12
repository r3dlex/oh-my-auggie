<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# adr

## Purpose
Architecture Decision Records (ADRs) for oh-my-auggie. Each file documents a key architectural decision with its context, the alternatives considered, and the rationale for the chosen approach. ADRs provide a durable, auditable trail of why the system is designed the way it is.

## Key Files
| File | Description |
|------|-------------|
| 0001-use-auggie-as-subprocess.md | ADR 0001 (Accepted): Use Auggie as a subprocess rather than a plugin |
| 0002-xml-agent-prompt-format.md | ADR 0002 (Proposed): XML-tagged agent prompt format for OMA agents |

## For AI Agents
### Working In This Directory
When making an architectural decision, create a new ADR following the existing numbering scheme (0001, 0002, ...). Use the same frontmatter structure: title, date, status, and deciders. ADRs are never deleted — superseded ADRs are updated to status `Superseded by NNNN` and the superseding ADR is linked back.

### Testing Requirements
No automated tests. ADRs are prose documents; correctness is verified by human review.

### Common Patterns
- Status values: `Proposed`, `Accepted`, `Deprecated`, `Superseded`
- File naming: zero-padded four-digit sequence number followed by a kebab-case slug

## Dependencies
### Internal
- Referenced by top-level AGENTS.md for architectural context

### External
- None

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
