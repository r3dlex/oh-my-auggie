# ADR 0001: Use auggie as a subprocess, not a library

## Status

Accepted

## Context

oh-my-auggie provides convenience tooling around Augment Code's `auggie` CLI. We need to decide how to integrate with auggie's functionality.

## Decision

We will invoke `auggie` as a subprocess via shell execution. We will NOT attempt to import, fork, or reimplement any of auggie's logic as a library dependency.

## Rationale

1. **Stability**: auggie is an external product maintained by Augment Code. Treating it as a black-box subprocess means our tool works with any version of auggie that maintains CLI compatibility.

2. **No supply chain risk**: Embedding auggie's code or depending on its internal APIs would create a maintenance burden every time Augment Code updates their product.

3. **Clear boundaries**: oh-my-auggie's job is polish and automation — not AI. The AI belongs to auggie.

4. **Graceful degradation**: If auggie is not installed, we detect it at runtime and print a helpful error with installation instructions.

## Consequences

**Positive:**
- Minimal coupling to auggie internals
- Works with any auggie version with CLI compatibility
- No dependency on Augment Code's release schedule

**Negative:**
- Cannot hook into auggie's internal state or events
- Output parsing is brittle if auggie changes its stdout format

### stderr Handling

The orchestrator uses `oma_try_auggie()` which provides three debug modes controlled by `OMA_DEBUG`:
- `OMA_DEBUG=0` (default): silent, stderr discarded
- `OMA_DEBUG=1`: capture stderr to temp file, show only on error
- `OMA_DEBUG=2`: capture stderr to temp file, always show

### Output Parsing Risk

LLM stdout is treated as untrusted input. All parse operations use `jq` with null-guarding fallback. If auggie changes its output format, `PARSE_ERROR` annotations are emitted and routed to the Architect gate.

## Invocation Patterns

All orchestrator stage scripts use `oma_try_auggie()` from `priv/orchestrator/oma_lib.sh`:

```sh
source "$(dirname "$0")/oma_lib.sh"
output=$(oma_try_auggie "$USER_PROMPT")
```

The `auggie` binary is detected via `oma_detect_auggie()` which searches in order:
1. `/opt/homebrew/bin/auggie` (macOS Homebrew)
2. `/usr/local/bin/auggie` (Linux)
3. `$PATH` via `command -v auggie`

## References

- [auggie CLI](https://www.augmentcode.com)
- [archgate CLI](https://github.com/archgate/cli) — used for our own ADR tooling
