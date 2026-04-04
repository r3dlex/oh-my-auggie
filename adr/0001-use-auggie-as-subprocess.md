# ADR 0001: Use Auggie as a Subprocess, Not a Plugin

**Date:** 2026-04-04
**Status:** Accepted
**Deciders:** oh-my-auggie team

## Context

We need to decide on the execution model for oh-my-auggie (OMA). Should OMA integrate with Auggie as a native Auggie plugin, or should it spawn auggie as a subprocess and orchestrate it externally?

Auggie offers a plugin marketplace with native extension primitives (hooks, commands, agents, MCP). However, the v0.1 API surface is small and some primitives (tmux-based team workers, comprehensive tool availability) are deferred.

## Decision

We will build OMA as a native Auggie plugin that distributes through the Auggie marketplace, while also providing a standalone CLI wrapper (`oma`) that can invoke auggie as a subprocess for capabilities deferred to v0.2.

**Consequences:**

1. **Plugin-first**: OMA installs via `auggie plugin marketplace add archgate/oh-my-auggie && auggie plugin install oma@oh-my-auggie`
2. **Standalone CLI**: A companion `oma` CLI wraps auggie for v0.2-deferred features (tmux team workers, comprehensive tool access)
3. **Dual execution modes**: Plugin mode for v0.1 primitives; standalone mode for full orchestration
4. **MCP server per-repo**: Each working copy gets its own MCP server for state persistence

## Alternatives Considered

### Option A: Pure Standalone CLI (rejected)
Spawn auggie as a subprocess for every operation. Simple but loses native integration benefits (hooks, custom commands, subagents).

### Option B: Pure Plugin (deferred)
Wait for Auggie v0.2 plugin API to mature before building. Delays delivery by quarters.

### Option C: Plugin + Standalone Hybrid (chosen)
Deliver v0.1 as a native plugin now. Provide standalone `oma` CLI companion for v0.2-deferred capabilities. Upgrade to full plugin when Auggie API matures.

## Links

- Auggie plugin docs: https://docs.augmentcode.com/cli/plugins
- Auggie SDK: https://docs.augmentcode.com/cli/sdk
