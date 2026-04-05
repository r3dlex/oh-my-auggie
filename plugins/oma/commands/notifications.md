---
name: notifications
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

## /notifications

**Purpose:** Configure notification channels for OMA events (completion, errors, milestones).

**Usage:**
- `/notifications add <platform> <config>` — Add a channel
- `/notifications remove <platform>` — Remove a channel
- `/notifications list` — List configured channels
- `/notifications test <platform>` — Send test notification

**Examples:**
- `/notifications add telegram @myusername`
- `/notifications add discord #builds webhook-url`
- `/notifications add slack #alerts webhook-url`
- `/notifications list`
- `/notifications test telegram`

---

## Supported Platforms

### Telegram
```
/notifications add telegram <bot-token> <chat-id>
```

### Discord
```
/notifications add discord <webhook-url>
# Optional: /notifications add discord <webhook-url> <channel-name>
```

### Slack
```
/notifications add slack <webhook-url>
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
/notifications test telegram
# Sends test message to verify config
```

### Configure Events
```
/notifications events telegram mode-complete,error,milestone
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
