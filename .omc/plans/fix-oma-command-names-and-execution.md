# Fix OMA Command Names and Execution Framing

**Date:** 2026-04-12
**Scope:** 44 command `.md` files in `plugins/oma/commands/`
**Estimated complexity:** LOW (bulk find-and-replace + template standardization, no code changes)

---

## Context

The Auggie CLI constructs slash command aliases as `/{plugin-namespace}:{name}` from command frontmatter. The OMA plugin namespace is `oma`.

**Issue 1 — Double-prefix:** 42 command files use `name: oma-{name}` in frontmatter, which produces `/oma:oma-{name}` instead of the intended `/oma:{name}`.

**Issue 2 — Commands treated as documentation:** Most commands use documentation-style framing (`## /oma:{name}` + `**Purpose:**` + `**Usage:**`), which causes auggie to summarize the content rather than execute it. Only `oma-update.md` attempts imperative framing but still inconsistently.

**Current state of frontmatter conventions:**
- 42 files use `name: oma-{name}` (broken -- creates double-prefix)
- 2 files use `command: /oma:{name}` (`oma-config.md`, `oma-graph-provider.md` -- these work correctly)

**Cross-reference check:** All internal references within command files, README, CHANGELOG, and docs already use the correct `/oma:{name}` form. No files reference `oma:oma-{name}`. TypeScript hooks (`keyword-detect.ts`, `stop-gate.ts`, `session-start.ts`) do not reference the `name:` field and need no changes.

---

## Work Objectives

1. Fix the double-prefix in all 42 command files so `/oma:{name}` resolves correctly
2. Add imperative execution framing to all commands so auggie executes them instead of summarizing
3. Standardize the frontmatter convention across all 44 files
4. Keep filenames unchanged (frontmatter controls the alias, not the filename)

---

## Guardrails

**Must Have:**
- All 44 command files produce the correct `/oma:{name}` alias
- All commands execute when invoked (not treated as documentation)
- No changes to TypeScript source files
- No changes to filenames
- Internal `/oma:{name}` references remain valid (they already are)

**Must NOT Have:**
- Changes to any `.ts`, `.js`, or `.json` files
- Renaming of command `.md` files
- Changes to the README `/oma:{name}` references (already correct)
- Breaking of the 2 files that already work (`oma-config.md`, `oma-graph-provider.md`)

---

## Task Flow

### Step 1: Standardize frontmatter key to `name:` with stripped prefix (42 files)

**What:** In all 42 files that have `name: oma-{name}`, change to `name: {name}` (strip the `oma-` prefix).

**Pattern:**
```
# BEFORE
name: oma-update

# AFTER
name: update
```

**Complete list of changes (all 42 files):**

| File | Old `name:` value | New `name:` value |
|------|-------------------|-------------------|
| oma-ask.md | oma-ask | ask |
| oma-autopilot.md | oma-autopilot | autopilot |
| oma-cancel.md | oma-cancel | cancel |
| oma-ccg.md | oma-ccg | ccg |
| oma-deep-interview.md | oma-deep-interview | deep-interview |
| oma-deepinit.md | oma-deepinit | deepinit |
| oma-deslop.md | oma-deslop | deslop |
| oma-doctor.md | oma-doctor | doctor |
| oma-help.md | oma-help | help |
| oma-hud.md | oma-hud | hud |
| oma-improve-codebase-architecture.md | oma-improve-codebase-architecture | improve-codebase-architecture |
| oma-interview.md | oma-interview | interview |
| oma-learner.md | oma-learner | learner |
| oma-mcp-setup.md | oma-mcp-setup | mcp-setup |
| oma-note.md | oma-note | note |
| oma-notifications.md | oma-notifications | notifications |
| oma-plan.md | oma-plan | plan |
| oma-ralph.md | oma-ralph | ralph |
| oma-ralphthon.md | oma-ralphthon | ralphthon |
| oma-ralplan.md | oma-ralplan | ralplan |
| oma-release.md | oma-release | release |
| oma-research.md | oma-research | research |
| oma-science.md | oma-science | science |
| oma-session-search.md | oma-session-search | session-search |
| oma-session.md | oma-session | session |
| oma-setup.md | oma-setup | setup |
| oma-skill.md | oma-skill | skill |
| oma-skillify.md | oma-skillify | skillify |
| oma-skills.md | oma-skills | skills |
| oma-status.md | oma-status | status |
| oma-tdd.md | oma-tdd | tdd |
| oma-team.md | oma-team | team |
| oma-teleport.md | oma-teleport | teleport |
| oma-trace.md | oma-trace | trace |
| oma-ultraqa.md | oma-ultraqa | ultraqa |
| oma-ultrawork.md | oma-ultrawork | ultrawork |
| oma-update.md | oma-update | update |
| oma-version.md | oma-version | version |
| oma-visual-verdict.md | oma-visual-verdict | visual-verdict |
| oma-wait.md | oma-wait | wait |
| oma-whatsnew.md | oma-whatsnew | whatsnew |
| oma-writer-memory.md | oma-writer-memory | writer-memory |

**For the 2 files using `command:` key** (`oma-config.md`, `oma-graph-provider.md`): Convert from `command: /oma:{name}` to `name: {name}` to standardize. These already resolve correctly, but using a single frontmatter convention avoids future confusion.

| File | Old frontmatter | New frontmatter |
|------|-----------------|-----------------|
| oma-config.md | `command: /oma:config` | `name: config` |
| oma-graph-provider.md | `command: /oma:graph-provider` | `name: graph-provider` |

**Acceptance criteria:**
- `grep -c "^name: oma-" plugins/oma/commands/*.md` returns 0 matches
- `grep -c "^command:" plugins/oma/commands/*.md` returns 0 matches
- `grep -c "^name: " plugins/oma/commands/*.md` returns 44 matches
- No `name:` value starts with `oma-`

**Implementation hint:** A single `sed` command can handle the 42 `name:` files:
```bash
sed -i '' 's/^name: oma-/name: /' plugins/oma/commands/oma-*.md
```
The 2 `command:` files need manual edits (replace `command: /oma:X` with `name: X`).

---

### Step 2: Add imperative execution framing to all commands

**What:** Replace the documentation-style opening (`## /oma:{name}` + `**Purpose:**`) with an imperative execution preamble that tells auggie to act, not describe.

**Template for the execution preamble (insert immediately after frontmatter `---`):**

```markdown
You are now executing the `/oma:{name}` command. Do not describe or summarize this command.
Execute each step below immediately. Do not ask for confirmation unless a step explicitly requires user input.

---
```

**Three categories of files:**

**Category A -- Already has imperative framing (1 file):** `oma-update.md`
- Current: `You are executing /oma:update. Follow these steps now.`
- Change to match the standard template above (stronger "Do not describe" language)

**Category B -- Documentation-style framing (41 files with `name:`):** All other `name:` files
- Current pattern: `## /oma:{name}\n\n**Purpose:** ...`
- Insert the execution preamble BEFORE the existing `## /oma:{name}` heading
- Keep the existing heading and content intact (it serves as the step reference)

**Category C -- The 2 `command:` files** (`oma-config.md`, `oma-graph-provider.md`):
- Current pattern: `# /oma:{name}\n\nDescription...`
- Same treatment as Category B: insert execution preamble before the heading

**Example transformation (oma-version.md):**

```markdown
---
name: version
description: Show the current installed version of OMA
argument-hint: ""
allowed-tools:
  - Read
  - Glob
model: haiku4.5
---

You are now executing the `/oma:version` command. Do not describe or summarize this command.
Execute each step below immediately. Do not ask for confirmation unless a step explicitly requires user input.

---

## /oma:version

**Purpose:** Display the current OMA version from package.json.
[... rest unchanged ...]
```

**Acceptance criteria:**
- All 44 command files contain the string "Do not describe or summarize this command" within the first 5 lines after the closing `---` of frontmatter
- Manual smoke test of at least 3 commands confirms execution behavior (see Step 4)

---

### Step 3: Verify no broken cross-references

**What:** Run a final grep to confirm nothing references the old broken patterns.

**Checks:**
```bash
# Should return 0 matches:
grep -r "oma:oma-" plugins/oma/

# Should return 0 matches in command files:
grep "^name: oma-" plugins/oma/commands/*.md

# Should return 0 matches:
grep "^command:" plugins/oma/commands/*.md

# Should return 44 matches (one per file):
grep -c "^name: " plugins/oma/commands/*.md | grep -v ":0$" | wc -l
```

**Also verify:**
- README.md references are all `/oma:{name}` (already confirmed correct, no changes needed)
- CHANGELOG.md references are `/oma:{name}` (already correct)
- CONTRIBUTING.md references are `/oma:{name}` (already correct)
- AGENTS.md files reference `/oma:{name}` (already correct)
- TypeScript hooks do not reference `name:` field values (confirmed, no changes needed)

**Acceptance criteria:**
- All 4 grep checks pass as specified above
- No file in the repository contains the string `oma:oma-`

---

### Step 4: Smoke test

**What:** Manually verify the fixes work in a running auggie session.

**Test plan:**
1. Start an auggie session in the oh-my-auggie repo
2. Test 3 commands spanning different categories:
   - `/oma:version` (simple, read-only -- should print version, not describe the command)
   - `/oma:status` (state-reading -- should show OMA state, not describe the command)
   - `/oma:help` (index command -- should list commands, not describe the help command)
3. For each, verify:
   - The alias resolves (auggie does not say "unknown command")
   - The command executes (auggie performs the steps, not "I see you've shared information about...")
4. If any command still gets summarized instead of executed, the imperative preamble template needs strengthening (add `IMPORTANT:` prefix or restructure)

**Acceptance criteria:**
- All 3 test commands resolve by their `/oma:{name}` alias
- All 3 test commands execute their steps rather than being summarized
- No regression in commands that were already working

---

## Success Criteria

1. All 44 command files use `name: {name}` (no `oma-` prefix, no `command:` key)
2. All 44 command files have imperative execution framing
3. Zero instances of `oma:oma-` anywhere in the repository
4. No changes to TypeScript, JavaScript, JSON, or non-command-MD files
5. Smoke test passes for at least 3 representative commands

---

## Open Questions

See `.omc/plans/open-questions.md` for tracked items.
