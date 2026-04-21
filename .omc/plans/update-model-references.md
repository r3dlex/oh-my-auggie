# Plan: Update Model References in oh-my-auggie

**Created:** 2026-04-20
**Revised:** 2026-04-20 (Architect + Critic ITERATE feedback incorporated)
**Status:** DRAFT — awaiting confirmation
**Complexity:** MEDIUM (20 files, mechanical edits + source + tests + verification script)

---

## Context

The oh-my-auggie agent definitions use model identifiers in YAML frontmatter to route work to appropriate LLM tiers. The current model IDs reference `claude-opus-4-6`, which Augment docs now mark as **legacy** with upgrade to 4.7 recommended. Additionally, the `cost-track.ts` source file needs updating to recognize new model tiers.

**Critical bug identified by Architect:** The `normalizeModel()` fallback at line 89 returns `'haiku45'` for unknown models. If agent files are updated to `claude-opus-4-7` without adding the mapping, every Opus call would be silently counted at 88 credits instead of 488 credits (82% undercount).

### Current Model Distribution (20 active files)

| Current ID | Tier | Agent Count | Files |
|---|---|---|---|
| `claude-opus-4-6` | Premium | 6 | architect, planner, analyst, critic, code-reviewer, simplifier |
| `sonnet4.6` | Standard | 11 | executor, verifier, qa, debugger, designer, doc-specialist, test-engineer, security, scientist, tracer, git-master |
| `haiku4.5` | Fast | 3 | explorer, writer, oma-ask command |

### Complete File List (20 files to edit)

**Agent frontmatter (6 files):**
1. `plugins/oma/agents/oma-architect.md` (line 4)
2. `plugins/oma/agents/oma-planner.md` (line 4)
3. `plugins/oma/agents/oma-analyst.md` (line 4)
4. `plugins/oma/agents/oma-critic.md` (line 4)
5. `plugins/oma/agents/oma-code-reviewer.md` (line 4)
6. `plugins/oma/agents/oma-simplifier.md` (line 4)

**Documentation files (6 files):**
7. `plugins/oma/agents/AGENTS.md` (line 36)
8. `plugins/oma/rules/orchestration.md` (lines 21, 35, 50, 51, 53 -- 5 occurrences)
9. `plugins/oma/rules/enterprise.md` (lines 31, 33 -- 2 occurrences)
10. `plugins/oma/commands/oma-autopilot.md` (lines 36, 47 -- 2 occurrences)
11. `plugins/oma/commands/oma-help.md` (lines 77, 79 -- 2 occurrences)

**Source and test files (3 files):**
12. `plugins/oma/src/hooks/cost-track.ts` (lines 13, 66, 75, 81 -- add new entries)
13. `plugins/oma/tests/unit/hooks/cost-track.test.ts` (lines 58, 108, 123, 518 -- add new assertions)

**Example code (1 file):**
14. `plugins/oma/examples/delegation-enforcer-demo.ts` (lines 71, 72, 329, 380, 390 -- 5 occurrences)

**Verification script (1 file):**
15. `verify-tool-names.sh` (line 59)

**Explicitly excluded (historical records -- DO NOT EDIT):**
- `.omc/plans/*.md` (including this plan itself, `oma-plugin-v1-implementation.md`)
- `.omc/specs/*.md`
- `.omc/plans/open-questions.md`

### Key Findings from Codebase Investigation

1. **Model ID format is flexible.** The `normalizeModel()` function in `cost-track.ts` strips all non-alphanumeric characters and looks up a tier map. Both `claude-opus-4-6` and `sonnet4.6` normalize correctly.

2. **No Opus 4.7 mapping exists.** The `MODEL_TIER_MAP` and `CREDIT_COST` only know about `opus46`, `sonnet46`, `haiku45`, plus GPT and Gemini variants. Without adding `opus47`, the fallback silently returns `haiku45` -- **82% credit undercount**.

3. **Sonnet 4.6 and Haiku 4.5 are current.** No change needed for these tiers.

4. **The `ultrawork.ts` skill hardcodes `--model sonnet4.6`.** Noted for future; not in scope.

---

## RALPLAN-DR Summary

### Principles
1. **Stay current** -- Use the recommended (non-legacy) model at each tier.
2. **Minimize blast radius** -- Change only what is necessary; do not restructure agent tiers.
3. **Cost tracking accuracy** -- Never allow silent credit undercounting; treat cost-track as critical path.
4. **Format consistency** -- Normalize model ID format across all files for maintainability.
5. **Backward safety** -- Keep old `opus46` entries for backward compatibility.

### Decision Drivers (Top 3)
1. **Opus 4.6 is legacy** -- Docs explicitly recommend upgrading to 4.7. Same price, better capability.
2. **Silent cost-tracking bug** -- Without `opus47` in tier map, Opus 4.7 calls would be counted at haiku45 rate (88 vs 488 credits). 82% undercount.
3. **Comprehensive scope** -- All 20 files referencing `claude-opus-4-6` must be updated, not just agent frontmatter.

### Viable Options

#### Option A: Upgrade Opus only, full scope (RECOMMENDED)
- Change `claude-opus-4-6` to `claude-opus-4-7` in all 20 files (agents, docs, examples, verification)
- Add `opus47` entries to `cost-track.ts` CREDIT_COST and MODEL_TIER_MAP
- Add tests for `claude-opus-4-7` normalization
- Keep `sonnet4.6` and `haiku4.5` as-is (they are current)
- **Pros:** Addresses legacy warning, fixes potential cost bug, complete scope, same cost
- **Cons:** Does not explore cost savings from non-Claude models

#### Option B: Upgrade Opus + introduce non-Claude models for cost optimization
- Same as Option A, plus replace some sonnet-tier agents with cheaper alternatives
- **Invalidation rationale:** Marginal cost savings (25-74 credits per call) vs. extensive cross-vendor testing required for 11 agents. Out of scope.

### ADR

- **Decision:** Option A -- Upgrade Opus tier to 4.7 across all 20 files, fix cost tracking, update tests.
- **Drivers:** Legacy status of Opus 4.6, silent cost-tracking bug risk, comprehensive file coverage.
- **Alternatives considered:** Non-Claude model introduction (Option B -- invalidated: insufficient ROI vs. testing cost).
- **Why chosen:** Smallest complete change that addresses all concerns. Zero cost impact. Eliminates 82% undercount risk.
- **Consequences:** 20 files edited. Source + tests require rebuild of `dist/`. Historical docs in `.omc/` left untouched.
- **Follow-ups:** Consider non-Claude model evaluation as separate initiative. Monitor Opus 4.7 50%-off promotion ending April 30.

---

## Work Objectives

1. Validate that `claude-opus-4-7` is a recognized Augment CLI model slug before any edits
2. Update `cost-track.ts` to recognize Opus 4.7 (fix silent cost bug)
3. Update `cost-track.test.ts` with Opus 4.7 assertions
4. Update all 6 Opus-tier agent files from `claude-opus-4-6` to `claude-opus-4-7`
5. Update all documentation, examples, and verification scripts (7 files)
6. Rebuild `dist/` and run tests

---

## Guardrails

### Must Have
- Pre-execution validation that `claude-opus-4-7` is a valid model slug
- All 6 Opus-tier agents updated to `claude-opus-4-7`
- `cost-track.ts` CREDIT_COST includes `'opus47': 488`
- `cost-track.ts` MODEL_TIER_MAP includes `'claudeopus47': 'opus47'` and `'opus47': 'opus47'`
- `cost-track.test.ts` includes assertion for `estimateCredits('claude-opus-4-7', ...)` returning 488
- All documentation files updated (AGENTS.md, orchestration.md, enterprise.md, autopilot.md, help.md)
- `delegation-enforcer-demo.ts` updated (5 occurrences)
- `verify-tool-names.sh` updated
- `dist/` rebuilt successfully
- Backward compatibility: `claude-opus-4-6` still resolves correctly in cost tracking

### Must NOT Have
- Changes to Sonnet-tier or Haiku-tier agent model IDs
- Introduction of non-Claude models
- Changes to agent prompt content, tools, or colors
- Changes to any file outside the oh-my-auggie repository
- Changes to `.omc/plans/` or `.omc/specs/` historical records

---

## Task Flow

### Step 0: Pre-execution gate -- Validate model slug

**Action:** Verify `claude-opus-4-7` is a valid Augment CLI model identifier before making any edits.

**Commands:**
```bash
auggie models list 2>/dev/null || echo "auggie CLI not available"
# Alternatively: check Augment docs or test with a single agent spawn
```

**Acceptance criteria:**
- `claude-opus-4-7` confirmed as valid slug (appears in model list or docs)
- If slug is invalid, STOP all edits until correct slug is determined
- Document the validated slug in execution log

**Blocking:** All subsequent steps depend on this gate passing.

### Step 1: Update cost-track.ts (fix silent cost bug)

**File:** `plugins/oma/src/hooks/cost-track.ts`

**Changes:**
1. Add `'opus47': 488` to `CREDIT_COST` table (after line 13). Keep existing `'opus46': 488` with deprecation comment: `// legacy -- keep for backward compat`
2. Add `'claudeopus47': 'opus47'` to `MODEL_TIER_MAP` (after line 66). Keep existing `'claudeopus46': 'opus46'` with deprecation comment.
3. Add `'opus47': 'opus47'` to `MODEL_TIER_MAP` (after line 81). Keep existing `'opus46': 'opus46'` with deprecation comment.
4. Update short alias: `'opus': 'opus46'` -> `'opus': 'opus47'` (line 75). This is the short alias used throughout the orchestration layer and must point to the current model.

**Disposition of existing opus46 entries:** ALL existing `opus46` entries in `MODEL_TIER_MAP` and `CREDIT_COST` are KEPT for backward compatibility (with `// legacy -- keep for backward compat` comments). The new `opus47` entries are ADDED alongside them. Only the `'opus'` short alias is UPDATED from `'opus46'` to `'opus47'`.

**Acceptance criteria:**
- `normalizeModel('claude-opus-4-7')` returns `'opus47'`
- `normalizeModel('opus')` returns `'opus47'`
- `normalizeModel('claude-opus-4-6')` still returns `'opus46'` (backward compat preserved)
- `estimateCredits('claude-opus-4-7', 'Write')` returns 488

**Why first:** This must land before agent files change, so cost tracking is never in a broken state.

### Step 2: Update cost-track.test.ts

**File:** `plugins/oma/tests/unit/hooks/cost-track.test.ts`

**Changes (per-line specifics):**

1. **Line 58** -- `expect(CREDIT_COST).toHaveProperty('opus46')`: Keep as-is (opus46 entries are preserved for backward compat). Add new assertion: `expect(CREDIT_COST).toHaveProperty('opus47')` alongside it.

2. **Line 108** -- `estimateCredits('claude-opus-4-6', ...)` test: Keep the existing test as-is (old model still resolves via preserved opus46 mapping). Add NEW test after it: `expect(estimateCredits('claude-opus-4-7', 'Write')).toBe(488)`.

3. **Line 110** -- `estimateCredits('opus', ...)` test: Keep this test as-is. After the `'opus'` alias is updated to point to `'opus47'`, this test will now exercise the opus47 cost path. The assertion value remains 488 (same price), so no value change needed.

4. **Line 123** -- `estimateCredits('opus4.6', ...)` test: Keep as-is (opus46 mapping preserved). Add NEW test: `expect(estimateCredits('opus4.7', 'Write')).toBe(488)` (since `opus4.7` normalizes to `opus47` after dot stripping).

5. **Line 518** -- `process.env.ANTHROPIC_MODEL = 'claude-opus-4-6'` env var test: Update to `'claude-opus-4-7'` so the env-based model detection exercises the new model path.

**Acceptance criteria:**
- All new assertions pass
- Existing opus46 assertions still pass (backward compat)
- `npm test` passes with zero failures

### Step 3: Update Opus-tier agent frontmatter (6 files)

**Files:**
- `plugins/oma/agents/oma-architect.md`
- `plugins/oma/agents/oma-planner.md`
- `plugins/oma/agents/oma-analyst.md`
- `plugins/oma/agents/oma-critic.md`
- `plugins/oma/agents/oma-code-reviewer.md`
- `plugins/oma/agents/oma-simplifier.md`

**Change:** Line 4 in each file: `model: claude-opus-4-6` -> `model: claude-opus-4-7`

**Acceptance criteria:**
- `grep -rn "claude-opus-4-6" plugins/oma/agents/*.md` returns zero results
- `grep -rn "claude-opus-4-7" plugins/oma/agents/*.md` returns exactly 6 results
- No other lines in these files are modified

### Step 4: Update documentation, examples, and verification (7 files)

**Documentation files (5):**

| File | Lines | Occurrences |
|---|---|---|
| `plugins/oma/agents/AGENTS.md` | 36 | 1 |
| `plugins/oma/rules/orchestration.md` | 21, 35, 50, 51, 53 | 5 |
| `plugins/oma/rules/enterprise.md` | 31, 33 | 2 |
| `plugins/oma/commands/oma-autopilot.md` | 36, 47 | 2 |
| `plugins/oma/commands/oma-help.md` | 77, 79 | 2 |

**Example code (1):**

| File | Lines | Occurrences |
|---|---|---|
| `plugins/oma/examples/delegation-enforcer-demo.ts` | 71, 72, 329, 380, 390 | 5 |

**Verification script (1):**

| File | Lines | Occurrences |
|---|---|---|
| `verify-tool-names.sh` | 59 | 1 |

**Change:** Replace all `claude-opus-4-6` with `claude-opus-4-7` in each file.

**Acceptance criteria:**
- `grep -rn "claude-opus-4-6" plugins/oma/rules/ plugins/oma/commands/ plugins/oma/examples/ plugins/oma/agents/AGENTS.md verify-tool-names.sh` returns zero results
- All replacements are `claude-opus-4-7` (no typos, no partial replacements)
- No changes to surrounding content

### Step 5: Rebuild dist/ and run full verification

**Commands:**
```bash
cd /Users/andreburgstahler/Ws/Personal/AiTool/oh-my-auggie

# 1. Check available build/test scripts
cat plugins/oma/package.json | grep -A 10 '"scripts"'

# 2. Build and test
cd plugins/oma
npm run build
npm test

# 3. Verify no stale claude-opus-4-6 references remain in active files
#    (excludes .omc/ plan files and legacy comments)
grep -r "claude-opus-4-6" . --include="*.ts" --include="*.md" --include="*.sh" --exclude-dir=".omc" --exclude-dir="node_modules" --exclude-dir="dist" | grep -v "# legacy"
# Expected: 0 results

# 4. Confirm new opus47 entries are present in cost-track
grep -n "opus47\|opus4-7" plugins/oma/src/hooks/cost-track.ts
# Expected: entries for opus47 in both CREDIT_COST and MODEL_TIER_MAP

# 5. Confirm dist/ was rebuilt with new entries
grep -n "opus47" plugins/oma/dist/hooks/cost-track.js
# Expected: opus47 entries present in compiled output
```

**Acceptance criteria:**
- TypeScript build completes with zero errors
- `dist/hooks/cost-track.js` contains the new `opus47` entries
- All tests pass, including new Opus 4.7 assertions
- Stale reference grep (command 3) returns zero results
- New entry grep (command 4) confirms `opus47` in both `CREDIT_COST` and `MODEL_TIER_MAP`
- Compiled output grep (command 5) confirms `dist/` is consistent with source

---

## Success Criteria

1. Step 0 gate passed: `claude-opus-4-7` confirmed as valid model slug
2. Zero references to `claude-opus-4-6` remain in active files (agents, rules, commands, examples, src, tests, verify script)
3. All 6 Opus-tier agents reference `claude-opus-4-7`
4. Cost tracking correctly estimates 488 credits for Opus 4.7 calls (silent bug eliminated)
5. Backward compatibility: old `claude-opus-4-6` strings still resolve to `opus46` in cost tracking
6. `dist/` rebuilt and consistent with source
7. All tests pass
8. All 11 Sonnet-tier and 3 Haiku-tier files are untouched
9. Historical docs in `.omc/plans/` and `.omc/specs/` are untouched

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `claude-opus-4-7` is not a valid Augment CLI slug | LOW | **CRITICAL** -- all agents fail to spawn | **Step 0 gate**: verify before any edits. Block if invalid. |
| Cost-track silent undercount (82% if mapping missing) | **RESOLVED** | **CRITICAL** -- budget tracking useless | **Step 1 executes before Step 3**: cost tracking updated before agent files change |
| `normalizeModel` fallback masks a bad ID | LOW | MEDIUM -- cost defaults to haiku45 | Explicit test of normalization function in Step 2 |
| Build breaks due to unrelated TS issues | LOW | LOW -- unrelated to this change | Check build status before starting; note pre-existing failures |
| Historical docs accidentally edited | LOW | MEDIUM -- audit trail corrupted | Explicit exclusion list in guardrails; grep verification excludes `.omc/` |
