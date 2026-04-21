GATE: PLAN_A

## Analysis

The `hookSpecificOutput` protocol used in `keyword-detect.ts` (PostToolUse hook) outputs:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "..."
  }
}
```

The `hookEventName` field is a plain string — it is set at runtime, not validated by the hook runner to only accept PostToolUse. There is no evidence in the codebase that PreToolUse excludes support for `additionalContext` via `hookSpecificOutput`.

The protocol is general across hook types. A PreToolUse hook emitting `hookEventName: 'PreToolUse'` with `additionalContext` is structurally identical and should be handled the same way by the Auggie CLI hook runner.

**Conclusion:** PLAN_A — register `graph-provider-bridge.ts` in the PreToolUse array.
