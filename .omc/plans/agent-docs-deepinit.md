# RALPLAN-DR: Agent Docs Deepinit + Repo Documentation Update

**Created:** 2026-04-12
**Status:** DRAFT -- awaiting user confirmation
**Complexity:** MEDIUM
**Mode:** CONSENSUS (SHORT)

---

## Context

The oh-my-auggie repository has **zero AGENTS.md files** anywhere in the tree. The deepinit skill defines a hierarchical documentation format that gives AI agents (and human contributors) structured context about each directory's purpose, key files, testing requirements, and common patterns.

Additionally, the existing top-level and plugin-level markdown files (README.md, SPEC.md, CONTRIBUTING.md, etc.) contain stale counts and incomplete references that need reconciliation with the actual state of the repo.

### Actual Inventory (as of 2026-04-12)

| Primitive | README/SPEC Count | Actual Count | Delta |
|-----------|-------------------|--------------|-------|
| Agents    | 19                | 19           | OK    |
| Commands  | 43 (README), 28 (SPEC) | 44      | README off by 1, SPEC off by 16 |
| Skills    | 34                | 36           | Off by 2 |
| Hooks (src) | 9 (README)      | 10           | Off by 1 |

### Directories Needing AGENTS.md

**Root level:** `/` (repo root)
**Plugin level:** `plugins/oma/`
**Leaf directories (under plugins/oma/):**
- `agents/` -- 19 agent definition files
- `commands/` -- 44 command files
- `skills/` -- 36 skill subdirectories
- `src/` -- TypeScript source (hooks/, skills/ subdirs)
- `tests/` -- unit/, e2e/, parity/ subdirs
- `hooks/` -- hooks.json configuration
- `rules/` -- 2 policy files
- `mcp/` -- MCP state server
- `templates/` -- rule templates
- `examples/` -- usage examples
- `benchmarks/` -- performance baselines

**Top-level repo directories:**
- `adr/` -- architecture decision records
- `bin/` -- CLI entrypoint
- `cli/` -- CLI commands and workers
- `e2e/` -- end-to-end bats tests
- `scripts/` -- release scripts

**Skip:** `dist/`, `node_modules/`, `coverage/`, `.omc/`, `.oma/`

---

## RALPLAN-DR Summary

### Principles (5)

1. **Hierarchy-first:** AGENTS.md files form a navigable tree; each file links to its parent via `<!-- Parent: -->` comment
2. **AI-agent-oriented:** The "For AI Agents" section is the primary value -- it tells agents what to do and not do in each directory
3. **Single source of truth:** Counts, lists, and references in README/SPEC/CONTRIBUTING must match actual filesystem state
4. **Minimal disruption:** Agent definition files (agents/*.md) already follow a consistent YAML+XML format and do NOT need structural changes -- the AGENTS.md files describe them, not replace them
5. **Batch-friendly:** AGENTS.md files are independent per directory and can be created in parallel

### Decision Drivers (Top 3)

1. **Contributor onboarding:** New contributors (human and AI) need structured context about what each directory contains and how to work in it
2. **Accuracy:** Stale counts in README/SPEC erode trust; they must reflect the actual 19/44/36/10 inventory
3. **Maintainability:** The deepinit format includes `<!-- Generated/Updated -->` timestamps so staleness is detectable

### Viable Options

#### Option A: Full Deepinit + Doc Reconciliation (RECOMMENDED)

Create AGENTS.md in all ~18 directories that warrant them, then update all stale markdown files.

**Pros:**
- Complete coverage for AI agent navigation
- All docs accurate in one pass
- Establishes the pattern for future directories

**Cons:**
- ~18 new files + ~5 file edits = moderate PR size
- Some leaf directories (benchmarks/, examples/) have minimal content

#### Option B: Core-Only Deepinit + Doc Reconciliation

Create AGENTS.md only in the 8 most important directories (root, plugins/oma/, agents/, commands/, skills/, src/, tests/, hooks/) and update stale docs.

**Pros:**
- Smaller PR, faster review
- Covers the directories agents actually navigate to

**Cons:**
- Incomplete coverage; secondary dirs (adr/, cli/, e2e/, mcp/, rules/, templates/, examples/, benchmarks/, bin/, scripts/) left undocumented
- Breaks the "every directory has context" principle

#### Why Option A is preferred

Option B saves marginal effort (~10 small files) but leaves gaps that will need to be filled later anyway. Since AGENTS.md files for small directories are short (under 40 lines), the incremental cost is low and the completeness benefit is high.

---

## Guardrails

### Must Have
- Every AGENTS.md follows the **OMC directory-navigation format** (Parent comment, Generated/Updated timestamps, Purpose, Key Files table, Subdirectories table, For AI Agents section, Dependencies). Note: this is a directory-documentation format distinct from the Agent Hierarchy format defined in `skills/deepinit/SKILL.md` (Role/Scope/Reports-to/Handoffs/Escalation), which is designed for agent *role* definitions, not directory navigation.
- All counts in README.md and SPEC.md match actual filesystem counts
- Agent definition files (agents/*.md) are NOT modified structurally -- they already follow a consistent format

### Must NOT Have
- AGENTS.md files in dist/, node_modules/, coverage/, .omc/, .oma/
- Changes to agent definition file format (YAML frontmatter + XML Agent_Prompt)
- New features or behavioral changes -- this is a documentation-only task
- AGENTS.md files inside individual skill subdirectories (skills/ask/, skills/ccg/, etc.) -- each already has SKILL.md; the skills/ parent AGENTS.md covers the index

### Clarification

`src/hooks/` and `src/skills/` are covered by `src/AGENTS.md` and do NOT get their own child AGENTS.md files.

### Canonical AGENTS.md Template

Every AGENTS.md file the executor creates MUST follow this exact template structure:

```markdown
<!-- Parent: {relative-path-to-parent}/AGENTS.md -->
<!-- Generated: {YYYY-MM-DD} | Updated: {YYYY-MM-DD} -->

# {Directory Name}

## Purpose
{One-paragraph description of what this directory contains and its role in the project.}

## Key Files

| File | Description |
|------|-------------|
| `file.ts` | Brief description |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `subdir/` | What it contains (see `subdir/AGENTS.md`) |

## For AI Agents

### Working In This Directory
{Special instructions for AI agents modifying files here.}

### Testing Requirements
{How to verify changes in this directory.}

### Common Patterns
{Conventions or patterns used here.}

## Dependencies

### Internal
{Other parts of the codebase this depends on.}

### External
{Key external packages/libraries used.}

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
```

**Path rule:** `<!-- Parent: -->` uses a path RELATIVE to the file's own location (e.g., `plugins/oma/AGENTS.md` uses `<!-- Parent: ../../AGENTS.md -->`). Never use repo-root-relative paths.

---

## Task Flow

### Execution Order & Parallelization

```
Phase 1 (parallel):  Create all AGENTS.md files
  |-- Task 1a: Root + plugins/oma/ AGENTS.md
  |-- Task 1b: plugins/oma/ subdirectories (agents/, commands/, skills/, src/, tests/, hooks/, rules/, mcp/, templates/, examples/, benchmarks/)
  |-- Task 1c: Top-level repo directories (adr/, bin/, cli/, e2e/, scripts/)

Phase 2 (parallel):  Update existing markdown files
  |-- Task 2a: README.md count/reference fixes
  |-- Task 2b: SPEC.md count/reference fixes
  |-- Task 2c: plugins/oma/CONTRIBUTING.md + CHANGELOG.md audit (if stale)

Phase 3 (sequential): Verification + Staleness Detection
  |-- Task 3a: Create count-validation script (scripts/validate-agents-md.sh)
  |-- Task 3b: Validate all AGENTS.md files parse correctly, parent links resolve, counts match
```

---

## Detailed TODOs

### Task 1a: Root and Plugin AGENTS.md (2 files)

**Files to create:**
- `/AGENTS.md` -- repo root, lists top-level dirs (adr/, assets/, bin/, cli/, e2e/, plugins/, scripts/)
- `/plugins/oma/AGENTS.md` -- plugin root, lists all plugin subdirs (agents/, commands/, skills/, src/, tests/, hooks/, rules/, mcp/, templates/, examples/, benchmarks/)

**Acceptance criteria:**
- [ ] Each file has `<!-- Parent: -->` comment (root has none or self-reference; plugins/oma/ points to `../../AGENTS.md`)
- [ ] `<!-- Generated: {ISO timestamp} | Updated: {ISO timestamp} -->` present
- [ ] Purpose section accurately describes the repo/plugin
- [ ] Key Files table lists important files (package.json, tsconfig.json, etc.)
- [ ] Subdirectories table lists all child dirs with accurate one-line descriptions
- [ ] "For AI Agents" section includes working-in-this-directory guidance, testing requirements, and common patterns
- [ ] Dependencies section lists internal (cross-dir) and external (npm, auggie) deps

### Task 1b: Plugin Subdirectory AGENTS.md (11 files)

**Files to create:**
- `plugins/oma/agents/AGENTS.md`
- `plugins/oma/commands/AGENTS.md`
- `plugins/oma/skills/AGENTS.md`
- `plugins/oma/src/AGENTS.md`
- `plugins/oma/tests/AGENTS.md`
- `plugins/oma/hooks/AGENTS.md`
- `plugins/oma/rules/AGENTS.md`
- `plugins/oma/mcp/AGENTS.md`
- `plugins/oma/templates/AGENTS.md`
- `plugins/oma/examples/AGENTS.md`
- `plugins/oma/benchmarks/AGENTS.md`

**Acceptance criteria:**
- [ ] Each `<!-- Parent: -->` points to `../AGENTS.md` (i.e., plugins/oma/AGENTS.md)
- [ ] Key Files table lists every file in the directory (for small dirs) or the most important files (for large dirs like commands/ with 44 files)
- [ ] agents/AGENTS.md lists all 19 agent files with name and one-line description from their YAML frontmatter
- [ ] commands/AGENTS.md lists all 44 command files grouped logically (orchestration, utility, skills)
- [ ] skills/AGENTS.md lists all 36 skill subdirectories with descriptions from each SKILL.md
- [ ] src/AGENTS.md documents the TypeScript source structure (hooks/, skills/, index.ts, types.ts, utils.ts)
- [ ] tests/AGENTS.md describes test organization (unit/, e2e/, parity/) and how to run tests
- [ ] "For AI Agents" sections include directory-specific guidance (e.g., "When adding a new agent, copy an existing file and update the YAML frontmatter")

### Task 1c: Top-Level Repo Directory AGENTS.md (5 files)

**Files to create:**
- `adr/AGENTS.md`
- `bin/AGENTS.md`
- `cli/AGENTS.md`
- `e2e/AGENTS.md`
- `scripts/AGENTS.md`

**Acceptance criteria:**
- [ ] Each `<!-- Parent: -->` points to `../AGENTS.md` (repo root)
- [ ] Key Files and Subdirectories tables are accurate
- [ ] "For AI Agents" sections provide actionable guidance for working in each directory

### Task 2a: README.md Updates

**File:** `/README.md` (and all localized variants: README.de.md, README.es.md, etc.)

**Acceptance criteria:**
- [ ] Commands count updated: 43 -> 44 (or table updated to include the missing command)
- [ ] Skills count updated: 34 -> 36
- [ ] Hooks count updated: 9 -> 10
- [ ] Architecture tree reflects current directory structure
- [ ] Commands table is complete and matches actual commands/ directory
- [ ] Localized READMEs receive the same count/structural fixes (content translation is out of scope)
- [ ] Use `grep -n` to locate count patterns (e.g., `43 commands`, `34 skills`, `9 hooks`) across all `README.*.md` files and update each occurrence. The directory/architecture tree structure is identical across all variants -- update counts in the same relative position.

### Task 2b: SPEC.md Updates

**File:** `/SPEC.md`

**Acceptance criteria:**
- [ ] Commands count updated from 28 to 44
- [ ] Agent count confirmed at 19
- [ ] Architecture tree matches actual directory layout
- [ ] Any other stale counts or references corrected

### Task 2c: Plugin Markdown Audit

**Files:** `plugins/oma/CONTRIBUTING.md`, `plugins/oma/CHANGELOG.md`, `plugins/oma/MIGRATION-AUDIT.md`

**Acceptance criteria:**
- [ ] No stale counts or references to old directory structures
- [ ] CONTRIBUTING.md directory references match actual layout
- [ ] CONTRIBUTING.md explicitly states: "Update AGENTS.md when adding or removing files from a directory"
- [ ] Root AGENTS.md Subdirectories table lists `assets/` (even though assets/ does not get its own child AGENTS.md, since it contains only image files)
- [ ] No action needed if already accurate (likely the case for CHANGELOG and MIGRATION-AUDIT)

### Task 3a: Count-Validation Script

**File to create:** `scripts/validate-agents-md.sh`

A shell script that:
1. Counts files in each documented directory (agents/, commands/, skills/, src/hooks/)
2. Extracts the corresponding counts from the root AGENTS.md and plugins/oma/AGENTS.md
3. Compares actual vs. documented counts and exits non-zero on mismatch
4. Verifies all `<!-- Parent: -->` links resolve to existing AGENTS.md files
5. Verifies the total number of AGENTS.md files matches the expected count (18)

**Acceptance criteria:**
- [ ] Script is executable (`chmod +x`) and runs with `bash scripts/validate-agents-md.sh`
- [ ] Exits 0 when all counts match and parent links resolve; exits 1 with human-readable diff on mismatch
- [ ] Can be added to CI (e.g., `npm run validate:agents` or a GitHub Actions step) -- the script itself is CI-ready, but wiring it into CI config is a follow-up
- [ ] Script is documented with a usage comment at the top

### Task 3b: Manual Verification Pass

**Acceptance criteria:**
- [ ] All AGENTS.md files have valid `<!-- Parent: -->` links that resolve to existing files
- [ ] All `<!-- Generated: -->` timestamps are present
- [ ] No AGENTS.md files exist in excluded directories (dist/, node_modules/, coverage/)
- [ ] Counts in README.md and SPEC.md match: `ls plugins/oma/agents/ | wc -l` = 19, `ls plugins/oma/commands/ | wc -l` = 44, `ls plugins/oma/skills/ | wc -l` = 36
- [ ] All AGENTS.md files render as valid markdown (no broken tables, no unclosed tags)
- [ ] `bash scripts/validate-agents-md.sh` exits 0

---

## Success Criteria

1. `find . -name AGENTS.md -not -path '*/node_modules/*' -not -path '*/dist/*' | wc -l` returns 18 (1 root + 1 plugin root + 11 plugin subdirs + 5 top-level dirs)
2. Every directory with source code or documentation has an AGENTS.md that follows the OMC directory-navigation format
3. README.md and SPEC.md counts match actual filesystem state
4. Agent definition files (agents/*.md) are untouched structurally
5. PR is documentation-only -- no behavioral changes

---

## ADR: Hierarchical AGENTS.md Documentation

**Decision:** Adopt the deepinit hierarchical AGENTS.md format across the entire oh-my-auggie repository.

**Drivers:**
1. AI agents navigating the codebase need structured, per-directory context to work effectively
2. Contributors (human and AI) need accurate counts and references in top-level docs
3. The deepinit format is already defined as a skill in this repo but was never applied to the repo itself

**Alternatives considered:**
- **Option B (core-only):** Create AGENTS.md in only 8 key directories. Rejected because the incremental effort for full coverage is low (~10 additional small files) and partial coverage undermines the navigability principle.
- **Inline documentation in existing files:** Add directory context to README.md or CONTRIBUTING.md instead of separate AGENTS.md files. Rejected because it conflates human-facing docs with AI-agent navigation context, and does not support the `<!-- Parent: -->` hierarchy.

**Why chosen:** Full deepinit coverage (Option A) provides complete AI-agent navigability at minimal incremental cost over partial coverage, and establishes a maintainable pattern for future directories.

**Consequences:**
- 18 new AGENTS.md files + 1 validation script to maintain when directories change
- Future new directories should include AGENTS.md creation as part of their setup checklist
- The deepinit skill could be enhanced to auto-generate/update these files
- `scripts/validate-agents-md.sh` provides a staleness-detection mechanism that can catch drift between filesystem state and AGENTS.md contents

**Follow-ups:**
- Wire `scripts/validate-agents-md.sh` into CI (GitHub Actions step or `npm run validate:agents`)
- Consider enhancing the deepinit skill to regenerate AGENTS.md files on demand
- Add "create AGENTS.md" to the CONTRIBUTING.md checklist for new directories (addressed in Task 2c)

---

## Open Questions

- [ ] Should individual skill subdirectories (skills/ask/, skills/ccg/, etc.) also get AGENTS.md, or is the parent skills/AGENTS.md sufficient given each already has SKILL.md? -- Current recommendation: parent-only, since SKILL.md already serves as per-skill documentation.
- [ ] Should localized README translations (README.de.md, README.es.md, etc.) receive full structural updates or only count fixes? -- Recommendation: count fixes only; full translation is a separate task.
- [x] The `assets/` directory contains only image files. Should it get an AGENTS.md? -- **Resolved:** No child AGENTS.md for assets/, but it must be listed in the root AGENTS.md Subdirectories table (addressed in Task 2c acceptance criteria).

---

## Estimated Effort

- **Phase 1 (AGENTS.md creation):** ~18 files, mostly templated. Parallelizable. ~60-90 min executor time.
- **Phase 2 (doc updates):** ~5-15 file edits (README + variants, SPEC, possibly CONTRIBUTING). ~30 min executor time.
- **Phase 3 (validation script + verification):** ~30 min (script creation ~15 min, verification pass ~15 min).
- **Total:** ~2 hours executor time.
