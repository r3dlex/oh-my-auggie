---
name: verify
description: Evidence-driven verification discipline — verify claims before acting
argument-hint: "<claim or statement to verify>"
trigger: /oma:verify
level: 2
---

<Purpose>
Verification discipline that requires evidence before acting on claims. Every significant assertion must be verified against fresh output before being declared true. Prevents false confidence and rework from unverified assumptions.
</Purpose>

<Use_When>
- User says "verify", "check if", "confirm", "evidence"
- A claim is made about code behavior, test results, or system state
- Before marking a story complete in ralph
- Before closing a bug as resolved
</Use_When>

<Do_Not_Use_When>
- The claim is trivially verifiable (file exists, command output is visible)
- User wants analysis, not verification (use research instead)
- The claim is about future behavior (predictions can't be verified)
</Do_Not_Use_When>

<Why_This_Exists>
"Looks good" is not verification. Many failed implementations passed because someone declared them complete without running fresh evidence. Verify requires that every claim be tested before it's accepted.
</Why_This_Exists>

<Execution_Policy>
- Every claim must cite verifiable evidence from a fresh run
- "Looks correct", "should work", "the code seems fine" are not evidence
- Run the actual command; read the actual output; cite the actual line
- Distinguish "passes locally" from "verified in CI"
</Execution_Policy>

<Steps>

## Phase 1: Parse the Claim

Extract the specific assertion to verify:

```
Claim: "<the exact statement being verified>"
```

## Phase 2: Identify Verification Method

For the claim, determine:
- **What command/operation produces evidence?**
- **What would a passing result look like?**
- **What would a failing result look like?**

## Phase 3: Execute and Collect Evidence

Run the verification command and capture output:

```bash
$ <verification command>
<actual output>
```

## Phase 4: Evaluate

```
## Verification: <claim>

**Evidence:**
<quoted relevant output>

**Verdict:** [PASS — claim confirmed | FAIL — claim disproved | UNCERTAIN — insufficient evidence]

**Explanation:** <brief interpretation of what the evidence shows>
```

## Phase 5: Report

Present the verdict with the evidence citation. If UNCERTAIN, state what additional evidence is needed.

<Tool_Usage>
- Use `Bash` to run verification commands
- Use `Read` to examine file contents as evidence
- Use `Grep` to trace code paths
- Use `mcp__plugin_oh-my-claudecode_t__lsp_diagnostics` for type-check verification
</Tool_Usage>

<Examples>
<Good>
```
## Verification: "TypeScript compiles with no errors"

**Evidence:**
$ cd plugins/oma && npx tsc --noEmit
[no output — exit code 0]

**Verdict:** PASS — claim confirmed. tsc exited with code 0, no errors in output.
```
</Good>

<Bad>
```
"TypeScript should compile since we just fixed the types."
```
Why bad: "Should" is not evidence. Run tsc and cite the actual output.
</Bad>
</Examples>

<Final_Checklist>
- [ ] Claim parsed and stated explicitly
- [ ] Verification command executed
- [ ] Actual output captured and quoted
- [ ] Verdict is evidence-based, not assumption-based
- [ ] If fail/disprove: the evidence is stated alongside the verdict
</Final_Checklist>
