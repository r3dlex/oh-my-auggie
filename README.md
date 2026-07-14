# oh-my-auggie (OMA)

> **Sister projects:** [oh-my-claudecode (OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode) | [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) | [oh-my-githubcopilot (OMP)](https://github.com/r3dlex/oh-my-githubcopilot) | [oh-my-antigravity (OMG)](https://github.com/r3dlex/oh-my-antigravity)

Multi-agent orchestration for [Augment Code's `auggie` CLI](https://docs.augmentcode.com/cli/overview). OMA adds `/oma:*` commands, specialized agents, workflow skills, hooks, persistent project state, and an optional terminal companion.

[Quick Start](#quick-start) · [Choose an install](#plugin-or-wrapper) · [Health check](#health-check) · [Troubleshooting](#troubleshooting) · [Discord](https://discord.gg/PUwSMR9XNk)

## Identity

| Surface | Repository identity |
| --- | --- |
| Source repository | `r3dlex/oh-my-auggie` |
| Auggie marketplace | `oh-my-auggie` |
| Auggie plugin | `oma` |
| Auggie install token | `oma@oh-my-auggie` |
| npm package and terminal command | `oh-my-auggie` → `oma` |

The Auggie plugin is the product. The npm package adds the optional `oma` terminal companion; it does not replace plugin registration in Auggie.

## Prerequisites

- [Augment Code's `auggie` CLI](https://docs.augmentcode.com/cli/overview) 0.22.0 or newer.
- Node.js 18 or newer.
- `npm` only if you install the optional terminal companion.
- `tmux` only for the `oma` TUI launcher, HUD sessions, and terminal team/session workflows. Plugin commands can run in `auggie` without it.

## Quick Start

The recommended installation is the native Auggie plugin:

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
auggie
```

Then run this inside Auggie:

```text
/oma:help
/oma:version
/oma:doctor
```

Success is observable when `/oma:help` lists the `/oma:*` command surface and `/oma:version` prints the installed OMA version. `/oma:doctor` then provides the fuller diagnostic report. Restart Auggie once if newly installed slash commands do not appear.

## Plugin or wrapper?

| Choose | What it installs | Use it when |
| --- | --- | --- |
| **Auggie plugin (recommended)** | `/oma:*` commands, agents, skills, hooks, and plugin integration | You want to use OMA inside Auggie |
| **npm terminal companion (optional)** | The `oma` executable for offline doctor output, HUD/status views, tmux sessions, and terminal team controls | You also want terminal-level orchestration and observability |

Install the companion after registering the plugin:

```bash
npm install -g oh-my-auggie
oma version
oma help
```

`oma` with no subcommand starts Auggie in a tmux session with a HUD pane. If tmux is unavailable, run `auggie` directly and use the native plugin.

## Health check

Inside Auggie, use the plugin diagnostic:

```text
/oma:doctor
```

With the optional companion installed, run this from the same project directory as the Auggie session:

```bash
oma doctor --json
```

The companion check reports the resolved `.oma/` directory, state file, `auggie`, `tmux`, and Node.js. It is intentionally strict and exits non-zero when any listed check is false, including optional tmux or a missing state file. Read the individual checks in context: tmux is still optional for native plugin use, while a new project without `.oma/state.json` has not initialized runtime state yet.

For repository development, the full local gate is:

```bash
npm run typecheck
npm test
npm run test:docs
```

## First-time setup and managed files

Plugin installation and `/oma:setup` are separate operations. Installation registers OMA with Auggie. `/oma:setup` can configure a project or user environment; inspect its prompts before accepting changes.

Use verification mode to inspect the current environment without requesting re-initialization:

```text
/oma:setup --verify
```

OMA uses these file classes:

| Files | Ownership model |
| --- | --- |
| Auggie marketplace/plugin cache | Managed by Auggie's plugin installation; edit the source checkout, not the installed cache |
| `.oma/` runtime artifacts other than `config.json` | Generated state, events, notes, task data, and caches; `.oma/` is ignored by this repository |
| `~/.oma/config.json` and `.oma/config.json` | User- or command-managed global and project overrides; may contain sensitive values |
| `.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`, `~/.auggie/settings.json`, `~/.claude/hud-wrapper.sh`, `.augment/rules/`, `.git/info/exclude` | Files that `/oma:setup` may create or update; setup documents backups for existing instruction/rule files |
| `plugins/oma/src/` | Canonical TypeScript source in this repository |
| `plugins/oma/dist/` | Generated build output; do not edit it directly |

## Core workflows

OMA workflows are invoked as Auggie slash commands:

| Command | Purpose |
| --- | --- |
| `/oma:plan` | Strategic planning |
| `/oma:deep-interview` | Clarify ambiguous requirements before execution |
| `/oma:autopilot` | End-to-end autonomous execution |
| `/oma:ralph` | Persistent completion loop |
| `/oma:team` | Coordinated multi-agent work |
| `/oma:ultrawork` | Parallel execution |
| `/oma:ultraqa` | Iterative QA |
| `/oma:cancel` | End an active mode and clean up its runtime state |

Run `/oma:help` in Auggie for the installed command surface. With the terminal companion, run `oma help`; its syntax is intentionally different from `/oma:*` commands.

## Safety

- Install only from a source you trust. OMA hooks and commands run with the permissions of the Auggie session.
- Review `/oma:setup` prompts before allowing project-level or home-directory changes. Use `/oma:setup --verify` when you only want inspection.
- Treat `.oma/` as local runtime data. It can contain task context, notes, configuration, and execution history; do not commit or publish it.
- Keep secrets out of tracked files. If a command stores credentials in `.oma/config.json`, protect that file as sensitive local configuration.
- Use `/oma:cancel` to stop an active persistent workflow; do not delete state files during a live run unless recovery guidance explicitly calls for it.
- Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/r3dlex/oh-my-auggie/security/advisories).

## Updating

For the optional npm companion:

```bash
npm install -g oh-my-auggie@latest
```

Inside Auggie, `/oma:update --check` performs a release check and `/oma:update` follows the package-channel update flow defined by the installed command. Automatic wrapper prompts can be disabled with `OMA_AUTO_UPDATE=0` or `OMA_DISABLE_AUTO_UPDATE=true`.

Native marketplace-plugin lifecycle is owned by Auggie's plugin manager. This repository does not define a stable marketplace-update subcommand, so do not treat the npm command as proof that Auggie refreshed its installed plugin copy.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `/oma:*` commands are missing | Confirm the install token was `oma@oh-my-auggie`, restart Auggie, then run `/oma:help` |
| `/oma:doctor` reports missing plugin files or hooks | Re-check the marketplace source and plugin installation; do not hand-edit the installed plugin cache |
| `oma: command not found` | Reinstall `oh-my-auggie` globally and ensure npm's global binary directory is on `PATH` |
| `oma` says tmux is required | Install tmux, or run `auggie` directly; tmux is not required for the native plugin command surface |
| `oma doctor --json` reports no state file | Run from the intended project and inspect first-time setup with `/oma:setup --verify` |
| Update checks cannot reach GitHub or npm | Check network and package-registry access; update checks are non-fatal and can be retried |
| A workflow appears stuck | Inspect `/oma:status` and use `/oma:cancel` when you intend to stop it |

When asking for help, include the exact install model (plugin, companion, or both), `auggie` version, Node.js version, and doctor output with secrets removed.

## Documentation and advanced use

- [`SPEC.md`](SPEC.md) — architecture, state, hooks, and command reference.
- [`CHANGELOG.md`](CHANGELOG.md) — release history and migrations.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — local development, tests, and pull requests.
- [`SECURITY.md`](SECURITY.md) — supported security-reporting channel.
- [`docs/learning/troubleshooting-matrix.md`](docs/learning/troubleshooting-matrix.md) — deeper symptom-to-diagnostic mapping.
- [`plugins/oma/commands/`](plugins/oma/commands/) — exact installed slash-command definitions.
- [`plugins/oma/examples/`](plugins/oma/examples/) — programmatic examples.

## Localized READMEs

[Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

The English README is the canonical source for install, safety, update, and troubleshooting behavior. Localized files keep the verified command path and link back to these canonical sections.

## Contributing and community

- Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.
- Use [GitHub Issues](https://github.com/r3dlex/oh-my-auggie/issues) for reproducible bugs and feature proposals.
- Join the community on [Discord](https://discord.gg/PUwSMR9XNk).
- If OMA saves you time, you can [sponsor the project](https://github.com/sponsors/r3dlex).

## License

Licensed under the [Apache License 2.0](LICENSE).

<!-- v3-ai-sdlc-init:start -->
## AI SDLC v3
This repo follows the v3 AI-SDLC layout. See [AGENTS.md](AGENTS.md) for the agent operating contract, the workflow doc [`.ai/workflows/repo-workflow.md`](.ai/workflows/repo-workflow.md), and the workflow manifest [`.ai/workflows/repo-workflow.json`](.ai/workflows/repo-workflow.json). Also see `.ai/matrix.json`, `.memory/human-override/`, and `docs/architecture/adr/`. Modules at `r3dlex/skills/init-ai-repo/modules/`.
<!-- v3-ai-sdlc-init:end -->
