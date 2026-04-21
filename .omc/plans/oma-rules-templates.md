# Plan: OMA Rule Template Support

**Plan saved to:** `.omc/plans/oma-rules-templates.md`
**Status:** Draft — awaiting user confirmation
**Architect review:** ITERATE (blockers resolved) — final revision
**Classification:** Mid-sized (targeted feature addition, not architecture redesign)

---

## Context

OMC supports copying rule templates to a user's project:

```bash
mkdir -p .claude/rules && cp "...templates/rules/"*.md .claude/rules/
```

OMC templates: `coding-style.md`, `git-workflow.md`, `karpathy-guidelines.md`, `performance.md`, `security.md`, `testing.md`

OMA currently ships **plugin-internal rules only** in `plugins/oma/rules/`:
- `orchestration.md` — governs OMA's own multi-agent pipeline
- `enterprise.md` — adds cost gates, approval gates, ADR requirements

OMA does **not** install project-level rules (`.augment/rules/` or `.claude/rules/`). This is the gap this plan closes.

---

## RALPLAN-DR Summary

### Principles

1. **Augment-Code-native**: Project rules live in `.augment/rules/` (OMA's primary target), with optional `.claude/rules/` for cross-editor parity.
2. **Opt-in, not opt-out**: Templates are offered during `/oma:setup`, not silently installed. Users choose which to apply.
3. **Additive only**: Installing rules never removes or overwrites existing project rules without explicit user consent.
4. **OMA-specific rules stay plugin-internal**: `orchestration.md` and `enterprise.md` remain in `plugins/oma/rules/` and are not installed to the project.
5. **Discoverable**: `/oma:setup` announces the rule offer; `/oma:help` documents the feature.
6. **RIB-aware**: If a RIB project structure is detected, offer RIB-specific rules alongside generic templates.

### Decision Drivers

1. **OMC feature parity**: OMC users expect rule template installation as part of setup. OMA should match or exceed this.
2. **Augment Code path compatibility**: `.augment/rules/` is Augment-Code-native; `.claude/rules/` enables cross-editor users who also use Claude Code. Supporting both gives maximum flexibility.
3. **Minimal complexity**: The installation mechanism mirrors the established `/oma:setup` skill pattern — no new CLI command needed.
4. **RIB project context**: The current working project (RIB/application) has a specific structure (`backend/src/`, `e2e/`, `binpool/`) that warrants tailored rules.

### Viable Options

| Option | Scope | Pros | Cons | Verdict |
|--------|-------|------|------|---------|
| A: `.augment/rules/` only | Augment-native | Simple, correct for OMA's primary audience | Less useful for cross-editor users | **Chosen** |
| B: `.claude/rules/` only | Claude-native | Works for Claude Code users | Augment-Code users may not have `.claude/` dir | Rejected — OMA is for Augment |
| C: Both, same templates | Both paths | Maximum compatibility | Slight complexity increase | Deferred (easy follow-on) |
| D: Separate CLI command | New skill | Clean separation | Extra command to document and maintain | Rejected — over-engineered |

> **Invalidation rationale for B and D:** OMA is an Augment Code plugin. The primary install target is `.augment/rules/`. `.claude/rules/` support is a reasonable future extension but not the MVP.

---

## Guardrails

### Must Have
- Rule templates are installed via `/oma:setup` as an interactive step (Phase 3.5)
- Templates live in `plugins/oma/templates/rules/` (new directory)
- At least 3 OMC-aligned templates ported: `coding-style.md`, `git-workflow.md`, `security.md`
- A RIB-specific template added: `rib-specific.md`
- User is offered a choice (skip / select all / select subset) — never auto-installed
- Existing project rules are never silently overwritten (unless `--overwrite-existing` flag explicitly set)
- `setup-rules.mjs` supports `--overwrite-existing`, `--rename-existing`, `--skip-existing` CLI flags for non-interactive use
- Template source path uses `$AUGMENT_PLUGIN_ROOT`, not a hardcoded path
- `templates/` is NOT auto-discovered by `plugin.json` — the build/install process must explicitly copy it

### Must NOT Have
- No new top-level command (e.g., `/oma:rules`) — reuse `/oma:setup`
- No rules installed automatically without user consent
- No deletion of existing `.augment/rules/` content
- OMA plugin-internal rules (`orchestration.md`, `enterprise.md`) are NOT copied to project
- Hardcoded `~/.auggie/plugins/oma/` paths

---

## Task Flow

```
User runs /oma:setup
         │
         ▼
Phase 1: CLAUDE.md setup (existing)
Phase 2: Environment config (existing)
Phase 3: Integration setup (existing)
Phase 3.5: Rule Templates [NEW] ◄── interactive offer
         │
         ▼
Phase 4: Completion (existing)
```

**RIB detection:** During Phase 3.5, detect RIB project structure. If `backend/src/` OR `e2e/` OR `binpool/` exists in `$PROJECT_DIR`, offer `rib-specific.md` alongside generic templates.

---

## Detailed TODOs with Acceptance Criteria

### Step 1: Create template source directory and port 3 generic rule templates

**Files to create:**
- `plugins/oma/templates/rules/coding-style.md`
- `plugins/oma/templates/rules/git-workflow.md`
- `plugins/oma/templates/rules/security.md`

**Content approach:**
- Port content from OMC templates where applicable (adapt for Augment Code context)
- Each template should be 15-40 lines — concrete, actionable rules (not philosophy)
- File header: YAML frontmatter with `name`, `description`, `origin: oma-template`

**Build/install mechanism for `templates/`:**

The existing `plugins/oma/rules/` directory provides the pattern. Examining `plugins/oma/.augment-plugin/plugin.json`, the `entry_points` section only declares `commands`, `agents`, `hooks`, and `mcp`. The `rules/` directory is NOT listed in `entry_points` — it is a plugin-internal resource, not auto-discovered. The `templates/` directory follows the same pattern.

The mechanism is simple:
1. `templates/` lives at `plugins/oma/templates/` in the source repo — committed alongside source code, just like `rules/`.
2. When the plugin is published to the Augment marketplace, the entire `plugins/oma/` tree is packaged (full directory copy, no selective filtering).
3. At install time, Augment Code copies the plugin to the user's plugin directory. All files are available at `$AUGMENT_PLUGIN_ROOT`.
4. No `plugin.json` changes (adding `templates` to `entry_points` would be wrong — it is not a discovery entry point, it is a runtime resource).
5. No `package.json` `files` array changes needed.
6. No `postinstall` script needed — the directory is part of the standard package, exactly as `rules/` already is.

**Acceptance criteria:**
- [ ] `plugins/oma/templates/rules/` directory exists with 3 `.md` files
- [ ] Each file has valid YAML frontmatter (`name`, `description`, `origin`)
- [ ] Templates are relevant to Augment Code / multi-agent workflows
- [ ] Templates do NOT duplicate `orchestration.md` content
- [ ] **`templates/` is NOT added to `plugin.json`'s `entry_points`** — it is a runtime resource, not a plugin discovery entry point (same as existing `rules/` directory)
- [ ] No `package.json` changes needed (no `files` array, no `postinstall` script)
- [ ] Open question about build process is resolved: the directory is copied as part of standard plugin packaging (same as `rules/`)

---

### Step 1b: Create RIB-specific rule template

**File to create:**
- `plugins/oma/templates/rules/rib-specific.md`

**Content approach:**
- Adapted for the RIB `~/Ws/Rib/application` project structure
- Reference the presence of `backend/src/`, `e2e/`, `binpool/` directories
- Rules should cover: backend/frontend boundary conventions, e2e test conventions, binpool binary handling, cross-service workflows
- YAML frontmatter: `name: rib-specific`, `description: RIB application conventions`, `origin: oma-template`, `applies_to: rib-project`

**RIB project detection (Phase 3.5):**
- Check for presence of `backend/src/` OR `e2e/` OR `binpool/` in `$PROJECT_DIR`
- If detected, include `rib-specific.md` in the available template list with a note:
  ```
  [4] rib-specific.md — RIB application conventions (backend/src, e2e, binpool)
  ```

**Acceptance criteria:**
- [ ] `plugins/oma/templates/rules/rib-specific.md` exists with YAML frontmatter
- [ ] Template content references RIB project structure (backend, e2e, binpool)
- [ ] Phase 3.5 detects RIB project and includes template in offer
- [ ] Template is installable independently of other templates

---

### Step 2: Update `/oma:setup` skill to add rule template offer

**File to modify:**
- `plugins/oma/commands/oma-setup.md`

**Changes:**
- Add Phase 3.5 between existing Phase 3 (Integration Setup) and Phase 4 (Completion)
- Use `$AUGMENT_PLUGIN_ROOT` (already defined in Phase 3) for the template source path
- Use `.augment/rules/` as the target directory
- New phase asks: "Install project rule templates?" with options:
  1. **Skip** — do not install any rule templates
  2. **All templates** — install all available templates
  3. **Select templates** — interactive multi-select of individual templates
- For non-interactive / `--verify` mode, invoke `setup-rules.mjs` with appropriate flags
- If user selects templates, run `node $AUGMENT_PLUGIN_ROOT/src/setup-rules.mjs` with template arguments

**Bash invocation pattern:**
```bash
# Interactive (oma-setup.md prompts user, passes choice to script)
node "$AUGMENT_PLUGIN_ROOT/src/setup-rules.mjs" \
  --project-dir "$PROJECT_DIR" \
  --templates "coding-style,git-workflow,security,rib-specific"

# Non-interactive with conflict flag
node "$AUGMENT_PLUGIN_ROOT/src/setup-rules.mjs" \
  --project-dir "$PROJECT_DIR" \
  --templates "coding-style,git-workflow,security" \
  --overwrite-existing   # or --rename-existing, --skip-existing

# Verify mode (never blocks on conflicts)
node "$AUGMENT_PLUGIN_ROOT/src/setup-rules.mjs" \
  --project-dir "$PROJECT_DIR" \
  --verify
```

**Acceptance criteria:**
- [ ] Phase 3.5 described in `oma-setup.md` with 3-option choice (skip / all / select)
- [ ] Conflict handling described (overwrite / rename / skip / non-interactive flag)
- [ ] Install logic uses `.augment/rules/` as target directory
- [ ] Template source path uses `$AUGMENT_PLUGIN_ROOT`, not hardcoded `~/.auggie/...`
- [ ] Phase 3.5 includes RIB project detection and conditional template offer
- [ ] Phase 3.5 fits naturally between Phase 3 and Phase 4

---

### Step 3: Implement the rule installation logic

**File to create:** `plugins/oma/src/setup-rules.mjs`

**Implementation:** A standalone ESM script invoked by the setup skill via Bash. Uses `import.meta.url` + `fileURLToPath` for self-location.

**CLI flag interface:**

| Flag | Behavior |
|------|----------|
| `--project-dir <path>` | Target project directory (required) |
| `--templates <list>` | Comma-separated template names (required unless `--verify`) |
| `--overwrite-existing` | Overwrite if target file exists |
| `--rename-existing` | Rename existing file to `<name>.md.oma-backup` before install |
| `--skip-existing` | Skip if target file exists (default when no flag in non-interactive) |
| `--verify` | Report installed templates without making changes; exit 0 even if conflicts |
| `--help` | Print usage and exit |

**Default behavior:**
- When running non-interactively (no TTY detected) and no conflict flag given: default to `--skip-existing`
- `--verify` mode must never prompt or block; it reports status and exits cleanly
- Exit code: 0 on success, 1 on fatal error (unreadable source, missing project dir, etc.)

**Core logic:**
```javascript
// Pseudocode
for (const template of selectedTemplates) {
  const source = new URL(`../templates/rules/${template}.md`, import.meta.url);
  const target = join(projectDir, '.augment', 'rules', `${template}.md`);

  if (!existsSync(source)) {
    console.error(`[ERROR] Template not found: ${template}`);
    continue;
  }

  if (existsSync(target)) {
    if (mode === 'overwrite') {
      cp(source, target);
    } else if (mode === 'rename') {
      cp(target, `${target}.oma-backup`);
      cp(source, target);
    } else { // skip
      console.log(`[SKIP] ${target} already exists`);
      conflicts.push(target);
    }
  } else {
    mkdirSync(dirname(target), { recursive: true });
    cp(source, target);
  }
}
```

**Acceptance criteria:**
- [ ] `setup-rules.mjs` is a standalone ESM script (no npm dependencies beyond Node.js stdlib)
- [ ] `--overwrite-existing`, `--rename-existing`, `--skip-existing` flags work correctly
- [ ] Non-interactive mode (no TTY) defaults to `--skip-existing` when no flag given
- [ ] `--verify` mode reports status without blocking on conflicts
- [ ] `--help` prints usage and exits 0
- [ ] Creates `.augment/rules/` if it does not exist
- [ ] Reports `[INSTALLED]`, `[SKIP]`, `[CONFLICT]`, `[ERROR]` per template
- [ ] Returns non-zero exit code on fatal error
- [ ] Template source path derived from `import.meta.url`, not hardcoded

---

### Step 4: Document the feature in `/oma:help`

**File to modify:** `plugins/oma/commands/oma-help.md`

**Changes:**
Add a "Rule Templates" section explaining:
- What rule templates are
- Which templates are available (including RIB-specific)
- How to install via `/oma:setup`
- Where rules are installed (`.augment/rules/`)
- Non-interactive CLI flags for `--verify` and `--overwrite-existing`

**Acceptance criteria:**
- [ ] New "Rule Templates" section in `oma-help.md`
- [ ] Mentions `.augment/rules/` path
- [ ] Lists available templates with one-line descriptions
- [ ] Documents `--verify` flag behavior
- [ ] Documents non-interactive conflict resolution flags

---

### Step 5: Write tests for rule template installation

**File to create:** `plugins/oma/tests/setup-rules.ts`

**Test framework:** Vitest (matching existing `plugins/oma/tests/` pattern). Uses `tmpdir()` + manual fs operations for isolation rather than mocking.

**Test scenarios:**

| # | Scenario | Setup | Action | Expected |
|---|---------|-------|--------|----------|
| 1 | Happy path — fresh install | No `.augment/rules/` | Install 1 template | File created, `[INSTALLED]` output |
| 2 | Conflict — skip (interactive default) | File exists, no flag | Install same template | File unchanged, `[SKIP]` output |
| 3 | Conflict — rename | File exists | `--rename-existing` | Original renamed to `.oma-backup`, new file installed |
| 4 | Conflict — overwrite | File exists | `--overwrite-existing` | File replaced with new content |
| 5 | Directory creation | No `.augment/rules/` | Install template | Directory created, file inside |
| 6 | Invalid template name | N/A | Install `nonexistent` | `[ERROR]` output, exit code 1 |
| 7 | Empty selection — skip | N/A | No templates selected | No files created, no errors |
| 8 | RIB project detection | RIB dirs present | Detect + offer rib-specific | `rib-specific.md` included in available list |
| 9 | Non-interactive flag resolution | File exists, no TTY | Run without flag | Defaults to `--skip-existing`, no blocking prompt |

**Acceptance criteria:**
- [ ] All 9 test scenarios defined in `plugins/oma/tests/setup-rules.ts`
- [ ] Tests use Vitest (matching existing `plugins/oma/tests/` pattern)
- [ ] Tests use temp directories for isolation
- [ ] `npm test` passes with 0 failures

---

## User Experience

### First-run `/oma:setup`

```
=== oh-my-auggie Setup ===
...
Phase 3: Integration setup... done.

Phase 3.5: Project Rule Templates
==================================
OMA can install coding and workflow rule templates to your project.
These are loaded by Augment Code and guide the agent's behavior.

Available templates:
  [1] coding-style.md  — Style conventions, naming, formatting
  [2] git-workflow.md  — Commit hygiene, branch strategy, PR process
  [3] security.md      — Security-first patterns, secret handling

RIB project detected (backend/src, e2e, binpool found).
  [4] rib-specific.md — RIB application conventions

Rules are installed to: .augment/rules/

Install option:
  [s]kip — do not install any templates
  [a]ll  — install all 4 templates
  [1/2/3/4] — select individual templates

Your choice: a

Installing templates...
[INSTALLED] .augment/rules/coding-style.md
[INSTALLED] .augment/rules/git-workflow.md
[INSTALLED] .augment/rules/security.md
[INSTALLED] .augment/rules/rib-specific.md
Done.

Phase 4: Completion...
```

### Non-interactive `/oma:setup`

```bash
# Install all templates, rename existing conflicts
node "$AUGMENT_PLUGIN_ROOT/src/setup-rules.mjs" \
  --project-dir ~/Ws/Rib/application \
  --templates "coding-style,git-workflow,security,rib-specific" \
  --rename-existing

# Verify what's installed (never blocks)
node "$AUGMENT_PLUGIN_ROOT/src/setup-rules.mjs" \
  --project-dir ~/Ws/Rib/application \
  --verify
```

---

## Success Criteria

1. `plugins/oma/templates/rules/` contains 4 templates with frontmatter (coding-style, git-workflow, security, rib-specific)
2. `templates/` is explicitly NOT listed as an auto-discovered entry point in `plugin.json`; the build/install mechanism (full-directory packaging) is documented
3. **`Augment Code rule-loading verified**: confirmed via official docs that `.augment/rules/` files are auto-loaded on session start (type: `always_apply`). OMA controls installation; Augment Code controls loading. These are independent concerns.**
4. `/oma:setup` includes Phase 3.5 with RIB-aware, interactive template offer (skip / all / select)
5. `--overwrite-existing`, `--rename-existing`, `--skip-existing` flags work correctly
6. `--verify` mode never blocks on conflicts
7. Rules are installed to `.augment/rules/<name>.md`
8. Template source path uses `$AUGMENT_PLUGIN_ROOT`
9. `oma-help.md` documents the feature, available templates, and CLI flags
10. `plugins/oma/tests/setup-rules.ts` passes all 9 test scenarios
11. No existing OMA files are modified (other than `oma-setup.md`, `oma-help.md`)

---

## Open Questions

### Outstanding

- [ ] **Template content sourcing**: Should rule content be ported verbatim from OMC templates or adapted specifically for Augment Code workflows? Adaptation is preferred but needs a brief review pass.
- [ ] **`.claude/rules/` support**: Should we offer both `.augment/rules/` and `.claude/rules/` in the same step? Option C from the analysis above. Low priority for MVP; document as follow-on.
- [ ] **Future templates**: OMC has 6 templates; OMA ports 4 for MVP (3 generic + 1 RIB). Should `karpathy-guidelines.md` and `performance.md` be added in a follow-on? Suggest yes.
- [ ] **Template versioning**: If OMA ships template updates, should setup offer to update existing project rules? (Advanced — defer to v0.2.)

### Resolved

- [x] **Build/install process for `templates/`**: Resolved via investigation of `plugin.json`. Both `rules/` and `templates/` are plugin-internal runtime resources, not auto-discovered entry points. The full plugin directory is packaged and installed; no special copy step needed.
- [x] **Augment Code auto-load of `.augment/rules/*.md`**: Verified via official docs. Augment Code auto-loads `.augment/rules/` files with `type: always_apply`. OMA controls installation; Augment Code controls loading. These are independent concerns.

---

## Consequences

**Positive:**
- OMA parity with OMC for the rule template installation feature
- RIB-specific rules provide immediate value for the current project context
- Users get immediate value from `/oma:setup` beyond just plugin config
- Non-interactive flags enable automation and CI/CD integration
- Clear extension path (more templates, `.claude/rules/` parity)

**Risks:**
- OMC template content may need adaptation for Augment Code context (mitigate: short templates, review before merge)

---

## Follow-ups

- [x] ~~Verify Augment Code loads `.augment/rules/*.md` on session start~~ — Done: verified via official docs (auto-load with `type: always_apply`).
- [x] ~~Document the explicit `templates/` copy step in the build/install process~~ — Done: full-directory packaging pattern confirmed via `plugin.json` investigation.
- [ ] Add `karpathy-guidelines.md` and `performance.md` templates (v0.2)
- [ ] Add `.claude/rules/` parity install option (v0.2)
- [ ] Template versioning / update notification in `/oma:setup --verify` (v0.2)
- [ ] Open-source OMA rule templates in the `oh-my-auggie` GitHub repo
