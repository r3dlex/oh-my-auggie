<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-04-12 | Updated: 2026-04-12 -->

# plugins/oma

## Purpose
The OMA (oh-my-auggie) Auggie plugin. Provides 19 specialized agents, 44 slash commands, 36 skills, and 10 hooks for multi-agent orchestration in Augment Code's auggie CLI. Built in TypeScript, compiled to `dist/`.

## Key Files
| File | Description |
|------|-------------|
| package.json | Package descriptor, scripts (build, test, lint) |
| tsconfig.json | TypeScript compiler configuration |
| vitest.config.ts | Vitest test runner configuration |
| hooks/hooks.json | Hook registrations — maps hook events to entrypoints |
| .augment-plugin/plugin.json | Auggie plugin manifest — declares agents, commands, hooks |
| CONTRIBUTING.md | Plugin-level contribution guidelines |
| CHANGELOG.md | Plugin version history |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| agents/ | 19 agent markdown files (YAML frontmatter + Agent_Prompt) |
| commands/ | 44 slash command markdown files |
| skills/ | 36 skills, each in `skills/{name}/SKILL.md` |
| src/ | TypeScript source — compiled to dist/ |
| tests/ | Vitest unit and integration tests |
| hooks/ | Hook TypeScript sources + hooks.json registry |
| rules/ | Orchestration policy markdown files |
| mcp/ | MCP state server (state-server.mjs) |
| templates/ | Scaffolding templates |
| examples/ | Usage examples |
| benchmarks/ | Performance benchmarks |

## For AI Agents
### Working In This Directory
- Run `npm run build` to compile TypeScript before testing runtime behaviour.
- Run `npm test` to execute the full vitest suite.
- `dist/` and `coverage/` are gitignored — do NOT edit `dist/` directly.
- Agent files follow the pattern: YAML frontmatter + XML `<Agent_Prompt>` body.
- Skills are markdown files at `skills/{name}/SKILL.md`.

### Testing Requirements
```bash
npm test          # vitest suite
npm run build     # verify TypeScript compiles cleanly
```

### Common Patterns
- Agent files: YAML frontmatter + XML Agent_Prompt in `agents/`
- Hooks: TypeScript in `hooks/`, compiled to `dist/hooks/`; registered in `hooks/hooks.json`
- Skills: markdown in `skills/{name}/SKILL.md`
- Commands: markdown with YAML frontmatter in `commands/`

## Dependencies
### Internal
- `src/` compiles to `dist/`
- `hooks/hooks.json` registers hook entrypoints
- `.augment-plugin/plugin.json` declares agents, commands, and hooks to auggie

### External
- auggie >= 0.22.0
- node >= 18
- vitest (testing)
- esbuild (build)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
