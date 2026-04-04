---
name: doctor
description: Diagnose and fix common issues. Use for "debug", "fix this", "what's wrong", and "doctor".
trigger: /oma:doctor
---

## Skill: doctor

Diagnose problems and prescribe solutions based on symptoms.

## When to Use

- Unexpected errors or failures
- Degraded performance
- Configuration issues
- Setup problems
- "Something is wrong"

## Diagnosis Process

### 1. Collect Symptoms
- Error messages
- Behavior observed
- When it started
- Recent changes

### 2. Identify Possible Causes
- Based on symptoms
- Known patterns
- Recent updates
- Environmental changes

### 3. Narrow Down
- Test each hypothesis
- Eliminate unlikely causes
- Gather more data

### 4. Prescribe Fix
- Root cause identified
- Solution determined
- Steps to resolve
- Prevention

## Common Diagnoses

### "Command not found"
**Possible causes:**
- PATH misconfiguration
- Installation incomplete
- Typo in command name
- Shell not reloaded

**Fix:**
```bash
# Check PATH
echo $PATH

# Verify installation
which {command}

# Reload shell
source ~/.zshrc
```

### "Permission denied"
**Possible causes:**
- File ownership wrong
- Missing execute bit
- SELinux/AppArmor
- Sandbox restrictions

**Fix:**
```bash
# Fix ownership
chown {user}:{group} {file}

# Add execute
chmod +x {file}
```

### "Module not found"
**Possible causes:**
- Not installed
- Wrong environment
- PYTHONPATH issue
- Virtual env not activated

**Fix:**
```bash
# Install if needed
pip install {module}

# Check environment
which python

# Set PYTHONPATH
export PYTHONPATH={path}
```

## Output Format

```
## Doctor: {issue}

### Symptoms Reported
- {symptom 1}
- {symptom 2}

### Diagnosis

#### Possible Causes
| Cause | Likelihood | Evidence |
|-------|------------|----------|
| {cause 1} | High | {evidence} |
| {cause 2} | Low | {evidence} |

#### Root Cause
**Identified:** {cause}
**Confidence:** {percentage}

### Prescription

#### Fix Steps
```bash
{step 1}
{step 2}
```

#### Verification
```bash
{verify command}
```

### Prevention
{how to prevent recurrence}

### Outcome
**Status:** {resolved|partial|unresolved}
**Follow-up:** {if needed}
```

## Constraints

- Collect evidence before diagnosing
- Start with common causes
- Verify fixes work
- Document solutions
- Build pattern library
