# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.3.1] - 2026-04-14

### CI

- verify vitest coverage remains above 80% for statements/functions/branches and keep branch threshold at 80%

### Chores

- align plugin package and marketplace-facing metadata with the 0.3.1 release cut

### Docs

- refresh command examples that referenced stale pre-0.2 versions

## [0.1.0-alpha.1] - 2026-04-09

### Features

- add tdd + improve-codebase-architecture skills, examples, and benchmarks
- OMA skills system enhancement — OMC section parity and two-tier index
- two-tiered config system with enterprise profile support
- Phase 0 skillify audit + Phase 3 deferred skills
- OS detection, short-alias commands, and /skills command
- align plugin manifests for Claude Code compatibility
- add Claude Code-compatible marketplace.json
- add context7, exa, github MCP servers
- auto-invoke mcp-setup and add ADO/Figma MCP servers
- expand keyword-detect with all OMA commands as magic keywords
- Phase 3.5 rule template installation via /oma:setup
- expand Phase 1-4 with actual bash commands
- port missing OMC commands + team worktree isolation
- add HUD auto-display on session start
- add /oma:deep-interview command with alias
- port Phase 1 OMC skills to OMA
- Phase 2 overlap resolution enhancements
- rewrite all 7 shell hooks in TypeScript for Windows support

### Bug Fixes

- correct owner email in marketplace.json
- remove mcp from auto-config and fix cost-track OMA_DIR resolution
- cost-track create .oma dir before writing cost-log
- remove matcher fields, increase timeout to 5000ms
- shell-wrap node command to expand ${PLUGIN_ROOT}
- correct Auggie hook format (array → object per event)
- use correct package names for context7, exa, github

### Refactors

- convert all .sh hooks to .mjs (ESM)
- simplify augment marketplace.json to match schema

### Chores

- remove OMC-style command files
- remove e2e/oma-core-loop.bats (replaced by Vitest)
- add npm install step to typecheck and vitest jobs; fix dist/*.js
