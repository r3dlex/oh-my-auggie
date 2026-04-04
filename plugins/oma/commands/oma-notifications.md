---
name: oma-notifications
description: Configure notifications — Telegram, Discord, and Slack alerts for OMA events
argument-hint: "<action> [channel]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: sonnet4.6
---

## /oma:notifications

**Purpose:** Configure notification channels for OMA events (completion, errors, milestones).

**Usage:**
- `/oma:notifications add <platform> <config>` — Add a channel
- `/oma:notifications remove <platform>` — Remove a channel
- `/oma:notifications list` — List configured channels
- `/oma:notifications test <platform>` — Send test notification

**Examples:**
- `/oma:notifications add telegram @myusername`
- `/oma:notifications add discord #builds webhook-url`
- `/oma:notifications add slack #alerts webhook-url`
- `/oma:notifications list`
- `/oma:notifications test telegram`

---

## Supported Platforms

### Telegram
```
/oma:notifications add telegram <bot-token> <chat-id>
```

### Discord
```
/oma:notifications add discord <webhook-url>
# Optional: /oma:notifications add discord <webhook-url> <channel-name>
```

### Slack
```
/oma:notifications add slack <webhook-url>
```

---

## Notification Events

Configure which events trigger notifications:

| Event | Default | Description |
|-------|---------|-------------|
| `mode-complete` | on | Task/mode completes |
| `ralph-verdict` | on | Architect verdict returned |
| `error` | on | Error occurs |
| `milestone` | on | Milestone reached |
| `session-start` | off | Session starts |

---

## Commands

### List Channels
```
OMA NOTIFICATIONS
=================
[telegram] @username — mode-complete, error
[discord] #builds — mode-complete, ralph-verdict, milestone
[slack] disabled
```

### Test Channel
```
/oma:notifications test telegram
# Sends test message to verify config
```

### Configure Events
```
/oma:notifications events telegram mode-complete,error,milestone
```

---

## Configuration

Stored in `.oma/notifications.json`:
```json
{
  "channels": {
    "telegram": {
      "token": "...",
      "chatId": "...",
      "events": ["mode-complete", "error", "milestone"]
    }
  }
}
```

### Security

- Webhook URLs never logged
- Tokens stored in env vars when possible
- Test notifications don't expose credentials

### Constraints

- Requires network access for webhooks
- Rate limits apply per platform
- Test before relying on notifications
