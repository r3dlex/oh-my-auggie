---
name: release
description: Automated release workflow and versioning. Use for "release", "version", "publish", and "changelog".
trigger: /oma:release
---

## Skill: release

Manage release workflow from version bump to publication.

## When to Use

- Version bumps
- Release preparation
- Publishing packages
- Changelog generation
- Release announcements

## Release Process

### 1. Pre-Release Check
- All tests passing
- Build succeeds
- No blocking issues
- Version bump needed?

### 2. Version Bump
- Check current version
- Determine next version
- Apply bump
- Update files

### 3. Changelog Update
- Generate changes since last release
- Categorize entries
- Update CHANGELOG.md
- Tag significant changes

### 4. Build Artifacts
- Compile/release builds
- Generate checksums
- Sign if needed
- Package appropriately

### 5. Publish
- Push to registry
- Verify publication
- Create GitHub release
- Announce

## Version Strategy

### Semantic Versioning
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

### Cal-Ver
- Timestamp-based
- `{year}.{month}.{patch}`
- Always increasing

### Channel-based
- stable
- beta
- alpha
- dev

## Commands

### Check Version
```
/oma:release check
```

### Bump Version
```
/oma:release bump {major|minor|patch}
```

### Generate Changelog
```
/oma:release changelog
```

### Build
```
/oma:release build
```

### Publish
```
/oma:release publish
```

### Full Release
```
/oma:release run {version}
```

## Output Format

```
## Release: {version}

### Pre-Release Check
| Check | Status |
|-------|--------|
| Tests | ✅ |
| Build | ✅ |
| Blockers | ✅ |

### Version
**Previous:** {old}
**Next:** {new}
**Change:** {type}

### Changelog
```markdown
## {version} ({date})

### Added
- {feature 1}

### Changed
- {change 1}

### Fixed
- {fix 1}

### Breaking
- {breaking change}
```

### Build
**Artifacts:**
- {artifact 1}
- {artifact 2}

### Publish
| Target | Status |
|--------|--------|
| npm | ✅ |
| GitHub | ✅ |

### Announcement
{draft message}
```

## Constraints

- Test before publishing
- Don't publish broken code
- Update all version references
- Keep changelog accurate
- Announce after successful publish
