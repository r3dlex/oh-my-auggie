# Ralplan: Map All OMC Skills to OMA

## RALPLAN-DR Summary (Short Mode)

### Principles
1. **OMA is "oh-my-auggie"** — Augment Code native, not a clone of OMC. OMA design decisions take priority over OMC equivalents.
2. **Skillify principle** — New skills emerge from session workflows; capture them as reusable SKILL.md drafts.
3. **Selective porting** — Only import skills that add genuine capability beyond OMA's existing 24 skills.

### Decision Drivers
1. **Feature parity vs. specificity** — OMA serves Augment Code (macOS/Linux/WSL) not general Claude Code
2. **Overlap handling** — 4 OMC skills have clear OMA equivalents; use OMA version + extract 1-2 OMC features
3. **Skillify installation** — `/oma:skill sync` handles remote installation; skillify is a session-capture workflow, not an install mechanism

### Viable Options

**Option A: Import all 16 missing skills wholesale**
- Pros: Fastest to feature parity
- Cons: Imports skills that don't fit Augment Code model (sciomc, PSM); causes confusion from near-duplicates

**Option B: Phased selective port (SELECTED)**
- Pros: Clean architecture, prioritizes high-value skills, handles overlaps systematically
- Cons: Slower upfront

**Option C: Skillify first then use it to port**
- Pros: Self-hosting growth
- Cons: Circular bootstrap — skillify is itself a missing skill

---

## OMC Skill Inventory (36 skills + AGENTS.md)

| Skill | OMA Status | Action |
|-------|-----------|--------|
| **AGENTS.md** | N/A | Reference doc, not a skill |
| ai-slop-cleaner | deslop command + deslop skill | **Merge**: enhance deslop command with regression-lock from OMC |
| ask | Exists (ask.md) | Keep OMA; OMC routes to Codex/Gemini not relevant |
| autopilot | Exists (autopilot.md) | **DIFFERENT** — OMC autopilot is full pipeline; OMA has same name different scope |
| cancel | Exists (cancel.md) | **OVERLAP** — both exist; OMC has force/--all cascade; port that feature to OMA |
| ccg | Exists (ccg.md) | Ported ✓ |
| configure-notifications | notifications skill exists | Check overlap; likely keep OMA |
| debug | Missing | **Phase 1** → **DONE** ✓ |
| deep-dive | Missing | **Phase 3** — depends on deep-interview |
| deep-interview | Missing (interview exists) | **Phase 1** → **DONE** ✓ |
| deepinit | Exists | Ported ✓ |
| external-context | Missing | **Phase 1** → **DONE** ✓ |
| hud | Exists | Ported ✓ |
| learner | Exists | Ported ✓ |
| mcp-setup | Exists | Ported ✓ |
| omc-doctor | doctor command exists | **Merge**: add legacy-content check to OMA doctor |
| omc-reference | Not needed | Already covered by SPEC.md and agent files |
| omc-setup | setup command exists | **Enhance**: add `--resume` flag inspired by OMC |
| omc-teams | team command exists | Keep OMA; CLI-team differs from omc-teams tmux model |
| plan | Exists | Ported ✓ |
| project-session-manager | session skill exists | **DIFFERENT** — PSM is worktree+tmux; OMA session is session state management |
| ralph | Exists | Ported ✓ |
| ralplan | Exists | Ported ✓ |
| release | Exists | Ported ✓ |
| remember | Missing | **Phase 1** → **DONE** ✓ |
| sciomc | Missing | **DO NOT PORT** — Level 4 parallel research, overkill for OMA scope |
| self-improve | Missing | **Phase 3** — tournament selection with worktree/tmux; high complexity |
| setup | Exists | Ported ✓ |
| skill | Exists | Ported ✓ |
| skillify | Missing | **Phase 0** — session-capture workflow; `/oma:skill sync` handles remote install |
| team | Exists | Ported ✓ |
| trace | Exists | Ported ✓ |
| ultraqa | Exists | Ported ✓ |
| ultrawork | Exists | Ported ✓ |
| verify | Missing | **Phase 1** → **DONE** ✓ |
| visual-verdict | Exists | Ported ✓ |
| writer-memory | Exists | Ported ✓ |

**Summary**: 36 OMC skills. 22 already ported to OMA. 4 need overlap merge. 5 are missing (Phase 1: deep-interview, debug, verify, remember, external-context — **ALL DONE** ✓). 2 defer (self-improve, deep-dive). 2 do not port (sciomc, project-session-manager).

---

## Phased Execution Plan

### Phase 0: skillify + /oma:skill audit (1-2 hours)
**Goal**: Resolve skill installation mechanism question.

1. Audit `/oma:skill sync` against OMC skillify:
   - Does `sync` fetch from GitHub URLs? (OMC skillify does)
   - Does `sync` support remote skill registration?
   - Document the capability gap (if any)
2. If gap exists: port skillify as `plugins/oma/skills/skillify/SKILL.md`
3. If no gap: add documentation note to `/oma:skill` that sync covers remote install

**Port definition for all phases**: Copy OMC SKILL.md, update frontmatter `name:` to `oma-<skill>`, adapt paths (e.g., `${CLAUDE_PLUGIN_ROOT}` vs OMC paths), keep body content unless OMC references OMC-specific tools/agents.

### Phase 1: New capabilities — highest value (1 day)
| Skill | Port action |
|-------|------------|
| deep-interview | Port to `plugins/oma/skills/deep-interview/SKILL.md` — OMA interview skill becomes alias |
| debug | Port to `plugins/oma/skills/debug/SKILL.md` |
| verify | Port to `plugins/oma/skills/verify/SKILL.md` |
| remember | Port to `plugins/oma/skills/remember/SKILL.md` |
| external-context | Port to `plugins/oma/skills/external-context/SKILL.md` |

### Phase 2: Overlap resolution (half day)
| Skill | Action |
|-------|--------|
| cancel | Add `--force`/`--all` cascade flags to OMA cancel command |
| omc-doctor → doctor | Add legacy-content detection check to OMA doctor |
| omc-setup → setup | Add `--resume` flag to OMA setup |
| ai-slop-cleaner → deslop | Add regression-lock + cleanup-plan steps to deslop command |

### Phase 3: Complex/low-fit (deferred)
| Skill | Status |
|-------|--------|
| self-improve | High value but worktree/tmux assumptions don't map cleanly. Defer until Phase 1-2 stable. |
| deep-dive | Depends on deep-interview. Port after Phase 1 deep-interview is stable. |

---

## Pre-Mortem (3 Failure Scenarios)

| Scenario | Likelihood | Impact | Mitigation |
|---------|-----------|--------|------------|
| **Phase 0 skillify** reveals `/oma:skill sync` already covers everything | Medium | Low — just a docs pass | Pre-audit sync capability before starting |
| **Phase 1 deep-interview** port conflicts with existing OMA interview skill | High | Medium — duplicate entries confuse users | Make OMA interview an alias pointing to deep-interview; document the merge |
| **Phase 3 self-improve** cannot be adapted to OMA's model | High | High — wasted porting effort | Add explicit disclaimer; require architect review before Phase 3 start |

---

## Expanded Test Plan

| Phase | Verification |
|-------|-------------|
| Phase 0 | `/oma:skill sync --help` shows remote install; skillify skill (if needed) loads with `/oma:skillify` |
| Phase 1 | Each new skill: loads with `/oma:<skill>`, trigger fires, core capability demonstrated |
| Phase 2 | Enhanced commands: `/oma:cancel --force` works, `/oma:doctor` includes legacy check, `/oma:setup --resume` works, `/oma:deslop` runs regression lock |
| Phase 3 | Self-improve: worktree isolation verified; deep-dive: trace + interview pipeline fires |

---

## ADR: Skill Installation Mechanism

**Decision**: `/oma:skill sync` handles remote skill installation. skillify is a session-capture workflow, not an installation mechanism.

**Drivers**: OMA's skill command already has `sync` subcommand. OMC skillify also installs from remote sources. Rather than port skillify as an install mechanism, verify sync already covers the use case and add documentation.

**Alternatives considered**:
- Port OMC skillify as install mechanism — rejected because `/oma:skill sync` may already do this
- Build new install-from-GitHub mechanism — rejected in favor of existing capability

**Consequences**: Phase 0 becomes an audit + docs pass rather than new implementation. If sync is insufficient, revisit.

**Follow-ups**: Audit `/oma:skill sync` capability in Phase 0. Document findings. If gap, implement skillify.

---

## Verification Evidence Plan
- Phase 0: `ls plugins/oma/skills/skillify/` (if created) OR updated `/oma:skill` docs
- Phase 1: `ls plugins/oma/skills/` shows 5 new directories; each skill loads
- Phase 2: Each enhanced command tested manually
- Phase 3: Deferred — no action now