# RALPLAN-DR: OMA Skills System Enhancement

**Mode:** DELIBERATE (high-risk cross-cutting change to OMA's skill infrastructure)
**Date:** 2026-04-06
**Revision:** 3 (addresses Architect ITERATE + Critic REVISE feedback; fundamental artifact-structure correction)
**Scope:** 6 implementation steps across skills, commands, hooks, and tests

---

## RALPLAN-DR Summary

### Principles (5)

1. **OMA is a thin Auggie wrapper.** Skills and hooks live in the plugin repo, not Auggie's config. Nothing writes to `~/.augment/` except plugin-managed paths. The `skills/` directory is a documentation convention, not an Auggie entry point — but `commands/`, `agents/`, `hooks/`, and `mcp/` MUST remain inside `plugins/oma/`.
2. **OMC patterns as the target, not the template.** OMC's formats are well-proven. Adapt them to OMA's plugin structure and agent model names (`oma-executor`, `oma-planner`, etc.).
3. **Markdown-only skills.** Pure `.md` files with YAML frontmatter. No new TypeScript skill-runners unless a hook requires it.
4. **Non-regression for existing functionality.** All 32 existing skill directories, all 36 existing command files, and all hooks must behave identically after changes.
5. **Structured enhancement, not rewrite.** Add new sections to existing skills rather than replacing them. Each enhancement must be independently verifiable.

### Decision Drivers (Top 3)

1. **Completeness gap.** OMA skills lack `<Do_Not_Use_When>`, `<Tool_Usage>`, `<Examples>`, `<Escalation_And_Stop_Conditions>`, and `<Final_Checklist>` — the sections that make OMC skills safe and self-documenting.
2. **Two-tier skill system.** OMA has Track A (32 skill directories with `SKILL.md`) and Track B (7 execution-mode command files with YAML frontmatter but no `SKILL.md`: `autopilot`, `ralph`, `cancel`, `deslop`, `setup`, `team`, `deep-interview`). Enhancement strategy must differ for each track.
3. **`commands/oma-skills.md` is the primary index — not `skills/AGENTS.md`.** The existing index (`commands/oma-skills.md`, 54 lines) claims 26 skills but the glob shows 32 skill directories + 36 command files. The index is stale and must be rebuilt.

### Viable Options

#### Item 1: Primary Skills Index

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A (create `skills/AGENTS.md`)** | New file mirroring OMC's agents index | Matches OMC convention | New file that Auggie may not route to; adds a third index |
| **B (update `commands/oma-skills.md` — CHOSEN)** | Rebuild the existing primary index in place | Single source of truth; already routed by Auggie; no new entry point | Must be kept current manually |

**Decision:** Option B. `commands/oma-skills.md` is already the Auggie-routed entry point. `skills/AGENTS.md` does not exist and should not be created.

---

#### Item 2: Track B Skill Enhancement (command-only modes: `autopilot`, `ralph`, `cancel`)

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A (create new `skills/*/SKILL.md` for each)** | Create `skills/autopilot/SKILL.md`, `skills/ralph/SKILL.md`, `skills/cancel/SKILL.md` as new Track A entries | Full OMC skill format; consistent with the 32 existing skills | Duplicates the command file content; two places to maintain |
| **B (enhance `commands/oma-*.md` with OMC sections — CHOSEN)** | Add `<Do_Not_Use_When>`, `<Tool_Usage>`, `<Examples>`, `<Escalation_And_Stop_Conditions>`, `<Final_Checklist>` directly to `commands/oma-autopilot.md`, `commands/oma-ralph.md`, `commands/oma-cancel.md` | No duplication; command files are already the authoritative source | Deviates from the Track A `SKILL.md` convention for these 3 files |

**Decision:** Option B for `autopilot`, `ralph`, `cancel`. These command files are already the authoritative artifact. Adding OMC sections to them is the minimal-change approach. `deslop`, `setup`, `team`, `deep-interview` already have `SKILL.md` (Track A) so they are handled in Step 4.

---

## Pre-Mortem (3 Failure Scenarios)

1. **Step 4 Track B enhancement diverges from Auggie's routing.** Adding OMC sections (`<Do_Not_Use_When>`, etc.) to `commands/oma-*.md` may not be recognized by Auggie's routing layer if it only scans YAML frontmatter. Fix: verify Auggie routes on frontmatter `name` field, not body section headers — if so, body additions are safe.
2. **`delegation-enforce` hook blocks `/oma:skill add|remove|edit` writes at runtime.** If these subcommands delegate to `oma-executor`, writes succeed. If they write directly, the hook blocks them. Fix: document delegation requirement in `commands/oma-skill.md` explicitly.
3. **`commands/oma-skills.md` is out of sync with reality after enhancement.** 6 new command files were created (ralphthon, session-search, teleport, wait, deep-dive, self-improve, verify, external-context, debug, remember) that are not in the current index. The plan updates the index but executor may miss some. Fix: glob `plugins/oma/commands/oma-*.md` as part of Step 1 verification.

---

## Verified Artifact Inventory

### Track A: 32 skill directories with `skills/*/SKILL.md`

Execution modes (7): `autopilot`, `ralph`, `ultrawork`, `ultraqa`, `team`, `ralplan`, `deep-interview`

Planning (1): `plan`

Skill management (3): `skill`, `learner` (= skillify mechanic), `hud`

Session tools (5): `session`, `trace`, `note`, `writer-memory`, `remember`

Research (8): `research`, `science`, `ask`, `ccg`, `deep-dive`, `deepinit`, `interview`, `external-context`

Development (5): `debug`, `verify`, `visual-verdict`, `release`, `self-improve`

Setup/Admin (3): `setup`, `mcp-setup`, `doctor`

### Track B: 36 command files (all in `commands/oma-*.md`)

All 32 Track A skills have a corresponding `commands/oma-{name}.md` file.

Additional command-only files: `oma-autopilot.md`, `oma-ralph.md`, `oma-cancel.md`, `oma-skills.md`, `oma-status.md`, `oma-help.md`, `oma-ralphthon.md`, `oma-session-search.md`, `oma-teleport.md`, `oma-wait.md`

### NOTABLE: `skills/AGENTS.md` does NOT exist

Do not create this file unless Auggie explicitly routes to it. The primary index is `commands/oma-skills.md`.

---

## ADR (Architecture Decision Record)

### Decision

Enhance OMA's skills system using a phased, structured approach across a verified two-tier artifact system:
- **Step 1:** Rebuild `commands/oma-skills.md` as the authoritative, accurate skill index (36 command files, 32 skill dirs)
- **Steps 2-3:** Enhance skill management and learner/skillify system
- **Step 4:** Split Track A (8 existing `SKILL.md` files for `deslop`, `setup`, `team`, `deep-interview`, `ultraqa`, `ultrawork`, `ralplan`, `hud`) and Track B (3 command-only files for `autopilot`, `ralph`, `cancel`)
- **Steps 5-6:** HUD docs parity and frontmatter validation test

### Drivers

1. `commands/oma-skills.md` claims 26 skills but 32 skill directories + 36 command files actually exist
2. `skills/AGENTS.md` does not exist — the plan's Step 1 cannot create it; it must update the existing index
3. `autopilot`, `ralph`, `cancel` have no `SKILL.md` — they are command-only modes; Track B enhancement is the correct approach
4. delegation-enforce hook must not block `/oma:skill` writes at runtime

### Alternatives Considered

- **Create `skills/AGENTS.md`** (rejected: no evidence Auggie routes to it; creates a third index; `commands/oma-skills.md` is already the entry point)
- **Create `skills/autopilot/SKILL.md` for Track B modes** (rejected: duplicates authoritative command files; two places to maintain)
- **Rename `learner` to `skillify`** (rejected: requires ADR for command/alias change; existing `learner` is functional and IS the skillify mechanic)
- **Full OMC HUD port now** (rejected: requires statusline hook integration with unknown Auggie API)
- **Rewrite all 32 skills from scratch** (rejected: non-regression constraint; Phase 1 targets 8 Track A + 3 Track B files)

### Consequences

- `commands/oma-skills.md` rebuilt with accurate counts (32 skill dirs, 36 command files)
- `commands/oma-skill.md` and `skills/skill/SKILL.md` both document all 7 subcommands
- `commands/oma-skillify.md` created as thin alias to `/oma:learner`
- 8 Track A skills get full OMC section treatment in their `SKILL.md`
- 3 Track B command files (`autopilot`, `ralph`, `cancel`) get OMC sections added inline
- `tests/unit/skills/frontmatter-validate.test.ts` added for regression protection

### Follow-ups

- HUD Phase 2: Investigate Auggie's `statusLine` config format and implement the wrapper script
- Local skill registry: Confirm where user skills are stored (`.oma/skills/` vs plugin-level)
- Skill activation: Wire `keyword-detect.ts` to scan skill YAML frontmatter for trigger keywords
- Phase 2 skill enhancements: remaining 24 Track A skills in `plugins/oma/skills/`

---

## Implementation Plan

---

### Step 1: Rebuild `commands/oma-skills.md` as the authoritative index

**File:** `plugins/oma/commands/oma-skills.md` (EXISTS — 54 lines; stale, claims 26 skills)

**What to do:**

- Glob `plugins/oma/commands/oma-*.md` to enumerate ALL 36 command files (do not assume — verify)
- Glob `plugins/oma/skills/*/SKILL.md` to confirm the 32 skill directories
- Rewrite `commands/oma-skills.md` with:
  - Header: accurate counts — **32 skill directories**, **36 command files**
  - Full table of all 36 command files: name, description, trigger keyword
  - Categorized by function: Execution Modes, Planning, Skill Management, Session Tools, Research, Development, Setup/Admin, Meta commands
  - Short-alias table: all `/ask`, `/ralph`, `/ultraqa`, etc. shortcuts
  - Note: "This is the primary OMA skills index. Individual skill docs are in `commands/oma-{name}.md` and `skills/{name}/SKILL.md`."
  - Phase 2 deferred note on HUD: "HUD Phase 2 (actual statusline script) deferred pending Auggie statusLine API research"
  - Do NOT create `skills/AGENTS.md` — that file does not exist

**Verification (mandatory before writing):**
```bash
# Must match before proceeding:
ls plugins/oma/commands/oma-*.md | wc -l  # expect 36
ls plugins/oma/skills/*/SKILL.md | wc -l   # expect 32
```

**Acceptance Criteria:**
- [ ] `commands/oma-skills.md` rebuilt with accurate counts verified by glob
- [ ] All 36 command files listed with name, description, trigger
- [ ] All 32 skill directories listed by category
- [ ] Short-alias table complete for all `/X` form aliases
- [ ] HUD Phase 2 deferred note present
- [ ] `skills/AGENTS.md` was NOT created

---

### Step 2: Enhance `commands/oma-skill.md` and `skills/skill/SKILL.md`

**Files:**
- `plugins/oma/commands/oma-skill.md` (EXISTS — 94 lines; currently has 5 subcommands: `list`, `search`, `add`, `remove`, `edit` — missing `setup`; `sync` is partially documented)
- `plugins/oma/skills/skill/SKILL.md` (EXISTS — 164 lines; has 7 subcommands: `list`, `info`, `create`, `edit`, `delete`, `search`, `sync` — name mismatch with command file; `add` and `setup` are missing)

**What to do:**

Audit both files before writing. Align on 7 subcommands: `list`, `search`, `add`, `remove`, `edit`, `sync`, `setup`.

In `commands/oma-skill.md`:
- Add the missing `setup` subcommand
- Clarify `remove` vs `delete` (standardize on `remove` in the command file)
- Fully document the `sync` subcommand
- Ensure frontmatter has `name`, `description`, `argument-hint`, `allowed-tools`
- Document the delegation requirement: write operations (`add`, `remove`, `edit`) MUST delegate to `oma-executor` when OMA orchestration mode is active

In `skills/skill/SKILL.md`:
- Add the missing `add` and `setup` subcommand documentation
- Align subcommand names with `commands/oma-skill.md`
- Include skill templates (Error Solution, Workflow, Code Pattern, Integration)
- Document OMA-specific paths:
  - User skills: `~/.augment/plugins/marketplaces/oh-my-auggie/plugins/oma/skills-learned/`
  - Project skills: `.oma/skills/`
  - Built-in: `plugins/oma/skills/` (plugin-internal, read-only)

**Acceptance Criteria:**
- [ ] `commands/oma-skill.md` documents all 7 subcommands with correct names
- [ ] `skills/skill/SKILL.md` documents all 7 subcommands aligned with command file
- [ ] Delegation requirement documented in command file
- [ ] OMA paths (user/project/built-in) documented in SKILL.md
- [ ] Skill templates (4 types) present in SKILL.md
- [ ] No existing content removed (only additions)

---

### Step 3: Enhance `skills/learner/SKILL.md` and create `commands/oma-skillify.md`

**Files:**
- `plugins/oma/skills/learner/SKILL.md` (EXISTS — 138 lines; IS the skillify mechanic)
- `plugins/oma/commands/oma-skillify.md` (NEW — thin alias to `/oma:learner`)

**What to do:**

In `skills/learner/SKILL.md`:
- Add the 5-step extraction workflow:
  1. Identify repeatable task
  2. Extract inputs/steps/criteria
  3. Decide placement (built-in, user, project)
  4. Draft SKILL.md with YAML frontmatter
  5. Flag fuzzy items for human review
- Add quality gate (3 questions):
  - Non-Googleable? (would a web search not find this solution?)
  - Codebase-specific? (does it depend on project context?)
  - Hard-won? (did it require debugging or iteration to discover?)
- Add output format: skill name, target location, draft workflow, open questions
- Keep existing 4-step capture process — do NOT remove

In `commands/oma-skillify.md` (NEW FILE):
- YAML frontmatter: `name: oma-skillify`, `description: Create a new skill from a repeated task pattern`, `trigger: /oma:skillify`
- Body: thin alias pointing to `/oma:learner` with note: "This is an alias for /oma:learner. The learner skill implements the skillify mechanic."
- OMA-specific paths in the alias body

**Acceptance Criteria:**
- [ ] `skills/learner/SKILL.md` enhanced with quality gate and 5-step extraction workflow
- [ ] `commands/oma-skillify.md` created as an alias to `/oma:learner`
- [ ] Output format documented
- [ ] No existing content removed from `learner/SKILL.md`

---

### Step 4: Enhance OMA skills with OMC sections

**Split into two tracks based on verified artifact existence:**

#### Track A: 8 skills with existing `SKILL.md` (add full OMC sections)

**Target skills (Phase 1):**

| Skill | File | Sections to add |
|-------|------|-----------------|
| `ultraqa` | `skills/ultraqa/SKILL.md` | Do_Not_Use_When, Tool_Usage, Why_This_Exists, Examples, Escalation_And_Stop_Conditions, Final_Checklist |
| `ultrawork` | `skills/ultrawork/SKILL.md` | Do_Not_Use_When, Tool_Usage, Why_This_Exists, Examples, Escalation_And_Stop_Conditions, Final_Checklist |
| `ralplan` | `skills/ralplan/SKILL.md` | Do_Not_Use_When, Tool_Usage, Why_This_Exists, Examples, Escalation_And_Stop_Conditions, Final_Checklist |
| `team` | `skills/team/SKILL.md` | Do_Not_Use_When, Tool_Usage, Why_This_Exists, Examples, Escalation_And_Stop_Conditions, Final_Checklist |
| `deep-interview` | `skills/deep-interview/SKILL.md` | Do_Not_Use_When, Tool_Usage, Why_This_Exists, Examples, Escalation_And_Stop_Conditions, Final_Checklist |
| `hud` | `skills/hud/SKILL.md` | Do_Not_Use_When, Tool_Usage, Why_This_Exists, Examples, Final_Checklist |
| `deslop` | `skills/deslop/SKILL.md` | Do_Not_Use_When, Examples, Final_Checklist |
| `setup` | `skills/setup/SKILL.md` | Tool_Usage, Why_This_Exists, Examples |

**Track A acceptance criteria:**
- [ ] All 8 Track A `SKILL.md` files have new sections added (not removed)
- [ ] Section content is specific to OMA agent names and paths (not OMC verbatim)
- [ ] No existing content removed

#### Track B: 3 command-only modes (enhance command files directly)

**Target files (Phase 1):**

| Command | File | Sections to add |
|---------|------|-----------------|
| `autopilot` | `commands/oma-autopilot.md` | Do_Not_Use_When, Tool_Usage, Examples, Escalation_And_Stop_Conditions, Final_Checklist |
| `ralph` | `commands/oma-ralph.md` | Do_Not_Use_When, Examples, Escalation_And_Stop_Conditions, Final_Checklist |
| `cancel` | `commands/oma-cancel.md` | Why_This_Exists, Final_Checklist |

**Track B note:** These files have YAML frontmatter with `allowed-tools` and `model` but no OMC body sections. Add sections directly to the markdown body. Auggie routes on frontmatter `name` field — body section headers are not used for routing.

**Track B acceptance criteria:**
- [ ] All 3 Track B command files have new sections added inline
- [ ] Existing frontmatter and body content preserved
- [ ] No `SKILL.md` created for these modes

---

### Step 5: Enhance HUD skill documentation

**Files:**
- `plugins/oma/commands/oma-hud.md` (EXISTS — 102 lines; rewrite to OMC HUD structure)
- `plugins/oma/skills/hud/SKILL.md` (EXISTS — 147 lines; already a Track A skill — handled here with enhanced sections)

**What to do:**

In `commands/oma-hud.md`:
- Rewrite to OMC HUD structure: Quick Commands table, Auto-Setup (Auggie-adapted paths), Display Presets (minimal, focused, full), Display Elements, Color Coding, Configuration schema, Troubleshooting

In `skills/hud/SKILL.md` (already touched in Step 4 Track A — add these additionally):
- `<Do_Not_Use_When>` — when HUD is not useful (e.g., short tasks, single-file edits)
- `<Examples>` — good and bad usage examples
- `<Final_Checklist>` — post-session HUD cleanup checklist

**Phase 2 follow-up (document in open-questions):**
- Investigate Auggie's `statusLine` configuration format
- Determine if Auggie supports statusline commands
- If yes: implement `~/.augment/plugins/.../hud/oma-hud.mjs` wrapper script

**Acceptance Criteria:**
- [ ] `commands/oma-hud.md` follows OMC HUD structure (presets, elements, config schema)
- [ ] `skills/hud/SKILL.md` has HUD-specific sections added (coordinate with Step 4)
- [ ] Phase 2 deferred note present in both files
- [ ] HUD command is still functional (no behavior regression)

---

### Step 6: Add frontmatter validation test

**File:** `plugins/oma/tests/unit/skills/frontmatter-validate.test.ts`

**What to do:**

- Create `plugins/oma/tests/unit/skills/frontmatter-validate.test.ts`
- Test reads all `plugins/oma/skills/*/SKILL.md` files (32 files)
- For each file: parse YAML frontmatter (between `---` markers)
- Assert `name` field exists and is non-empty string
- Assert `description` field exists and is non-empty string
- Assert `trigger` field exists (optional — warn if missing but do not fail)
- Output: list of skills with missing/invalid frontmatter fields
- Run as part of CI gate; must pass before any skill PR is merged

**Acceptance Criteria:**
- [ ] Test file created at `plugins/oma/tests/unit/skills/frontmatter-validate.test.ts`
- [ ] Test reads all 32 `skills/*/SKILL.md` files
- [ ] Validates `name` and `description` fields exist and are non-empty
- [ ] Test runs and passes against all 32 existing skills (no regressions)
- [ ] Test is integrated into the existing test suite at `plugins/oma/tests/`

---

## Dependency Graph

```
Step 1 (rebuild oma-skills.md index)
  └── Enables: Step 4 Track A (skill enhancements reference accurate index)
  └── Independent: Steps 2, 3, 5, 6

Step 2 (skill/SKILL.md + oma-skill.md enhance)
  └── Independent: Steps 1, 3, 5, 6

Step 3 (learner/SKILL.md enhance + oma-skillify.md create)
  └── Independent: Steps 1, 2, 5, 6

Step 4 Track A (8 SKILL.md files)
  └── Depends on: Step 1 (accurate index verified)
  └── Independent: Steps 2, 3, 5, 6

Step 4 Track B (3 command files)
  └── Independent: Steps 1, 2, 3, 5, 6

Step 5 (HUD enhance — oma-hud.md + hud SKILL.md)
  └── Independent: Steps 1, 2, 3, 4, 6
  └── Note: hud SKILL.md is also in Step 4 Track A — coordinate execution

Step 6 (frontmatter test)
  └── Independent: Steps 1, 2, 3, 4, 5
```

**Suggested execution order:** Steps 1, 2, 3, 5, 6 in parallel; Step 4 after Step 1 is confirmed. Within Step 4, Track A and Track B are independent and can run in parallel.

---

## Expanded Test Plan

### Unit Tests
- `plugins/oma/tests/unit/skills/frontmatter-validate.test.ts` — new (Step 6)
- All existing hook tests (`delegation-enforce`, `keyword-detect`, `stop-gate`, etc.) must still pass

### Integration Tests
- Verify Auggie routes `/oma:skills` to `commands/oma-skills.md` after rewrite
- Verify `/oma:skillify` alias resolves to `/oma:learner`
- Verify `/oma:skill` subcommands are documented correctly

### Observability
- After Step 1: Count of skills listed in `commands/oma-skills.md` must equal `ls plugins/oma/commands/oma-*.md | wc -l`
- After Step 4: Count of Track A skills with new sections must equal 8
- After Step 4: Count of Track B command files with new sections must equal 3

---

## Open Questions (tracked in `.omc/plans/open-questions.md`)

- **Auggie routing for body sections:** Does Auggie route on frontmatter `name` field only, or does it also parse body section headers? If it parses section headers, Track B enhancement (adding OMC sections to command files) may not work as intended. — INVESTIGATE before Step 4 Track B execution.
- **OMA local skill storage paths:** Should user-learned skills go to `.oma/skills/` (project) or `~/.augment/plugins/.../skills-learned/`? Need to pick before Step 2 is finalized. — RESOLVED: use both; project-level `.oma/skills/` takes precedence.
- **HUD Phase 2 feasibility:** Does Auggie support `statusLine` in its settings? This determines if Phase 2 is viable. — DEFERRED to Phase 2.
- **`/oma:skill` write permissions:** `/oma:skill add|remove|edit` must delegate to `oma-executor` when OMA mode is active. Confirm this is documented in Step 2. — RESOLVED in ADR: delegation required.

---

## Success Criteria

- [ ] `commands/oma-skills.md` rebuilt with verified accurate counts (36 command files, 32 skill dirs) — `skills/AGENTS.md` NOT created
- [ ] `commands/oma-skill.md` and `skills/skill/SKILL.md` both document all 7 subcommands with delegation requirement
- [ ] `commands/oma-skillify.md` created as a thin alias to `/oma:learner`
- [ ] `skills/learner/SKILL.md` enhanced with quality gate and 5-step extraction workflow
- [ ] 8 Track A `SKILL.md` files (ultraqa, ultrawork, ralplan, team, deep-interview, hud, deslop, setup) have OMC sections added
- [ ] 3 Track B command files (autopilot, ralph, cancel) have OMC sections added inline
- [ ] `commands/oma-hud.md` rewritten to OMC HUD structure; `skills/hud/SKILL.md` has HUD-specific sections added
- [ ] Phase 2 HUD note added to HUD entries
- [ ] `plugins/oma/tests/unit/skills/frontmatter-validate.test.ts` created and passes against all 32 skills
- [ ] All 4 open questions tracked in `.omc/plans/open-questions.md`
- [ ] No existing skill, command, or hook behavior regresses
