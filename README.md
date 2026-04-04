# oh-my-auggie

<p align="center">
  <img src="assets/oh-my-auggie.svg" alt="oh-my-auggie logo" width="300"/>
</p>

> **Multi-agent orchestration for [Augment Code's `auggie` CLI](https://www.augmentcode.com)** — the "oh-my-*" experience for auggie.

---

## Installation

### Prerequisites

- `auggie` >= 0.22.0 — [install docs](https://www.augmentcode.com)
- `node` >= 18 (for the MCP state server)

### Marketplace Install (recommended)

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
```

That's it. The plugin registers all commands, agents, hooks, and the MCP state server automatically.

### Manual Install

```bash
git clone https://github.com/r3dlex/oh-my-auggie.git
cd oh-my-auggie
auggie plugin install --source ./plugins/oma oma@oh-my-auggie
```

---

## Commands

Once installed, these slash commands are available:

| Command | Description |
|---------|-------------|
| `/oma:autopilot` | Full autonomous pipeline — expand, plan, implement, QA, validate |
| `/oma:ralph` | Persistence loop — keeps working until all acceptance criteria pass |
| `/oma:ultrawork` | High-throughput parallel execution via concurrent subagents |
| `/oma:team` | Coordinated team of N agents |
| `/oma:ultraqa` | QA cycling: test, verify, fix, repeat |
| `/oma:ralplan` | Consensus planning with Architect + Critic review |
| `/oma:plan` | Strategic planning with analyst/architect review |
| `/oma:cancel` | Cancel active mode and clear state |
| `/oma:status` | Show current mode and state |
| `/oma:ask <model>` | Query with a specific model |
| `/oma:note` | Write to notepad (priority, working, manual) |
| `/oma:doctor` | Diagnose installation issues |

### Keyword Triggers

Drop the `/oma:` prefix — these activate automatically when detected in conversation:

| Keyword | Activates |
|---------|-----------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | deslop cleanup pass |

---

## Architecture

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4 subagents (v0.1): explorer, planner, executor, architect
│   ├── commands/        # 5 commands (v0.1): autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3 hooks: session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md (additive)
│   └── mcp/
│       └── state-server.mjs   # Zero-dependency MCP state server
├── .augment-plugin/
│   └── marketplace.json  # Auggie marketplace manifest
└── e2e/
    └── oma-core-loop.bats   # 34 integration tests
```

**State files** (stored in `.oma/` — git-ignored):

| File | Purpose |
|------|---------|
| `.oma/state.json` | mode, active, iteration |
| `.oma/notepad.json` | priority, working, manual sections |
| `.oma/task.log.json` | architect/executor verdict history |

---

## Profiles

| Profile | Description |
|---------|-------------|
| **Community** (default) | Full parallelization, no approval gates |
| **Enterprise** | Cost-aware model routing, ADR requirements, approval gates |

Enterprise is activated by creating `.oma/config.json` with `{ "profile": "enterprise" }`. Enterprise only *adds* rules — it never removes community features.

---

## Development

```bash
# Run the test suite
bats e2e/oma-core-loop.bats

# Lint hook scripts
shellcheck plugins/oma/hooks/*.sh

# Validate all manifests
node -e "
  const fs = require('fs');
  const files = [
    '.augment-plugin/marketplace.json',
    'plugins/oma/.augment-plugin/plugin.json',
    'plugins/oma/.augment-plugin/.mcp.json',
    'plugins/oma/hooks/hooks.json',
    '.claude-plugin/plugin.json'
  ];
  for (const f of files) {
    try { JSON.parse(fs.readFileSync(f)); console.log('OK: ' + f); }
    catch(e) { console.error('FAIL: ' + f + ' - ' + e.message); process.exit(1); }
  }
"
```

---

## Links

| Resource | URL |
|----------|-----|
| Augment Code | https://www.augmentcode.com |
| auggie CLI docs | https://www.augmentcode.com/docs/cli |
| Plugin docs | https://www.augmentcode.com/docs/cli/plugins |
| Hooks docs | https://www.augmentcode.com/docs/cli/hooks |
| MCP docs | https://www.augmentcode.com/docs/cli/integrations |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

*oh-my-auggie is not affiliated with Augment Code. "auggie" and "Augment Code" are trademarks of their respective owners.*
