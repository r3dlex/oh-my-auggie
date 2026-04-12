# [0.2.0](https://github.com/r3dlex/oh-my-auggie/compare/v0.1.7...v0.2.0) (2026-04-12)


### Features

* **graph:** graphwiki auto-build, auto-rebuild, resolveProjectDir, and optional dep ([0b2417d](https://github.com/r3dlex/oh-my-auggie/commit/0b2417da79c6127b3378f5ab32b05b28a3b1ee07))

## [0.1.7](https://github.com/r3dlex/oh-my-auggie/compare/v0.1.6...v0.1.7) (2026-04-12)

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

---

## [0.1.6] - 2026-04-12

### Features

- `hooks.costTracking` and `hooks.statusMessages` config flags (both default `false`) — opt-in hook context injection

### Bug Fixes

- CI: add `--ignore-scripts` to npm publish steps to avoid re-running `tsc` without `node_modules`

### CI

- Split release workflow into parallel `build` / `publish-gpr` / `publish-npm` / `github-release` jobs
- Add Option B: npm OIDC trusted publishing (`publish-npm` job with `id-token: write`, `--provenance`, `--access public`, `continue-on-error: true`)

### Docs

- Document `hooks.costTracking` and `hooks.statusMessages` in `oma-config.md`, `README.md`

---

## [0.1.5] - 2026-04-12

### Features

- Graph provider configuration system with multi-provider bridge (#25)
- Full JS-to-TS hooks migration: session-start rewrite, setup-rules.ts, hooks.json cutover (#27, #9)
- OMA v0.2 completeness: XML agent format, ADR system, audit-log hook, ultrawork, ralplan (#23)
- Phase 2 hooks parity + post-tool-status context injection hook
- Add `/oma:update` command with session-start background upgrade check
- Add `/oma:version` and `/oma:whatsnew` commands
- Add buddy assets, banner, and SECURITY.md
- Graph provider deviation fixes (#28)

### Bug Fixes

- Wrap post-tool-status output in `hookSpecificOutput` JSON — fixes hook protocol (#30)
- Fix graph-provider keyword command target (#30)
- cost-track: parse stdin before estimating credits — fixes always-88-credits bug (#31)
- cost-track: estimate tokens from stdin when Auggie provides no token counts
- MCP: use relative path instead of `AUGMENT_PLUGIN_ROOT` env var
- Fix OMA figure placement and captions in README (#20, #21)
- Exclude audit-log.ts from coverage (enterprise-only hook)

### Docs

- Add hierarchical AGENTS.md with 19 agents and 44 commands (#29)
- Add `/oma:setup` and `/oma:mcp-setup` post-install steps to all 12 README language variants
- Rewrite `/oma:update` command as imperative step-by-step instructions
- Bring CHANGELOG.md and CONTRIBUTING.md to repository root (#22)

### Refactors

- CI: zero-install with `npm ci` cache + ARM64 matrix + apt bats (#24)

---

## [0.1.4] - 2026-04-10

### Chores

- Bump version to v0.1.4
- Add `prd.json` to `.gitignore`

---

## [0.1.3-alpha.1] - 2026-04-09

### Features

- Add version-bump script for OMA releases

### Docs

- Add 11 translated README files (de, es, fr, it, ja, ko, pt, ru, tr, vi, zh)

---

## [0.1.2-alpha.1] - 2026-04-09

### Bug Fixes

- CI: embed git SHA in pre-release versions for idempotent re-runs

### Docs

- Add Sponsor section to README, SPEC, and CONTRIBUTING

---

## [0.1.1-alpha.1] - 2026-04-09

### Features

- OMA v0.2 complete: 19 agents, 30 commands, 7 hooks, and skills system (#8)
- OS detection, short-alias commands, and `/skills` command (#11)
- Port Phase 1 OMC skills to OMA (#12)
- Phase 2 command overlap resolution enhancements (#13)
- Phase 0 skillify audit + Phase 3 deferred skills (#14)
- Rewrite all 7 shell hooks in TypeScript for Windows support (#9)
- Add OMA CLI companion v1: `oma team`, `oma hud`, `oma doctor`
- Two-tiered config system with enterprise profile support (#16)
- OMA skills system enhancement — OMC section parity and two-tier index (#17)
- Add tdd + improve-codebase-architecture skills, examples, and benchmarks (#18)
- Expand keyword-detect with all OMA commands as magic keywords
- Phase 3.5 rule template installation via `/oma:setup`
- Add context7, exa, GitHub MCP servers
- Auto-invoke mcp-setup and add ADO/Figma MCP servers
- Add `/oma:deep-interview` command with alias
- Add HUD auto-display on session start
- Port missing OMC commands + team worktree isolation
- Expand `/oma:setup` Phase 1–4 with actual bash commands
- Align plugin manifests for Claude Code compatibility
- Add Claude Code-compatible marketplace.json
- Add CHANGELOG, CONTRIBUTING, release CI, and sponsor badge

### Bug Fixes

- CI: add `contents:write` permission for GitHub release creation
- CI: unescape `$` in release workflow shell commands
- CI: add `--force` to npm publish for idempotent re-runs
- CI: add `npm install` step to typecheck and vitest jobs; fix `dist/*.js` (#10)
- CI: use shell expansion for PATH in bats test step (#5)
- Correct Auggie hook format (array → object per event)
- Remove matcher fields, increase hook timeout to 5000ms
- Shell-wrap node command to expand `${PLUGIN_ROOT}`
- Use correct package names for context7, exa, github MCP servers
- Remove mcp from auto-config; fix cost-track `OMA_DIR` resolution
- cost-track: create `.oma` dir before writing cost-log
- Correct owner email in marketplace.json
- Correct GitHub owner from archgate to r3dlex in all references
- Sensitive data guard (#4)
- Fix bats: write state to server's hardcoded `.oma/state.json` path (#6)

### Refactors

- Convert all `.sh` hooks to `.mjs` (ESM) (#15)
- Simplify augment marketplace.json to match schema

### Chores

- Remove OMC-style command files
- Remove `e2e/oma-core-loop.bats` (replaced by Vitest)
- Add `.gitignore` for OMA runtime dirs + auto-merge docs in CI (#3)
- Rewrite README with marketplace install instructions

---

## [0.1.0-alpha.1] - 2026-04-09

### Features

- Initial release of oh-my-auggie (OMA)
- Phase 1–4 implementation with orchestration modes: autopilot, ralph, ultrawork, ultraqa, ralplan
- 7 TypeScript hooks: session-start, keyword-detect, cost-track, delegation-enforce, approval-gate, adr-enforce, audit-log
- Full Vitest test suite with 80%+ coverage across statements, branches, and functions
