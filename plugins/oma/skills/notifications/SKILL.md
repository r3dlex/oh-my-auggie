---
name: notifications
description: Configure notification delivery. Use for "notify me", "setup notifications", "alert", and "notification config".
trigger: /oma:notifications
---

## Skill: notifications

Configure and manage notification delivery channels.

## When to Use

- Setting up alerts
- Configuring notification channels
- Managing notification preferences
- Troubleshooting missing alerts

## Notification Channels

### Telegram
- Fast delivery
- Supports markdown
- Group chats
- Bot integration

### Discord
- Webhook-based
- Rich embeds
- Channels and roles
- High volume

### Slack
- Channel-based
- App integration
- Threaded
- Enterprise friendly

### Email
- Universal
- SMTP based
- Digest options
- Fallback option

## Configuration

### Telegram Setup
```yaml
telegram:
  bot_token: {token}
  chat_id: {chat_id}
  parse_mode: markdown
```

### Discord Setup
```yaml
discord:
  webhook_url: {url}
  username: {bot_name}
  embed_color: {hex}
```

### Slack Setup
```yaml
slack:
  webhook_url: {url}
  channel: {channel}
  username: {bot_name}
```

## Notification Types

### Immediate
- Errors and failures
- Critical alerts
- Completion notifications
- Mentions and replies

### Digest
- Summary of activity
- Batch reports
- Periodic updates
- Non-urgent changes

### Escalation
- Alert escalation
- No response follow-up
- Priority boosts
- Emergency alerts

## Commands

### Configure Channel
```
/oma:notifications configure {channel}
```

### Test Notification
```
/oma:notifications test {channel}
```

### List Channels
```
/oma:notifications list
```

### Set Preferences
```
/oma:notifications set {type} {channel}
```

## Output Format

```
## Notifications: {project}

### Configured Channels
| Channel | Status | Last Test |
|---------|--------|-----------|
| Telegram | ✅ | {date} |
| Discord | ✅ | {date} |

### Notification Preferences

#### Immediate
| Event | Channel | Enabled |
|-------|---------|---------|
| Error | Telegram | ✅ |
| Complete | Discord | ✅ |

#### Digest
| Schedule | Channel | Enabled |
|---------|---------|---------|
| Daily | Email | ✅ |

### Recent Notifications
- **{time}** — {event} → {channel}

### Configuration Files
- `.oma/notifications/config.yaml`
- `.oma/notifications/templates/`
```

## Constraints

- Test after configuration
- Don't over-notify
- Respect quiet hours
- Secure sensitive tokens
- Provide unsubscribe
