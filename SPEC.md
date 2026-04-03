# oh-my-auggie — Project Specification

## Overview

oh-my-auggie is a community-driven CLI toolkit that brings "oh-my-*" style convenience and conventions to [Augment Code's auggie CLI](https://www.augmentcode.com). It provides scripts, conventions, and automation wrappers that make it easier to configure, extend, and automate workflows built on auggie.

> **What this project is:** A convenience layer for auggie users. Think `oh-my-zsh` for your AI coding CLI.
> **What this project is NOT:** A fork or replacement for auggie. We do not reimplement any AI logic — that belongs to Augment Code.

## Project Name

- **oh-my-auggie** — pronounced "Oh My Augie"
- CLI wrapper / automation toolkit for Augment Code's `auggie` CLI

## Features

1. **CLI Wrapper Scripts** — Drop-in convenience scripts that wrap auggie with additional polish (colors, error handling, config defaults).
2. **Shell Integration** — Easy setup for bash/zsh shell environments.
3. **Configuration Conventions** — Opinionated default configs for common auggie workflows.
4. **Automation Helpers** — Script utilities for CI/CD integration, pre-commit hooks, and bulk operations.

## Architecture

```
oh-my-auggie/
├── assets/               # Logo and branding
├── priv/
│   ├── agents/          # Agent prompts (Explorer, Planner, Executor, Architect)
│   └── orchestrator/    # Orchestrator stage scripts (oma_lib.sh, oma_explore, oma_plan, oma_execute, oma_verify)
├── priv/orchestrator.sh # Master pipeline (4-stage: EXPLORE → PLAN → EXECUTE → VERIFY)
├── oh-my-auggie          # CLI entry point
├── adr/                  # Architecture Decision Records
└── e2e/                 # End-to-end tests (oh-my-auggie.bats, orchestrator.bats)
```

### Key Integration Points

- **auggie CLI**: oh-my-auggie scripts call `auggie` as a subprocess. If auggie is not installed, scripts fail gracefully with a helpful error message pointing to installation docs.
- **archgate**: Architecture Decision Records live in `adr/`. The project uses archgate to enforce ADR conventions in CI.
- **GitHub Actions**: CI pipeline defined in `.github/workflows/ci.yml`. Runs shellcheck, bats tests, and archgate checks.

## Non-Goals

- We do NOT reimplement auggie's AI capabilities
- We do NOT fork or replace Augment Code's official tooling
- We do NOT provide hosted or API-based services

## Tech Stack

- **Shell**: Bash/Zsh (portable POSIX shell where possible)
- **Testing**: [bats-core](https://github.com/bats-core/bats-core) for bash unit tests
- **Linting**: shellcheck for shell script quality
- **ADR tooling**: [archgate](https://github.com/archgate/cli) for decision record enforcement

## References

- [Augment Code](https://www.augmentcode.com)
- [auggie CLI](https://www.augmentcode.com) (Augment Code's official CLI)
- [archgate CLI](https://github.com/archgate/cli) — ADR governance tool
- [archgate ADRs](https://github.com/archgate/cli/blob/main/adr/) — Architecture Decision Records
