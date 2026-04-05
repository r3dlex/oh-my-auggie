---
name: oma-wait
description: Rate limit monitoring and auto-resume — wait for Claude API limits to clear
argument-hint: "[subcommand]"
allowed-tools:
  - Read
  - Bash
model: haiku4.5
---

## /oma:wait

**Purpose:** Monitor Claude API rate limits and auto-resume blocked sessions when limits clear.

**Usage:**
- `/oma:wait` — Smart status: shows rate limit state and offers to start daemon
- `/oma:wait status` — Show current rate limit and daemon status
- `/oma:wait daemon start` — Start the background auto-resume daemon
- `/oma:wait daemon stop` — Stop the daemon
- `/oma:wait daemon start --foreground` — Run daemon in foreground (blocking)
- `/oma:wait detect` — Scan tmux for blocked Claude Code sessions
- `/oma:wait --json` — Output all status as JSON

**Examples:**
- `/oma:wait` — Check status, start daemon if rate limited
- `/oma:wait status --json`
- `/oma:wait daemon start --verbose`
- `/oma:wait detect`

---

## How It Works

### Rate Limit Status

OMA checks two Claude API limits:
- **5-hour limit:** 1000 requests per 5 hours (checked frequently during heavy use)
- **Weekly limit:** 5000 requests per week (overall budget)

When either is exceeded, Claude Code blocks new requests until the window resets.

### Auto-Resume Daemon

The background daemon:
1. **Polls** rate limit status every 60 seconds (configurable via `--interval`)
2. **Tracks** blocked Claude Code sessions in tmux panes
3. **Resumes** sessions automatically when the limit clears
4. **Logs** resume attempts to `.oma/wait-daemon.log`

### tmux Integration

Auto-resume requires tmux:
- Detects Claude Code panes in tmux sessions
- Captures pane output to detect "rate limited" or "blocked" state
- Injects keystrokes to resume when the limit clears

---

## Status Output

**Rate limited state:**
```
Rate Limit Status
─────────────────
  ⚠  Rate Limited

  5-hour window:  100% used (resets in 2h 34m)
  Weekly budget:  45% used

  ✓ Auto-resume daemon is running
    Your session will resume automatically when the limit clears.
```

**Not rate limited:**
```
Rate Limit Status
─────────────────
  ✓ Not rate limited

  5-hour window:  OK
  Weekly budget:  OK

  Auto-resume daemon is running (not needed when not rate limited)
  Stop with: oma wait daemon stop
```

---

## Daemon Commands

| Command | Description |
|---------|-------------|
| `oma wait` | Smart entry point — shows status, offers to start daemon |
| `oma wait status` | Detailed status of limits, daemon, and tmux |
| `oma wait daemon start` | Start daemon in background |
| `oma wait daemon start --foreground` | Run daemon in foreground (blocking) |
| `oma wait daemon start --verbose` | Verbose logging |
| `oma wait daemon start --interval 30` | Poll every 30 seconds |
| `oma wait daemon stop` | Stop the daemon |
| `oma wait detect` | Scan tmux for blocked sessions |

---

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output JSON for all commands |
| `--interval <seconds>` | Daemon poll interval (default: 60) |
| `--verbose` | Verbose daemon logging |
| `--foreground` | Run daemon in foreground (blocking) |
| `--lines <n>` | Number of tmux pane lines to capture for detection (default: 20) |

---

## TODOs

The following features are needed to implement wait in OMA:

1. **OAuth credential check** — Use `oma_wait_check_rate_limit()` via MCP or bash to fetch rate limit status from `api.anthropic.com`
2. **Rate limit MCP tool** — `oma_wait_check_status` tool that calls the Anthropic API for limit data
3. **Daemon lifecycle** — `oma_wait_daemon_start()`, `oma_wait_daemon_stop()`, `oma_wait_daemon_status()` via background processes and PID files
4. **tmux pane detection** — Bash script using `tmux list-panes` and `tmux capture-pane` to detect blocked sessions
5. **Auto-resume injection** — Script that sends keystrokes via `tmux send-keys` to resume a blocked pane
6. **Daemon state file** — Persist daemon PID and resume attempt count to `.oma/wait-daemon.json`
7. **tmux dependency** — Wait command should warn users to install tmux (`brew install tmux`) if not available

Until these are implemented, `/oma:wait` will show "Unable to check rate limits" and guide users to install dependencies.

---

## Constraints

- Rate limit monitoring requires Claude Pro/Max subscription (OAuth credentials)
- Auto-resume requires tmux to be installed
- Daemon persists across Claude Code restarts (uses PID file at `.oma/wait-daemon.pid`)
- Only resumes sessions that were previously tracked (detected via tmux pane capture)
- Daemon logs to `.oma/wait-daemon.log` (rotated at 1MB)
