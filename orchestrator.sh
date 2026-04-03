#!/usr/bin/env bash
# orchestrator.sh — Master pipeline for OMA orchestrator
# 4-stage pipeline: EXPLORE → PLAN → EXECUTE → VERIFY

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR_DIR="$(cd "$SCRIPT_DIR/priv/orchestrator" && pwd)"

# Detect auggie availability early
auggie_path() {
  for p in /opt/homebrew/bin/auggie /usr/local/bin/auggie; do
    if [ -x "$p" ]; then echo "$p"; return 0; fi
  done
  if command -v auggie >/dev/null 2>&1; then command -v auggie; return 0; fi
  return 1
}

main() {
  local goal=""
  local context_dir="${PWD}"

  while [ $# -gt 0 ]; do
    case "$1" in
      --goal) goal="$2"; shift 2 ;;
      --context-dir) context_dir="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  if [ -z "$goal" ]; then
    echo "Usage: orchestrator.sh --goal 'description' [--context-dir /path]" >&2
    exit 1
  fi

  # Verify auggie is available
  if ! auggie_path >/dev/null 2>&1; then
    echo "ERROR: auggie not found. Install Augment Code's auggie CLI." >&2
    exit 10
  fi

  local tmpdir
  tmpdir="$(mktemp -du)"
  # Clean up temp directory on exit (success or error)
  trap "rm -rf '$tmpdir'" RETURN
  local explore_out="$tmpdir/explore.json"
  local plan_out="$tmpdir/plan.json"
  local execute_out="$tmpdir/execute.json"

  # Stage 1: EXPLORE
  echo "OMA_STAGE_START: explore" >&2
  local explore_result
  explore_result=$("$ORCHESTRATOR_DIR/oma_explore" "$goal") || {
    echo "OMA_STAGE_END: explore (failed, exit $?)" >&2
    exit 1
  }
  echo "$explore_result" > "$explore_out"
  echo "OMA_STAGE_END: explore (ok)" >&2

  # Stage 2: PLAN
  echo "OMA_STAGE_START: plan" >&2
  local plan_result
  plan_result=$("$ORCHESTRATOR_DIR/oma_plan" "$goal" "$explore_result") || {
    echo "OMA_STAGE_END: plan (failed, exit $?)" >&2
    exit 2
  }
  echo "$plan_result" > "$plan_out"
  echo "OMA_STAGE_END: plan (ok)" >&2

  # Stage 3: EXECUTE
  echo "OMA_STAGE_START: execute" >&2
  local execute_result
  execute_result=$("$ORCHESTRATOR_DIR/oma_execute" "$plan_result") || {
    echo "OMA_STAGE_END: execute (partial/failed, exit $?)" >&2
  }
  echo "$execute_result" > "$execute_out"

  # Stage 4: VERIFY
  echo "OMA_STAGE_START: verify" >&2
  local verify_result
  verify_result=$("$ORCHESTRATOR_DIR/oma_verify" "$(cat "$plan_out")" "$(cat "$execute_out")")
  local verify_exit=$?
  echo "OMA_STAGE_END: verify (exit $verify_exit)" >&2

  echo "$verify_result"
  exit $verify_exit
}

main "$@"
