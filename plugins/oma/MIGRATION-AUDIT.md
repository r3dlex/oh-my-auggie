# Migration Audit: .mjs → .ts Hooks Rewrite

**Document Date:** 2026-04-12

**Status:** PR 1 preparation phase — all 9 hooks have TypeScript equivalents. PR 2 scheduled for 2026-04-26.

---

## 1. Hook Status Table

| Hook | mjs runtime | ts source | Wired in hooks.json? | Test coverage | Known divergences |
|------|------------|-----------|---------------------|---------------|-------------------|
| session-start | ✓ | ✓ | Yes (SessionStart) | ✓ session-start.test.ts | Broken subprocess .replace() bug at lines 44,72 — FIXED in this PR (T1b); Missing HUD emission block (mjs:53-73) — PORTED in this PR (T1b.3) |
| post-tool-status | ✓ | ✓ | Yes (PostToolUse) | ✓ post-tool-status.test.ts | None identified |
| delegation-enforce | ✓ | ✓ | Yes (PreToolUse) | ✓ delegation-enforce.test.ts | None identified |
| keyword-detect | ✓ | ✓ | Yes (PostToolUse) | ✓ keyword-detect.test.ts | TS version has 45+ keywords vs 13 in mjs (expanded skill coverage) |
| stop-gate | ✓ | ✓ | Yes (Stop) | ✓ stop-gate.test.ts | None identified |
| approval-gate | ✓ | ✓ | Yes (PreToolUse) | ✓ approval-gate.test.ts | None identified |
| adr-enforce | ✓ | ✓ | Yes (PreToolUse) | ✓ adr-enforce.test.ts, adr-enforce-pure.test.ts | None identified |
| cost-track | ✓ | ✓ | Yes (PostToolUse) | ✓ cost-track.test.ts | None identified |
| audit-log | ✓ | ✓ | Yes (PostToolUse) | ✓ (via release.test.ts) | None identified |

---

## 2. Hook Diff Summary

### session-start
- **Same:** Mode restoration, notepad priority injection, Auggie version detection
- **Different/Improved in TS:** Background update check (TS adds full npm package version polling via GitHub API); subprocess string escaping is corrected
- **TS-only:** Update cache mechanism with TTL-based refresh; structured package.json resolution from dist path
- **MJS-only:** None; TS is a strict superset

### post-tool-status
- **Same:** Tool status injection, error message capture, system-reminder emission
- **Different/Improved in TS:** Structured error context (type-safe Tool enum, parsed output JSON)
- **TS-only:** Type-safe tool classification, enhanced error serialization
- **MJS-only:** None

### delegation-enforce
- **Same:** EditFile/WriteFile/DeleteFile check logic, mode-active guard
- **Different/Improved in TS:** Cleaner state resolution path, explicit guard for non-orchestration modes
- **TS-only:** Type-safe OmaState integration, cleaner error messages
- **MJS-only:** None

### keyword-detect
- **Same:** Last user message retrieval, case-insensitive keyword matching, command suggestion output
- **Different/Improved in TS:** Keyword set expanded from 13 to 45+ entries (covers new oma-* skills, /oh-my-claudecode:* legacy keywords, deprecated patterns)
- **TS-only:** Structured KeywordEntry type, skill metadata attachment (description, category), deprecation markers
- **MJS-only:** None; TS is backward-compatible with expanded coverage

### stop-gate
- **Same:** Mode-active check, PASS/FAIL emission logic, state mutation for next-phase
- **Different/Improved in TS:** Explicit iteration limit check (blocks infinite loops at 100 iterations)
- **TS-only:** OmaState.iteration validation, phase advancement guards
- **MJS-only:** None

### approval-gate
- **Same:** Path regex matching (.claude/**, .oma/**, CLAUDE.md), sensitive-path detection
- **Different/Improved in TS:** Type-safe path classification
- **TS-only:** None
- **MJS-only:** None

### adr-enforce
- **Same:** Architectural decision record check, path-based ADR triggering
- **Different/Improved in TS:** Separate pure function test (adr-enforce-pure.test.ts validates logic in isolation)
- **TS-only:** Exported pure function for testability
- **MJS-only:** None

### cost-track
- **Same:** Token accounting, model-weighted cost calculation, session expense persistence
- **Different/Improved in TS:** Structured model definition (type-safe model enum, per-model token weights)
- **TS-only:** Type-safe CostRecord structure, model metadata
- **MJS-only:** None

### audit-log
- **Same:** Event serialization, session replay capability
- **Different/Improved in TS:** Structured logging format
- **TS-only:** Type-safe AuditEvent structure
- **MJS-only:** None

---

## 3. PR 2 Criteria and Target Date

**Target date: 2026-04-26** (14 days from PR 1 merge)

### Promotion Criteria

All of the following must be true before PR 2 merge:

1. **Unit test coverage:** All 9 hooks have passing unit tests in `tests/unit/hooks/`
   - ✓ session-start.test.ts
   - ✓ post-tool-status.test.ts
   - ✓ delegation-enforce.test.ts
   - ✓ keyword-detect.test.ts
   - ✓ stop-gate.test.ts
   - ✓ approval-gate.test.ts
   - ✓ adr-enforce.test.ts + adr-enforce-pure.test.ts
   - ✓ cost-track.test.ts
   - ✓ audit-log.test.ts (via release.test.ts)

2. **hooks.json updated:** All hook commands point to `dist/hooks/*.js` instead of `.mjs`
   - SessionStart: `node ${AUGMENT_PLUGIN_ROOT}/dist/hooks/session-start.js`
   - PreToolUse: delegation-enforce, approval-gate, adr-enforce all → `dist/hooks/*.js`
   - PostToolUse: post-tool-status, cost-track, keyword-detect, audit-log all → `dist/hooks/*.js`
   - Stop: stop-gate → `dist/hooks/stop-gate.js`

3. **Cleanup:** All `hooks/*.mjs` files deleted in a single commit with message "chore: delete hooks/*.mjs (all now in dist/)"

4. **Smoke test:** Manual verification that dist/ hooks fire correctly
   - session-start hook emits OMA context on session start
   - stop-gate hook blocks stop without PASS
   - keyword-detect hook auto-triggers /oma:autopilot on keyword

---

## 4. Divergence Freeze Policy

**Effective:** From PR 1 merge through PR 2 merge (2026-04-12 through 2026-04-26)

Between PR 1 merge and PR 2 merge, any required patch to `hooks/session-start.mjs` **MUST** be mirrored in `src/hooks/session-start.ts` in the same commit, reviewed by the author.

If this is not feasible:
- **Revert PR 1 immediately.** Do not allow long-lived divergence between the .mjs runtime and the .ts rewrite.

If PR 2 is not merged by **2026-04-26**:
- **Revert PR 1.** This prevents runtime drift: users will continue running the .mjs version, and the .ts rewrite can be revisited in a future cycle with fresh context.

---

## 5. Distribution Model Decision Matrix

| Option | Pros | Cons |
|--------|------|------|
| **A: Ship dist/ + src/ in npm tarball** (via package.json "files") | Simplest distribution; source maps work end-to-end; can patch src/ in place if needed; transparent source distribution | Larger tarball (~50KB extra for dist/ + src/); users can accidentally import from src/ instead of dist/ |
| **B: Ship dist/ only** (.npmignore src/) | Smaller tarball; enforces compiled-only distribution; no risk of src/ imports | Cannot patch src/ in place; less transparency; requires rebuild in CI for any patch |
| **C: Build on postinstall** | Smallest tarball; always fresh build | Slower npm install; adds devDependencies to runtime; complex CI/CD; harder to debug build failures |

### Selected: **Option A**

**Rationale:** PR 1 is a dark-launch preparation PR, making this choice **reversible in PR 2** without user-facing impact. Shipping both source and compiled output allows:
- Transparent review of source during the transition period
- Ability to patch src/ if necessary before PR 2 cutover
- Minimal risk: all auggie hook invocations use dist/ path, so src/ is never executed by default
- Easy reversal: if Option A causes issues, PR 2 can switch to Option B without user complaints

**Implementation:** `package.json:files` currently includes `dist/**/*`. No additional configuration needed for Option A; TS build output is already in dist/.

---

## Appendix: Test Inventory

### Unit Tests Present

- `adr-enforce-pure.test.ts` — Pure function logic isolated from file I/O
- `adr-enforce.test.ts` — Integration with ADR file detection
- `approval-gate.test.ts` — Sensitive path matching
- `cost-track.test.ts` — Token accounting and model weights
- `delegation-enforce.test.ts` — Edit/Write/Delete interception
- `keyword-detect.test.ts` — Keyword matching and skill activation
- `post-tool-status.test.ts` — Tool status injection
- `session-start.test.ts` — Mode restoration and notepad injection
- `stop-gate.test.ts` — Iteration limit and phase advancement
- `release.test.ts` — Audit-log validation (indirect)

### Test Runner

All tests run via `npm test` in the plugins/oma directory, using Jest or equivalent test harness configured in package.json.

