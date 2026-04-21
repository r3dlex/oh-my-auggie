# Open Questions

## [mjs-to-ts-conversion-ralplan-rev3-final.md] - 2026-04-12

- [ ] **Project-dir variable name in `commands/oma-setup.md`** — T3.3 replaces `--target "$RULES_TARGET"` with `--project-dir "<project_root_var>"`. Executor must read lines 200-296 of `oma-setup.md` to identify the correct shell variable that holds the project root (not `$RULES_TARGET`, which points at `.augment/rules/`). Matters because using the wrong variable reintroduces the original bug in a different shape.
- [ ] **`pretest` vs `prepare` ordering in `package.json`** — T3.2 depends on `dist/setup-rules.js` existing before `npm test` runs. Confirm whether `plugins/oma/package.json` already has `prepare: npm run build` or if `pretest: npm run build` must be added explicitly. Matters because CI green depends on build artifacts being present.
- [ ] **Caching `loadOmaState(omaDir)` result in `session-start.ts`** — T1b.3 uses `state` twice (line 99 for mode injection + new HUD block). Executor may cache at line 99 into a `const cachedState = ...` and reuse, OR call `loadOmaState` twice. Style preference: cache to avoid duplicate file I/O on every session start. Non-blocking but should be consistent.
- [ ] **`AUGMENT_PLUGIN_ROOT` env var actually set by Auggie?** — T1b.2 falls back to `dirname(fileURLToPath(import.meta.url))` navigation if `AUGMENT_PLUGIN_ROOT` is unset. Verify whether Auggie sets this env var in hook subprocesses. Matters because the fallback path traversal (`join(..., '..', '..')`) depends on hooks running from `dist/hooks/` — which it will in PR 2 but NOT in PR 1 (where hooks.json still points at `hooks/session-start.mjs`). For PR 1 the ts rewrite is only exercised by unit tests, so this is not a blocker — but flag it for PR 2.

## [mjs-to-ts-conversion-ralplan-rev2.md] - 2026-04-12

- [ ] **dist/setup-rules.js shipping strategy** — T3 converts `src/setup-rules.mjs` → `.ts`, but its consumer (`commands/oma-setup.md:294-296`) is a shell runbook executed at plugin install time. Plugin installs do NOT include `dist/` (reviewer blocker C1). Must we: (a) ship `dist/setup-rules.js` alongside other plugin assets via a tracked glob, (b) shell out via `npx tsx src/setup-rules.ts`, or (c) defer T3 alongside T1c until PR 2 resolves the dist-shipping strategy? MUST be resolved before implementation begins. Matters because an unresolved decision here leaves T3 at the same blocker as T1c — the very thing PR 1 is trying to avoid.

- [ ] **findPluginRoot() heuristic under nested installs** — T1b introduces a new `findPluginRoot(startPath)` helper in `src/utils.ts` that walks up looking for a `package.json` with `name === 'oh-my-auggie'`. What is the canonical plugin name on disk? Verify against `plugins/oma/package.json:name` before wiring `PLUGIN_NAME` const. Matters because a wrong name silently falls back to the 2-levels-up heuristic and the background update-check fetches stale version info.

- [ ] **Parity harness for mjs-vs-ts (not shell-vs-mjs)** — `tests/parity/runner.ts` currently compares shell vs mjs outputs. T1b requires a new `runMjsVsTs(hookName, fixture)` helper comparing `hooks/<name>.mjs` vs compiled `dist/hooks/<name>.js`. Is it acceptable to add this helper as part of PR 1, or should it land separately? Matters because without it, session-start bug fixes cannot be verified beyond unit tests.

- [ ] **session-start test fixture commit policy** — T1b requires 4 parity fixtures (`empty-state`, `active-mode`, `hud-active`, `corrupted-json`) committed to `tests/parity/fixtures/session-start/`. Are fixtures gitignored today? If so, the `.gitignore` must be updated in the same PR. Verify before implementation.

## OMA Windows Support Plan - 2026-04-04

---

## [oma-skills-enhancement-ralplan.md] - 2026-04-06

- [x] **OMA local skill storage paths** -- RESOLVED by ADR in plan revision 2: use both paths; project-level `.oma/skills/` takes precedence over plugin-level `skills-learned/`. User skills stored in `~/.augment/plugins/marketplaces/oh-my-auggie/plugins/oma/skills-learned/`.

- [ ] **HUD Phase 2 feasibility** -- Does Auggie support `statusLine` in its settings (the way Claude Code does)? OMC's HUD relies on `~/.claude/settings.json` `statusLine.command`. If Auggie has no equivalent, Phase 2 cannot be implemented without an Auggie feature request. DEFERRED to Phase 2 follow-up.

- [ ] **OMA skill activation wiring** -- `keyword-detect.ts` currently only detects magic keywords. Should it also scan skill YAML frontmatter for `trigger`/`triggers` keywords to enable auto-activation from conversation context? This affects how skills surface naturally without explicit `/oma:` invocation. OPEN, defer to Phase 2.

- [x] **`/oma:skill` write permissions** -- RESOLVED by ADR in plan revision 2: `/oma:skill add|remove|edit` subcommands that write files MUST delegate to `oma-executor` via Task/SendMessage tool when OMA orchestration mode is active. This is consistent with OMA's architecture. When OMA mode is NOT active, direct user invocation bypasses delegation-enforce.

## [.omc/plans/oma-windows-support-ralplan.md] - 2026-04-04

- [ ] **Does Auggie read `hooks.json` at runtime or at plugin load time?** -- If Auggie caches the hook entry points at plugin load, updating `hooks.json` after Auggie starts requires a restart to pick up the new `.mjs` paths. This affects whether the CI `hooks.json` update step takes effect immediately or only after a plugin reload.

- [ ] **Should the shell scripts be kept as shadow implementations during migration?** -- The architect recommended a phased migration (one hook at a time, keeping `.sh` as fallback). The revised plan deletes all shell scripts in the same PR that adds TypeScript + parity tests. If behavioral bugs are discovered post-merge, there is no shell script fallback to restore without a rollback commit.

- [ ] **Is the `mcp/state-server.mjs` also being updated?** -- It is explicitly out of scope for this plan, but it uses the same grep+sed patterns for JSON extraction. If the MCP server's behavior changes (e.g., if other tools depend on its exact output format), there could be cross-component compatibility issues. A follow-up plan for MCP TypeScript migration should be scheduled.

- [ ] **Is `cost-log.json` format change a breaking change?** -- The parity test documents that `JSON.stringify()` output may differ from the shell script's `sed`-appended format. If other tools or scripts read `cost-log.json`, the whitespace/key ordering change is a breaking change. This should be confirmed with stakeholders before the PR is merged.

- [ ] **Should Windows CI use a WSL runner instead of relying on ubuntu-latest?** -- The revised plan uses `ubuntu-latest` as the primary CI platform (sufficient for TypeScript `.mjs` cross-platform correctness) but defers a Windows-native CI job to a follow-up. The trade-off between the added complexity of a WSL runner job and the confidence gain from real Windows testing should be decided before Step 15 CI implementation.

## [mjs-to-ts-conversion-ralplan.md] - 2026-04-12

- [ ] **HUD parity gap between `hooks/session-start.mjs` and `src/hooks/session-start.ts`** -- The stale `.mjs` version has a `hud-active` branch emitting `[OMA HUD]{...}`; the newer `src/hooks/session-start.ts` version does not. Before redirecting `hooks.json` to compiled TS hooks (T1), confirm whether HUD auto-display is still required. If yes, the feature must be ported into `src/hooks/session-start.ts` first. Must be resolved before execution.

- [ ] **Feature parity sweep across all 9 hooks** -- Beyond session-start, there may be other behavior in `hooks/*.mjs` that diverged from `src/hooks/*.ts`. An explicit diff-and-reconcile pass for all 9 hook pairs is required before T2 deletes any `.mjs` files. Must be resolved during T1.

- [ ] **Root `cli/*.mjs` (1,182 LOC) conversion strategy** -- Not included in this plan. Needs a dedicated follow-up plan covering: tsconfig strategy (second tsconfig vs. monorepo hoist), bin entry-point distribution, worker spawn paths, shebang handling. Defer until current plan lands.

- [ ] **`skills/team/worktree-manager.mjs` (291 LOC) conversion** -- Not included. Lower priority; revisit when team skill gains new features.

- [ ] **Second tsconfig or monorepo hoist for root `cli/`** -- Blocked by `cli/*.mjs` conversion decision above.

- [ ] **`tests/hooks-setup.js` (8 LOC)** -- Trivially convertible; bundle with any future test refactor.

- [ ] **External invocation paths for `mcp/state-server.mjs`** -- Before T4 deletes the old file, a repo-wide `rg` sweep must confirm no plugin manifest, shell wrapper, or external consumer references the old path. Must be resolved during T4.

- [ ] **MCP server hot-reload / restart semantics** -- If the MCP state server is running in a live session during the T4 swap, does it need an explicit restart? Does Auggie (or Claude Code) cache MCP server paths? This affects rollout instructions.

## [graph-provider-deviations-fix.md] - 2026-04-12

- [ ] **Does Auggie PreToolUse support `hookSpecificOutput.additionalContext` for context injection?** -- No existing PreToolUse hook in the codebase uses this pattern. keyword-detect uses it but is a PostToolUse hook. If PreToolUse ignores this field, T1's context injection will be silently dropped. Must verify before relying on this mechanism.
- [ ] **Is `hookSpecificOutput.additionalContext` a general PostToolUse mechanism or keyword-detect-specific?** -- Determines whether T7 (post-tool-status JSON wrapping) is correct or would break the hook. Verification gate in T7.
- [ ] **Should graphwiki/graphify command lists in SKILL.md be verified against `--help` output?** -- Risk of documenting commands that don't exist in the installed CLI version. Non-blocking but could erode trust.
- [ ] **What is the correct `hookEventName` value for PreToolUse hooks?** -- Assumed to be `"PreToolUse"` by analogy with keyword-detect's `"PostToolUse"`, but not confirmed in Auggie documentation.

## [fix-oma-command-names-and-execution.md] - 2026-04-12

- [ ] **Should frontmatter use `name:` or `command:` key?** -- 42 files use `name:`, 2 files use `command:`. The plan standardizes on `name:` since it is the majority convention and simpler (no `/oma:` prefix in the value). However, if Auggie treats `command:` differently from `name:` at the CLI level, this choice matters. Needs confirmation from Auggie CLI docs or testing.

- [ ] **Is the imperative preamble template strong enough to prevent summarization?** -- The proposed "Do not describe or summarize" language is a best-effort heuristic. If auggie still summarizes after adding it, may need to experiment with stronger framing (e.g., XML-style `<execute>` tags, moving all content into numbered imperative steps, or using a different frontmatter field). Only discoverable via smoke testing.

- [ ] **Does `plugins/oma/commands/AGENTS.md` need updating after the name changes?** -- This file was not inspected in detail. If it contains a command registry or naming conventions referencing the old `name: oma-*` values, it must be updated in the same change.

- [ ] **Are there auggie marketplace caching or indexing delays after frontmatter changes?** -- If auggie caches command metadata at plugin load time, the fixes may not take effect until the cache is cleared or a new session is started. The smoke test should account for this by restarting auggie after applying the changes.

## [update-model-references] - 2026-04-20

- [ ] **What is the exact model ID string Augment CLI accepts for Opus 4.7?** -- The docs show "Claude Opus 4.7" as display name, but the CLI likely uses a slug like `claude-opus-4-7`. Current agents use `claude-opus-4-6` which works, so the hyphenated pattern is likely correct. Confirm by testing `auggie --model claude-opus-4-7` or checking `auggie models list`.

- [ ] **Should the model ID format be normalized across all files?** -- Currently Opus uses `claude-opus-4-6` (fully qualified) while Sonnet uses `sonnet4.6` (shorthand). Both work due to normalizeModel(), but inconsistency could confuse contributors. Cosmetic; could be a follow-up.

- [ ] **Is Opus 4.7's 50%-off promotion (ending April 30) relevant to cost tracking?** -- CREDIT_COST uses flat values. If the promotion means temporary different pricing, cost-track would need a date check. Likely not worth implementing for a 10-day promotion.

- [ ] **Should non-Claude models (Gemini 3.1 Pro, GPT-5.x) be evaluated for cost optimization?** -- Deferred as a separate initiative per the plan's ADR. Worth revisiting after the Opus upgrade lands.

## [npm-trusted-publishing-migration] - 2026-04-21

- [ ] **Is oh-my-auggie's `publish-npm` job currently succeeding without NODE_AUTH_TOKEN?** -- The job has `id-token: write` and `--provenance` but no `NODE_AUTH_TOKEN` env var. Check recent GitHub Actions logs to determine if Trusted Publishing is already working or if publishing is silently broken.
- [ ] **Does `scope: '@r3dlex'` in oh-my-auggie's publish-npm setup-node interfere with OIDC token exchange for unscoped packages?** -- The package publishes as unscoped `oh-my-auggie` but setup-node has `scope: '@r3dlex'`. May cause the OIDC token to be scoped incorrectly, leading to 403 on publish.
- [ ] **Are there other r3dlex repos (beyond the 6 audited) that publish to npm?** -- The audit covered repos present locally; there may be additional repos on GitHub with NPM_TOKEN secrets that need migration.
- [ ] **Should the npmjs.com Trusted Publisher config include a GitHub environment name?** -- Using environments adds an extra layer of protection (only that environment can trigger the OIDC exchange), but none of the current workflows use GitHub environments.
- [ ] **Does the `changesets/action` in ai-hero-cli handle Trusted Publishing natively?** -- The `NPM_TOKEN: ""` workaround suggests it does, but should be verified against changesets docs to confirm no future breakage.

