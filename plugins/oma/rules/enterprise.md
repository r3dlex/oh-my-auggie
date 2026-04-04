# OMA Enterprise Rules

> **Note:** Enterprise profile adds rules. It never removes or restricts community features.

## Enterprise Profile Activation

Enterprise profile is activated by setting `.oma/config.json`:

```json
{
  "profile": "enterprise",
  "enterprise": {
    "cost_management": true,
    "approval_gates": true,
    "adr_requirements": true
  }
}
```

When `profile` is `"community"` (default) or the file does not exist, only community rules apply.

## What's Added in Enterprise

### Cost-Aware Model Routing

Prefer lower-cost models for appropriate tasks:

| Agent | Community | Enterprise | Rationale |
|-------|-----------|------------|-----------|
| oma-explorer | haiku4.5 | haiku4.5 | Already optimal |
| oma-planner | claude-opus-4-6 | claude-opus-4-6 | Complex reasoning required |
| oma-executor | sonnet4.6 | sonnet4.6 | Standard implementation |
| oma-architect | claude-opus-4-6 | claude-opus-4-6 | Verification requires depth |

**Cost guidance:** When multiple models are viable, prefer the lower-cost option that meets the capability requirement.

### Approval Gates

For changes to specific files or patterns, require explicit approval:

| Change Type | Required Approval |
|-------------|------------------|
| `src/**/auth*.ts` | Security review |
| `**/config*` | DevOps approval |
| `**/migration*` | DBA approval |
| `**/secrets*` | Security + DevOps dual approval |

Approval is tracked via `.oma/approvals.json`.

### Architectural Decision Records (ADRs)

For changes that introduce new patterns or change existing architecture:

**When required:**
- New external API integration
- Database schema changes
- Authentication/authorization changes
- New service boundaries
- Significant refactoring (>20 files affected)

**Format:** See `.oma/adr/NNNN-*.md`

**ADR archive:** https://github.com/archgate/cli/blob/main/adr/

> **v0.2 note:** ADR enforcement via hooks is deferred to v0.2. In v0.1, ADRs are generated but not enforced by hooks.

## What Enterprise Does NOT Restrict

Enterprise profile is **additive only**:

- All community commands remain available
- All community agents remain available
- No tool restrictions beyond safety
- Parallel execution still enabled
- No blocking of community features

## Deferred to v0.2

The following enterprise features require hooks integration and are deferred to v0.2:

- **Hook-based ADR enforcement** — block commits that don't reference an ADR
- **Hook-based approval gates** — block execution on sensitive paths without approval
- **Cost tracking** — track spend per session, alert on threshold
- **Audit logging** — structured audit trail for compliance

## Enterprise Links

| Resource | URL |
|----------|-----|
| Augment Code | https://www.augmentcode.com |
| auggie CLI | https://www.augmentcode.com/docs/cli |
| archgate CLI | https://github.com/archgate/cli |
| archgate ADR Archive | https://github.com/archgate/cli/blob/main/adr/ |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |
