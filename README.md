# oh-my-auggie

<p align="center">
  <img src="assets/oh-my-auggie.svg" alt="oh-my-auggie logo" width="200"/>
</p>

> "Oh My" convenience tooling for [Augment Code's auggie CLI](https://www.augmentcode.com) — because great AI deserves great tooling.

---

## What is oh-my-auggie?

oh-my-auggie is a community-driven toolkit that wraps [Augment Code's `auggie` CLI](https://www.augmentcode.com) with the kind of polish, conventions, and automation you'd expect from a mature open-source project. Think `oh-my-zsh` for your AI coding CLI.

Whether you're an individual developer who lives in the terminal or an enterprise team standardizing on AI-assisted development, oh-my-auggie helps you get more out of auggie with less configuration.

## Features

- **CLI wrapper scripts** with colors, error handling, and helpful defaults
- **Shell integration** for bash and zsh
- **Opinionated config conventions** for common auggie workflows
- **CI/CD helpers** for GitHub Actions and pre-commit hooks
- **ADR governance** via [archgate](https://github.com/archgate/cli) — because good teams document their decisions

## Community

Contributions welcome! This is a community project — no corporation behind it, just developers helping developers.

### For Contributors

- Fork the repo and open PRs against `main`
- Run `shellcheck claude_minimax.sh` before submitting shell scripts
- Run `bats e2e/` to execute the test suite
- See [SPEC.md](./SPEC.md) for project architecture

### For Users

- Star the repo and watch it grow
- Open issues for bugs and feature requests
- Join discussions for questions and ideas

## Enterprise

oh-my-auggie is production-ready for enterprise use:

- **Predictable behavior**: Shell scripts with no hidden dependencies — what you see is what you execute
- **CI/CD native**: Works in any CI system; GitHub Actions config included
- **Compliance-friendly**: ADRs tracked via [archgate](https://github.com/archgate/cli) so architectural decisions are documented and enforceable
- **Vendor-neutral**: Not affiliated with Augment Code — this is a community convenience layer

> **Want enterprise support, custom integrations, or dedicated features?** Open a discussion or reach out through the project's issue tracker.

## Links

| Resource | URL |
|----------|-----|
| Augment Code (auggie CLI) | https://www.augmentcode.com |
| Auggie CLI Docs | https://www.augmentcode.com (CLI section) |
| archgate CLI | https://github.com/archgate/cli |
| archgate ADRs | https://github.com/archgate/cli/blob/main/adr/ |
| oh-my-auggie | https://github.com/archgate/oh-my-auggie |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/archgate/oh-my-auggie.git
cd oh-my-auggie

# Run the main script (requires auggie to be installed)
./claude_minimax.sh

# Run the test suite
bats e2e/
```

## Architecture Decisions

We use [archgate](https://github.com/archgate/cli) to track and enforce architectural decisions. See the [adr/](./adr/) directory for current ADRs.

---

*oh-my-auggie is not affiliated with Augment Code. "auggie" and "Augment Code" are trademarks of their respective owners.*
