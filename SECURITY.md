# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within oh-my-auggie, please report it responsibly.

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

- **GitHub Security Advisories**: Use the [Security Advisories](https://github.com/r3dlex/oh-my-auggie/security/advisories) page to report privately
- **Direct GitHub Issue**: If you prefer, you may also report through a private security advisory

We aim to respond within 48 hours and will provide an estimated timeline for a fix. We follow responsible disclosure practices and will credit reporters (unless you prefer to remain anonymous) in the security advisory once the issue has been resolved.

## Security Best Practices

When using oh-my-auggie, keep the following in mind:

- **State files** (`.oma/state.json`, `.oma/notepad.json`, etc.) may contain sensitive session information. Ensure your `.oma/` directory is properly excluded from version control and backups.
- **Enterprise profile** enables additional security controls such as approval gates and cost tracking. Review your `.oma/config.json` settings before deploying.
- **Hook scripts** run with the same permissions as your Claude Code session. Only install hooks from trusted sources.
