---
name: security
description: Security rules for multi-agent OMA workflows
origin: oma-template
---

# Security Rules (OMA)

## Mandatory Pre-Commit Security Checks

Before ANY commit in orchestrated projects:
- [ ] No hardcoded secrets (API keys, tokens, passwords)
- [ ] All user inputs validated and sanitized
- [ ] SQL injection prevention (parameterized queries only)
- [ ] XSS prevention (sanitized output)
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all external endpoints
- [ ] Error messages do not leak sensitive data

## Secret Management

Never expose secrets in agent communications or logs:

```typescript
// WRONG: Log or expose secret
logger.info(`API key: ${process.env.API_KEY}`)

// CORRECT: Validate presence only
if (!process.env.SECRET_KEY) {
  throw new Error('SECRET_KEY not configured')
}
```

## Agent-to-Agent Communication

When agents communicate during orchestration:
- No credentials in task payloads
- Use token-based auth for internal APIs
- Validate all cross-agent inputs
- Log security-relevant events without sensitive data

## Security Response Protocol

If a security issue is found:
1. **STOP** — halt all agent activity immediately
2. **Escalate** — notify human via secure channel
3. **Contain** — isolate affected components
4. **Remediate** — fix CRITICAL issues before continuing
5. **Audit** — scan entire codebase for similar issues

## Audit Logging

Log all security-relevant events:
```typescript
// Log: auth success/failure, privilege escalation attempts,
// sensitive data access, config changes
logger.security({ event: 'auth_failure', reason: 'invalid_token' })
```
