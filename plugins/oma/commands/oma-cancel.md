---
name: oma-cancel
description: Cancel active OMA mode and clear all state
argument-hint: "[--force|--all]"
allowed-tools:
  - Read
  - Bash
model: haiku4.5
---

## /oma:cancel

**Purpose:** Cancel the active OMA mode and cleanly exit all orchestration.

**Usage:**
- `/oma:cancel` — Cancel current mode (smart detection)
- `/oma:cancel --force` — Force-clear current session state
- `/oma:cancel --all` — Clear all OMA state including cross-session artifacts

**Aliases:** "canceloma", "stopoma"

---

## Smart Cancellation (Default)

Detects which mode is active and cancels it in dependency order:

1. **autopilot/ralph** — clears mode state, preserves resume data for autopilot
2. **ultraqa** — clears QA cycling state
3. **team** — sends shutdown to teammates, waits 15s, calls TeamDelete
4. **ralplan** — preserves plan file, clears mode state

## Force Clear (--force)

Clears current session state plus legacy artifacts:

```bash
# Files removed under --force:
.rm -f .oma/state.json
.rm -f .oma/notepad.json
.rm -f .oma/task.log.json
.rm -f .oma/ultraqa-state.json
.rm -f .oma/ralph-state.json
.rm -f .oma/team-state.json
```

## All Clear (--all)

Clears everything including cross-session state:

```bash
# Additional files removed under --all:
.rm -f .oma/autopilot-state.json
.rm -f .oma/ralplan-state.json
.rm -f .oma/hud-state.json
```

## What Gets Cancelled

| Mode | State Cleared | Preserve Progress |
|------|---------------|-------------------|
| autopilot | phase, mode, task | Yes (resume possible) |
| ralph | mode, iteration, task | No |
| ultrawork | mode, parallel tasks | No |
| plan | mode | Yes (plan file preserved) |
| ralplan | mode | Yes (plan file preserved) |

## How It Works

1. **Read current state** via `oma_state_read`
2. **Set mode to "none"** and `active: false` via `oma_mode_set`
3. **Clear session state** via `oma_state_write` for relevant keys
4. **Confirm cancellation** to you

## Output

```
✓ OMA mode cancelled
  Previous mode: {mode}
  State cleared: {what was cleared}
  Ready for new task.
```

## Emergency Fallback

If MCP tools are unavailable, state can be cleared directly:

```bash
rm -f .oma/state.json
rm -f .oma/notepad.json
rm -f .oma/task.log.json
```

## Constraints

- Only clears OMA state — does not affect git state
- Does not kill subprocesses spawned outside OMA
- Resume is only possible for autopilot and plan modes

---

## <Why_This_Exists>

OMA orchestration modes (`autopilot`, `ralph`, `ultrawork`, `ultraqa`, `team`, `ralplan`) persist state to `.oma/state.json` and related files. Without a dedicated cancel skill:

1. **Modes would lock the session.** The stop-gate hook (in `ralph` and `autopilot`) blocks agent completion until the architect renders PASS. A user could become trapped in a looping orchestration with no exit path.

2. **State would accumulate and conflict.** Abandoned `.oma/state.json` entries from a previous session can conflict with new tasks, causing spawned agents to read stale iteration counts, modes, or phase markers.

3. **Resource leaks.** `oma-team` mode spawns named agents via `TeamCreate`. Without a structured teardown, those agent processes can remain orphaned in the session.

4. **No clean handoff.** Cancel provides a structured, reversible exit for modes that support resume (`autopilot`, `plan`) and a hard exit for modes that do not (`ralph`, `ultrawork`). This prevents silent failures where a mode appears inactive but still holds state.

The cancel skill is the only OMA command that modifies `.oma/` state files as its primary purpose. All other OMA commands treat state as read-only.

---

## <Final_Checklist>

- [ ] `oma_state_read` confirms `mode: none` and `active: false` in `.oma/state.json`
- [ ] No orphaned `.oma/task.log.json` entries from an unfinished session
- [ ] For `team` mode: `TeamDelete` confirmed or teammates explicitly shut down via `SendMessage`
- [ ] `.oma/notepad.json` preserved (if it existed) — cancel does not remove notepad entries
- [ ] Git working tree is unaffected — verify with `git status` if any concern about accidental file changes
- [ ] If resuming a previously cancelled `autopilot` task: confirm resume data is present in `.oma/state.json` before starting a new mode
- [ ] New OMA commands can be invoked immediately after cancel — no lock or gate remains active
