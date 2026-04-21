# Graph Provider Deviations Fix Plan (v2)

**Date:** 2026-04-12
**Iteration:** 2 (Architect+Critic feedback applied)
**Branch:** feat/graph-provider-config
**Scope:** 8 tasks across 8 files (2 create, 5 modify, 1 throwaway verification)
**Estimated complexity:** MEDIUM
**Note:** `IMPLEMENTATION-PLAN-graph-provider.md` in repo root is a stale artifact from a prior session. This file is the canonical plan.

---

## Build Requirements

After each change to `src/hooks/*.ts`, run `npm run build` (from `plugins/oma/`) to emit `dist/hooks/*.js`. Hooks in `hooks.json` reference `dist/`, not `src/`. All acceptance criteria verification must use the built output.

---

## RALPLAN-DR Summary

### Principles
1. **Verify before build** -- T0 spike proves PreToolUse additionalContext injection works before investing in T1.
2. **Hook protocol correctness** -- stdout must be valid JSON parseable by Auggie; any extra output breaks the contract.
3. **Incremental value** -- D1 (PreToolUse bridge) delivers the most user-facing value; prioritize it after verification.
4. **Minimal blast radius** -- each fix is independently testable and deployable; no cross-deviation dependencies except D5/D6 (same file).
5. **No shell injection** -- all child process calls use `spawnSync` with argument arrays, never string interpolation.

### Decision Drivers
1. **Auggie hook stdout contract** -- hooks communicate via JSON on stdout; violations silently break features (D6, D7).
2. **PreToolUse additionalContext uncertainty** -- no existing PreToolUse hook uses `additionalContext`; T0 must verify this works.
3. **graphwiki context injection** -- the entire graph-provider integration is inert without a working context bridge (D1).

### Options

**Option A: Fix all deviations in one PR, gated by T0 spike (RECOMMENDED)**
- Pros: Single PR, coherent story, all graph-provider functionality works end-to-end after merge. T0 resolves protocol uncertainty early.
- Cons: If T0 fails, T1 pivots to Plan B (PostToolUse nudge), which is reactive rather than proactive.

**Option B: Split into two PRs -- safe fixes (D2-D6) first, then D1+D7**
- Pros: Lower risk per PR; D7 uncertainty doesn't block other fixes.
- Cons: Two review cycles; graph-provider still inert without D1 until second PR merges.
- Invalidation rationale: The branch already contains the graph-provider config commit. Splitting creates an awkward intermediate state where config exists but the bridge hook doesn't. Option A with T0 verification gate is preferable.

---

## Task Flow (Execution Order)

```
T0 (PreToolUse additionalContext verification spike)
  |
  |--- GATE: T0 pass? ---
  |  YES: T1 = PreToolUse bridge (Plan A)
  |  NO:  T1 = PostToolUse nudge (Plan B)
  |
T5,T6 (keyword-detect fixes, independent -- can run parallel with T0)
  |
T2,T3 (SKILL.md surgical edits + path fix, independent)
  |
T4 (session-start enrichment, depends on T2 for message content alignment)
  |
T1 (graph-provider bridge -- gated by T0 result)
  |
T7 (post-tool-status JSON wrapper -- GATED on protocol verification)
```

Parallel batches:
- Batch 0: T0 + T5 + T6 (verification spike runs alongside keyword-detect fixes)
- Batch 1: T2 + T3 (SKILL.md surgical edits)
- Batch 2: T4 (session-start)
- Batch 3: T1 (bridge hook -- Plan A or Plan B based on T0)
- Batch 4: T7 (gated)

---

## Detailed Tasks

### T0: PreToolUse additionalContext verification spike [BLOCKING]
**Files:**
- CREATE `src/hooks/_test-pretool-context.ts` (throwaway, ~10 lines)
- MODIFY `hooks/hooks.json` (temporary entry in PreToolUse array)

**Implementation:**
1. Create `src/hooks/_test-pretool-context.ts`:
   ```typescript
   console.log(JSON.stringify({
     hookSpecificOutput: {
       hookEventName: 'PreToolUse',
       additionalContext: '[TEST] PreToolUse additionalContext works'
     }
   }));
   process.exit(0);
   ```
2. Add as FIRST entry in hooks.json PreToolUse array:
   ```json
   {
     "type": "command",
     "command": "node ${AUGMENT_PLUGIN_ROOT}/dist/hooks/_test-pretool-context.js",
     "timeout": 3000
   }
   ```
3. Run `npm run build` from `plugins/oma/`.
4. Trigger any Read tool call in Auggie.
5. Check: does "[TEST] PreToolUse additionalContext works" appear as injected context?

**Gate decision:**
- **YES** -- proceed to T1 Plan A (PreToolUse bridge).
- **NO** -- T1 pivots to Plan B (PostToolUse nudge hook). Document the failure evidence.

**Cleanup:** Remove `_test-pretool-context.ts`, its built output, and the temporary hooks.json entry after verification.

**Acceptance criteria:**
- [ ] Test hook emits valid hookSpecificOutput JSON and exits 0
- [ ] Gate result documented with evidence (screenshot or log snippet)
- [ ] Test hook and hooks.json entry removed after verification

---

### T1: Create graph-provider context bridge [HIGH VALUE, GATED BY T0]

#### Plan A: PreToolUse bridge (if T0 passes)

**Files:**
- CREATE `src/hooks/graph-provider-bridge.ts` (~80 lines)
- MODIFY `hooks/hooks.json` (add entry to PreToolUse array)
- CREATE `tests/unit/hooks/graph-provider-bridge.test.ts` (~60 lines)

**Implementation:**
1. Read config via `getMergedConfig()`. If `graph.provider !== 'graphwiki'`, exit 0.
2. Check `graphwiki-out/GRAPH_REPORT.md` exists. If not, exit 0.
3. Parse stdin as `HookInput`. Extract `tool_name` and `tool_input`.
4. Only act on tools: `Read`, `Glob`, `Grep`, `view`, `codebase-retrieval`.
5. Extract file path from `tool_input.file_path` or `tool_input.path` or `tool_input.pattern`.
6. Derive node name from path (basename without extension).
7. Spawn graphwiki using `spawnSync` (no shell):
   ```typescript
   import { spawnSync } from 'child_process';
   const result = spawnSync('graphwiki', ['path', nodeName, '--json'], {
     cwd: projectDir,
     encoding: 'utf8',
     timeout: 3000,
   });
   const output = result.stdout?.trim() ?? '';
   ```
8. Output via stdout: `{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"..."}}`
9. On any error or timeout, exit 0 silently (non-blocking).

**hooks.json change:** Add to PreToolUse array:
```json
{
  "type": "command",
  "command": "node ${AUGMENT_PLUGIN_ROOT}/dist/hooks/graph-provider-bridge.js",
  "timeout": 5000
}
```

#### Plan B: PostToolUse nudge hook (if T0 fails)

**Files:**
- CREATE `src/hooks/graph-provider-posttool.ts` (~60 lines)
- MODIFY `hooks/hooks.json` (add entry to PostToolUse array)
- CREATE `tests/unit/hooks/graph-provider-posttool.test.ts` (~50 lines)

**Implementation:**
1. Same config and report checks as Plan A (exit 0 if inactive).
2. Parse stdin as PostToolUse `HookInput`. Extract `tool_name` and `tool_input`.
3. Only act on tools: `Read`, `Grep`, `Glob`.
4. Extract file path. Check if it matches a node in the graph (via `spawnSync('graphwiki', ['path', nodeName, '--json'], ...)`).
5. If match found, output:
   ```json
   {"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"You just read a file tracked by graphwiki. Next time use `graphwiki path <node>` or `graphwiki query \"<question>\"` for richer context."}}
   ```
6. On any error, exit 0.

**Acceptance criteria (both plans):**
- [ ] Hook exits 0 when `graph.provider` is not `graphwiki`
- [ ] Hook exits 0 when `GRAPH_REPORT.md` missing
- [ ] Hook exits 0 for non-matching tools (e.g., `Edit`, `Bash`)
- [ ] Hook outputs valid `hookSpecificOutput` JSON for matching tools when graphwiki data exists
- [ ] Hook exits 0 (no crash) on graphwiki command timeout
- [ ] hooks.json includes the new entry
- [ ] Child process uses `spawnSync` with argument array (no shell interpolation)
- [ ] Unit test covers: config skip, missing report skip, tool filter, success path, timeout path
- [ ] `npm run build` produces `dist/hooks/graph-provider-bridge.js` (or `graph-provider-posttool.js`)

---

### T2: Surgical edits to `skills/graph-context/SKILL.md` [MEDIUM]
**File:** MODIFY `skills/graph-context/SKILL.md`

**Scope:** Add missing commands and constraints. Do NOT rewrite sections that are already correct.

**Add for graphwiki section:**
- `graphwiki query "<question>"` -- natural language query
- `graphwiki lint` -- validate graph integrity
- `graphwiki status` -- show build status and stats
- `graphwiki build --update` / `graphwiki build --resume` -- incremental builds
- `graphwiki ingest <path>` -- ingest external docs
- `graphwiki benchmark` -- measure graph performance
- Hard constraint: `NEVER modify files in raw/`
- Hard constraint: `Max 3 wiki pages per query to stay within token budget`

**Add for graphify section:**
- `/graphify --update` -- update existing graph
- `/graphify --wiki` -- generate wiki output
- `/graphify add <url>` -- add external source
- `/graphify explain <node>` -- explain a node
- `/graphify --watch` -- watch mode
- `/graphify --mcp` -- MCP server mode
- Hard constraint: `NEVER edit files in graphify-out/`

**Acceptance criteria:**
- [ ] All listed commands present for both providers
- [ ] Hard constraints clearly marked (bold or blockquote)
- [ ] Token budget section retained
- [ ] Existing correct sections left untouched

---

### T3: Fix wiki/index.md path ambiguity in SKILL.md [LOW]
**File:** MODIFY `skills/graph-context/SKILL.md` (same file as T2, combine edits)

**Change:** Line 17 currently says `Read wiki/index.md`. Change to `Read graphwiki-out/wiki/index.md` with a note: "Falls back to wiki/index.md if graphwiki-out/ layout differs."

**Acceptance criteria:**
- [ ] Primary path is `graphwiki-out/wiki/index.md`
- [ ] Fallback path `wiki/index.md` documented

---

### T4: Enrich session-start.ts graph messages [MEDIUM]
**File:** MODIFY `src/hooks/session-start.ts` (lines 85-114)

**Change the graphwiki active message (line 96) from:**
```
[OMA Graph] graphwiki active. Read graphwiki-out/GRAPH_REPORT.md for context. Use graphwiki query/path commands. Avoid reading raw source files.
```
**To a multi-line protocol:**
```
[OMA Graph] graphwiki active.
1. Read graphwiki-out/GRAPH_REPORT.md for project overview
2. Read graphwiki-out/wiki/index.md for page directory
3. Use `graphwiki query "<question>"` for targeted lookups
4. Use `graphwiki path <nodeA> <nodeB>` for structural queries
5. Max 3 wiki pages per query. Avoid reading raw source files.
```

**Similarly enrich the graphify active message (line 105).**

**Acceptance criteria:**
- [ ] graphwiki message includes step-by-step protocol (5 steps)
- [ ] graphify message includes step-by-step protocol
- [ ] Both reference correct output directory paths
- [ ] "not found" messages unchanged
- [ ] Existing session-start tests still pass (update if needed)
- [ ] `npm run build` produces updated `dist/hooks/session-start.js`

---

### T5: Fix keyword-detect.ts KEYWORDS commands + SKILL_NAME_MAP [LOW]
**File:** MODIFY `src/hooks/keyword-detect.ts`

**Fix 1 — KEYWORDS array (lines 64-65):**
```typescript
// Before:
{ keyword: 'graph-provider',     command: '/oma:graph-provider' },
{ keyword: 'graph provider',     command: '/oma:graph-provider' },
// After:
{ keyword: 'graph-provider',     command: '/oma:graph-context' },
{ keyword: 'graph provider',     command: '/oma:graph-context' },
```

**Fix 2 — SKILL_NAME_MAP (lines 114-115):**
```typescript
// Before:
'graph-provider':      'graph-provider',
'graph provider':      'graph-provider',
// After:
'graph-provider':      'graph-context',
'graph provider':      'graph-context',
```

Both must be fixed together — KEYWORDS drives the command invoked; SKILL_NAME_MAP drives SKILL.md injection. Both currently point to a non-existent `graph-provider` skill.

**Acceptance criteria:**
- [ ] Both KEYWORDS entries use command `'/oma:graph-context'`
- [ ] Both SKILL_NAME_MAP entries point to `'graph-context'`
- [ ] A unit test in `tests/unit/hooks/keyword-detect.test.ts` asserts `SKILL_NAME_MAP['graph-provider'] === 'graph-context'`
- [ ] A unit test asserts `SKILL_NAME_MAP['graph provider'] === 'graph-context'`
- [ ] `cd plugins/oma && npm run build` produces updated output

---

### T6: Fix keyword-detect.ts double console.log [LOW]
**File:** MODIFY `src/hooks/keyword-detect.ts` (line 257)

**Remove:**
```typescript
console.log(`Keyword detected: '${entry.keyword}'. Activating ${entry.command}.`);
```

The `additionalContext` field in the `hookSpecificOutput` JSON (line 242) already contains this same text. The second `console.log` appends plain text after valid JSON, making stdout unparseable.

**Acceptance criteria:**
- [ ] Only one `console.log` call in the keyword detection success path (the JSON one on line 255)
- [ ] keyword-detect tests updated to assert single-line JSON output
- [ ] `npm run build` produces updated output

---

### T7: Wrap post-tool-status.ts output in hookSpecificOutput JSON [GATED]
**File:** MODIFY `src/hooks/post-tool-status.ts` (lines 149-155)

**RISK FLAG:** This task depends on verifying that Auggie's PostToolUse hook protocol accepts `hookSpecificOutput.additionalContext` for context injection (not just for keyword detection). The keyword-detect hook uses this pattern successfully, but it is a PostToolUse hook with a specific purpose. post-tool-status serves a different role (injecting status context).

**Verification gate (must pass before implementing):**
1. Check if keyword-detect's `hookSpecificOutput` pattern is the general PostToolUse protocol, or keyword-detect-specific.
2. If general: wrap output. If keyword-specific: leave as raw string (current behavior may be correct).

**If verified, change from:**
```typescript
console.log(truncated);
```
**To:**
```typescript
console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: truncated,
  },
}));
```

**Acceptance criteria:**
- [ ] Verification gate documented (pass/fail with evidence)
- [ ] If pass: output is valid `hookSpecificOutput` JSON
- [ ] If fail: task is skipped with rationale documented
- [ ] post-tool-status tests updated accordingly
- [ ] `npm run build` produces updated output

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| T0 PreToolUse additionalContext not supported | T1 Plan A invalid; entire bridge approach pivots | T0 spike verifies before any investment; Plan B ready |
| D7 PostToolUse protocol mismatch | post-tool-status output silently ignored by Auggie | Verification gate; implement last; easy to revert |
| Shell injection via node names | Arbitrary command execution | `spawnSync` with argument array, no shell |
| D1 graphwiki CLI not installed | Bridge hook hangs or crashes | 3s timeout + try/catch with exit 0 fallback |
| SKILL.md command list drift | Commands listed don't match actual CLI | Verify against graphwiki/graphify --help before finalizing |

---

## ADR: Graph Provider Context Injection Strategy

**Decision:** Use PreToolUse `additionalContext` injection (Plan A), with PostToolUse nudge (Plan B) as fallback, verified by T0 spike.

**Drivers:** Proactive context is more valuable than reactive nudges; but PreToolUse additionalContext is unverified in this codebase.

**Alternatives considered:**
- SessionStart-only injection (too static, no per-file context)
- PostToolUse nudge only (reactive, user already read the file without graph context)
- MCP resource provider (out of scope, requires Auggie MCP support)

**Why chosen:** T0 spike de-risks Plan A at near-zero cost. Plan B is a tested protocol (PostToolUse hookSpecificOutput) that provides value even if Plan A fails.

**Consequences:** If T0 fails, context injection is reactive rather than proactive. Users see a nudge after reading a file instead of getting graph context before.

**Follow-ups:** If Plan A works, consider extending to SessionStart for global graph context alongside per-file PreToolUse context.

---

## Success Criteria
1. `npm run build` succeeds with zero TypeScript errors
2. `npm test` passes (all existing + new tests)
3. T0 verification spike completed with documented result
4. keyword-detect produces exactly one line of JSON on stdout (T6 fix verified)
5. SKILL_NAME_MAP routes to existing `graph-context` skill with unit test coverage (T5 fix verified)
6. session-start injects multi-step protocol messages (T4 verified via test)
7. graph-provider bridge hook registered in hooks.json and compiles (T1 verified)
8. SKILL.md contains all documented commands for both providers (T2+T3 verified)
