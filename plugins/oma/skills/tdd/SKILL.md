---
name: tdd
description: Test-Driven Development with vertical slices and tracer bullets
triggers:
  - /oma:tdd
---

## <Do_Not_Use_When>

- **Exploratory prototyping** — When you are still discovering the problem space and requirements are unclear, writing tests first creates a moving target and wastes cycles. Explore first, then TDD once the interface stabilizes.
- **One-off automation scripts** — Scripts with no expected reuse, no downstream consumers, and no need for regression coverage. A quick one-liner in a REPL is faster and cleaner.
- **Trivial boilerplate** — Generating getters/setters, scaffolding files, or copy-paste patterns that carry no behavioral logic.
- **UI/visual refinements** — Tweaking colors, spacing, or copy where the "right behavior" is subjective and visual inspection beats assertions.
- **Learning a new API** — When experimenting with unfamiliar SDKs or frameworks, write scratch code to build intuition first. Add tests once the API shape is stable.
- **Performance optimization passes** — Before measuring, you do not know what is slow. Tests written for correctness can conflict with benchmarks. Keep them separate.

---

## <Tool_Usage>

| Tool | When to Use |
|------|-------------|
| `Bash` (test runner) | Run `npm test`, `pytest`, `go test`, or equivalent to get fast per-file feedback during RED-GREEN cycles. |
| `Write` / `Edit` | Write failing test first (RED), then write minimal production code (GREEN), then clean up (REFACTOR). |
| `mcp__plugin_oh-my-claudecode_t__lsp_diagnostics` | Catch type errors and missing imports immediately after edits. |
| `mcp__plugin_oh-my-claudecode_t__lsp_diagnostics_directory` | Run full project diagnostics before marking a cycle done. |
| `Grep` | Find existing tests for the same module before writing a new one — avoid duplication. |
| `Glob` | Locate test files matching the module under development. |

**Typical cycle:**
1. Write a failing test (RED) — `Write` to the test file.
2. Run the test runner via `Bash` to confirm the failure.
3. Write minimal code to pass (GREEN) — `Edit` the production file.
4. Run diagnostics — `mcp__plugin_oh-my-claudecode_t__lsp_diagnostics` on both files.
5. Refactor (REFACTOR) — `Edit` production code, confirm tests stay green.
6. Repeat.

---

## <Why_This_Exists>

TDD provides a tight feedback loop that keeps implementation anchored to behavior. Without it, code grows inward — implementation details proliferate, coupling increases, and tests (when written at all) fight the code instead of guiding it.

The OMC-specific variant emphasizes **vertical slices via tracer bullets** rather than horizontal layering. Horizontal TDD (write all tests for Layer A, then all for Layer B) produces integration gaps: every layer compiles in isolation but the system fails end-to-end. Vertical TDD traces one complete path from user input to data storage before moving to the next slice, delivering working software incrementally.

Deep modules are preferred because they minimize the interface surface you must test, making each test more powerful and easier to reason about. A large, well-hidden implementation behind a small interface is easier to verify, easier to refactor, and cheaper to change.

---

## <Examples>

### RED: Write a focused failing test

A test for a user-authentication module:

```typescript
// auth.test.ts
import { authenticate } from './auth';

describe('authenticate', () => {
  it('returns a session token when credentials are valid', async () => {
    const token = await authenticate({ username: 'alice', password: 'secret123' });
    expect(token).toMatch(/^[a-z0-9]{32}$/);
  });

  it('throws AuthError when password is incorrect', async () => {
    await expect(
      authenticate({ username: 'alice', password: 'wrong' })
    ).rejects.toThrow('Invalid credentials');
  });
});
```

Notice: tests describe **what** the function returns and **when** it throws — not **how** it works internally.

---

### GREEN: Write minimal code

```typescript
// auth.ts
import crypto from 'crypto';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

const VALID_CREDENTIALS = { alice: 'secret123' };

export async function authenticate({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<string> {
  const expected = VALID_CREDENTIALS[username];
  if (!expected || expected !== password) {
    throw new AuthError('Invalid credentials');
  }
  return crypto.randomBytes(16).toString('hex');
}
```

This is the **minimum** code to make both tests pass. It is not the final architecture — it is the seed. The test survives refactoring because it tests behavior, not implementation.

---

### REFACTOR: Hide complexity behind a deep module

The first green pass exposes that the credentials check and token generation are interleaved. Refactor to a deep module:

```typescript
// credentials.ts  (deep module — small interface, large hidden implementation)
const STORE = new Map<string, string>(); // currently in-memory; swap to DB later

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  const stored = STORE.get(username);
  return stored !== undefined && stored === password;
}

export async function addCredential(username: string, password: string): Promise<void> {
  // future: hash before storing
  STORE.set(username, password);
}
```

The `authenticate` function becomes a thin, shallow orchestrator that delegates to deep modules. Tests for `authenticate` do not change — they only test the public interface.

---

### Vertical Slice: User signup end-to-end

**Slice 1 — Register and retrieve a user**

```typescript
// user.test.ts
it('stores a user and retrieves them by id', async () => {
  const id = await registerUser({ username: 'bob', password: 'pw' });
  const user = await getUser(id);
  expect(user.username).toBe('bob');
});
```

Write minimal code: in-memory store, `registerUser` writes to it, `getUser` reads back.

**Slice 2 — Reject duplicate usernames**

```typescript
it('throws DuplicateError when username is already taken', async () => {
  await registerUser({ username: 'bob', password: 'pw' });
  await expect(
    registerUser({ username: 'bob', password: 'pw2' })
  ).rejects.toThrow('Duplicate username');
});
```

Add the check to the existing `registerUser` — no new classes, no abstraction layers yet.

**Slice 3 — Persist to database**

Swap the in-memory store for a real DB adapter. Tests pass unchanged because the interface is the same.

Horizontal TDD would have written all in-memory tests, then all DB tests, then all business-logic tests — producing a large integration gap before any slice works end-to-end. Vertical TDD delivered a working registration flow after Slice 1.

---

## <Escalation_And_Stop_Conditions>

### Escalate when:

- **Test is flaky or environment-dependent** — A test that passes on your machine but fails in CI is noise, not signal. Escalate to OMA architect to design a stable test fixture strategy.
- **The interface is unstable** — If the "right" public API is unclear after 3 cycles, stop. The problem definition is incomplete. Escalate to OMA analyst to refine requirements.
- **A refactor breaks many tests** — Tests that fail because implementation details changed indicate the tests are testing internals. This is a signal to re-examine what the public interface should be. Escalate before continuing.
- **You are writing tests that replicate production logic** — If your test re-implements the function under test to verify it, you are testing the wrong thing. Escalate to OMA verifier for a second opinion.

### Stop when:

- All tests in the current slice pass and `lsp_diagnostics_directory` reports zero errors.
- The per-cycle checklist (below) is satisfied.
- The vertical slice connects all layers — input, business logic, and storage — in a working path.
- Next steps require business decisions (e.g., which user flow to slice next) — those belong to OMA analyst or the user.

---

## <Per-Cycle_Checklist>

Run through these before marking a TDD cycle complete:

- [ ] **Is this test focused on a PUBLIC interface, not internals?**
  Test `authenticate(params)` — not `authenticate._tokenCache` or any private state.

- [ ] **Does the test describe BEHAVIOR, not implementation?**
  "returns a session token when credentials are valid" is behavior.
  "calls `crypto.randomBytes`" is implementation — avoid it.

- [ ] **Will this test SURVIVE refactoring?**
  If you refactor `credentials.ts` internals, does this test still pass?
  If not, the test is coupled to internals — rewrite it.

- [ ] **Is the code I wrote the MINIMAL amount to pass?**
  No early optimization. No generalized abstractions. No extra parameters.
  Write what makes the test pass, nothing more.

- [ ] **Is this slice vertical — does it span from input to storage?**
  If you only added a DB call without connecting it to the public API, the slice is incomplete.

---

## <Final_Checklist>

Before declaring a TDD skill session complete:

- [ ] All new test files exist and are committed to the repo alongside production files.
- [ ] `npm test` (or equivalent) runs green with zero failures.
- [ ] `lsp_diagnostics_directory` reports zero errors across the modified package.
- [ ] No `TODO`, `HACK`, `debugger`, or `console.log` statements remain in production or test code.
- [ ] Tracer-bullet slices are connected: at least one complete vertical path (input → logic → storage) is working and tested end-to-end.
- [ ] Tests are named for the behavior they verify, not the method they call.
- [ ] Deep modules are used for complex internals; orchestrators stay thin.
- [ ] Any new skill-worthy pattern (3+ repetitions of the same logic) is noted and escalated to OMA analyst for skill extraction.
