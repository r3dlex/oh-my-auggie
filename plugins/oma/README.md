# oh-my-auggie (OMA)

Multi-agent orchestration for Augment Code's `auggie` CLI. The repository contains the native OMA plugin; this npm package publishes the optional `oma` terminal companion.

> The canonical documentation lives in the [repository README](https://github.com/r3dlex/oh-my-auggie#readme). This package README keeps the install and health path self-contained.

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

- Augment Code's `auggie` CLI 0.22.0 or newer.
- Node.js 18 or newer.
- `npm` only for the optional companion.
- `tmux` only for the companion's TUI, HUD sessions, and terminal team/session workflows.

## Quick Start

Use the native Auggie plugin:

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
auggie
```

Then run inside Auggie:

```text
/oma:help
/oma:version
/oma:doctor
```

Success is observable when `/oma:help` lists `/oma:*` commands and `/oma:version` prints the installed OMA version. `/oma:doctor` then provides the fuller diagnostic report. Restart Auggie once if newly installed commands do not appear.

## Plugin or wrapper?

- **Auggie plugin (recommended):** installs `/oma:*` commands, agents, skills, and hooks.
- **npm companion (optional):** installs `oma` for offline diagnostics, tmux/HUD sessions, and terminal team controls.

Install the companion only when you need that terminal surface:

```bash
npm install -g oh-my-auggie
oma version
oma help
```

The companion does not register the plugin. Install `oma@oh-my-auggie` with Auggie first.

## Health check

```text
/oma:doctor
```

With the optional companion, from the project directory:

```bash
oma doctor --json
```

The companion reports `.oma/`, state, `auggie`, `tmux`, and Node.js checks. It is strict and exits non-zero when any listed check is false, including optional tmux or a missing state file; tmux remains optional for native plugin use.

## Managed files and safety

- Auggie owns its installed marketplace/plugin cache. Do not hand-edit it.
- `.oma/` runtime artifacts other than `config.json` are generated state, events, notes, task data, and caches. Keep the directory untracked.
- `~/.oma/config.json` and `.oma/config.json` are user- or command-managed overrides and may contain sensitive values.
- `/oma:setup` may create or update instruction files, Auggie settings, a HUD wrapper, rules, `.git/info/exclude`, configuration, and `.oma/` state. Use `/oma:setup --verify` for inspection and review prompts before accepting changes.
- `plugins/oma/src/` is canonical source; `plugins/oma/dist/` is generated build output.
- OMA commands and hooks run with the permissions of the Auggie session. Install only from a trusted source.

See the canonical README for the complete [managed-file model](https://github.com/r3dlex/oh-my-auggie#first-time-setup-and-managed-files) and [safety guidance](https://github.com/r3dlex/oh-my-auggie#safety).

## Updating

For the optional npm companion:

```bash
npm install -g oh-my-auggie@latest
```

`/oma:update --check` performs a release check; `/oma:update` follows the installed package-channel update flow. Auggie owns marketplace-plugin lifecycle, and an npm update alone is not proof that Auggie refreshed its installed plugin copy.

## Troubleshooting and docs

- [Troubleshooting](https://github.com/r3dlex/oh-my-auggie#troubleshooting)
- [Specification](https://github.com/r3dlex/oh-my-auggie/blob/main/SPEC.md)
- [Changelog](https://github.com/r3dlex/oh-my-auggie/blob/main/CHANGELOG.md)
- [Contributing](https://github.com/r3dlex/oh-my-auggie/blob/main/CONTRIBUTING.md)
- [Security](https://github.com/r3dlex/oh-my-auggie/blob/main/SECURITY.md)
- [Localized READMEs](https://github.com/r3dlex/oh-my-auggie#localized-readmes)

## Community and license

[GitHub Issues](https://github.com/r3dlex/oh-my-auggie/issues) · [Discord](https://discord.gg/PUwSMR9XNk) · [Sponsor](https://github.com/sponsors/r3dlex)

Licensed under the [Apache License 2.0](https://github.com/r3dlex/oh-my-auggie/blob/main/LICENSE).
