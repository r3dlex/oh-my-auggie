# Karpathy Guidelines — Reference

Anti-pattern catalog and concrete scenarios for the four rules in SKILL.md.

## Anti-Pattern Catalog

### AP-1: The Helpful Refactor
Agent fixes nearby code "while it's there" — renaming, improving, extracting.
**Detection:** Diff touches files not named in the task.
**Correction:** File a separate issue for cleanup.

### AP-2: The Premature Abstraction
Agent introduces a class/utility for a pattern with one call site.
**Detection:** New abstraction has exactly one consumer.
**Correction:** Inline. If a second use case appears, abstract then.

### AP-3: The Exhaustive Documentation Pass
Agent writes JSDoc on every function, adds README sections, updates changelogs.
**Detection:** Doc changes exceed code changes in line count.
**Correction:** Document only what the task explicitly requests.

### AP-4: The Safety Net Spiral
Agent adds retries, circuit breakers, fallback paths "just in case."
**Detection:** More error-handling lines than happy-path lines.
**Correction:** Check the ADR. Add only what architecture requires.

### AP-5: The Understanding Skip
Agent writes code immediately without reading acceptance criteria.
**Detection:** First edit in transcript before any file reads.
**Correction:** Read issue fully, grep for existing usages, then write.

### AP-6: The Completion Theater
Agent declares "done" before running verification.
**Detection:** No build/test output before "done."
**Correction:** Show fresh verification output.
