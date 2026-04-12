# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie banner" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![Version](https://img.shields.io/badge/version-0.2-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![License](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

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

Then initialize OMA in your project:

```
/oma:setup
```

Optionally configure MCP servers (adds state persistence and advanced tooling):

```
/oma:mcp-setup
```

### Manual Install

```bash
git clone https://github.com/r3dlex/oh-my-auggie.git
cd oh-my-auggie
auggie plugin install --source ./plugins/oma oma@oh-my-auggie
```

Then initialize OMA in your project:

```
/oma:setup
```

Optionally configure MCP servers (adds state persistence and advanced tooling):

```
/oma:mcp-setup
```

---

<p align="center">
  <img src="assets/buddy-dark.png" alt="OMA - Dark Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — installed and ready. What do you want to build?</em>
</p>

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
| `ultraqa` | `/oma:ultraqa` |
| `ralplan` | `/oma:ralplan` |
| `team N:agent` | `/oma:team` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | `/oma:deslop` |
| `ccg` | `/oma:ccg` |
| `deep interview` | `/oma:interview` |

---

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — parallel agents, persistent state, zero dependency overhead</em>
</p>

---

## Architecture

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 19 agents: architect, executor, explorer, planner, verifier, etc.
│   ├── commands/        # 44 commands: autopilot, ralph, ultrawork, team, ultraqa, etc.
│   ├── hooks/           # 10 hooks: session-start, delegation-enforce, stop-gate, cost-track, keyword-detect, etc.
│   ├── skills/          # 36 skills: ralph, ultrawork, ultraqa, ralplan, ccg, etc.
│   └── mcp/
│       └── state-server.mjs   # MCP state server (12 tools: state, notepad, skill, intent)
└── .augment-plugin/
    └── plugin.json      # Auggie plugin manifest
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

### Hook Context Injection

Two hooks can inject context into the agent after each tool call. Both are **disabled by default**:

| Key | Default | Description |
|-----|---------|-------------|
| `hooks.costTracking` | `false` | Per-tool credit/cost estimates logged to `.oma/cost-log.json` |
| `hooks.statusMessages` | `false` | OMA mode, task progress, and notepad injected into agent context |

Enable via `/oma:config set hooks.costTracking true` or in `.oma/config.json`:

```json
{ "hooks": { "costTracking": true, "statusMessages": true } }
```

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

## Security

Please review our [Security Policy](SECURITY.md) for supported versions and vulnerability reporting guidelines.

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

## Sponsor

**:heart: Love oh-my-auggie? Consider sponsoring its development.**

Your sponsorship directly funds the time and energy poured into making multi-agent orchestration accessible to every developer on the Augment Code platform. Every contribution — no matter the size — helps keep the project alive, responsive, and improving.

👉 **[Sponsor on GitHub](https://github.com/sponsors/r3dlex)**

One-time and recurring options available. Sponsors get recognized in the project README and release notes.

---

*oh-my-auggie is not affiliated with Augment Code. "auggie" and "Augment Code" are trademarks of their respective owners.*
