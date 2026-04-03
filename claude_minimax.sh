#!/bin/bash
export ANTHROPIC_AUTH_TOKEN="[REDACTED]"
export ANTHROPIC_BASE_URL="https://api.minimax.io/anthropic"
export ANTHROPIC_MODEL="MiniMax-M2.7"
exec claude --dangerously-skip-permissions "$@"
