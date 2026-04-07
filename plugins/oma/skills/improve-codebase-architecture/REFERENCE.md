# improve-codebase-architecture -- Quick Reference

## 4 Dependency Categories

### 1. In-Process
Direct function calls within the same process. No network, no serialization.

```
Caller --> LocalModule
```

**Examples:** Pure utility functions, shared state objects, utility libraries.
**Testing:** Instantiate and call directly with real objects. No mocks needed.
**Key property:** Can always test with real instances -- no mocking overhead.

---

### 2. Local-Substitutable
Can swap the implementation without changing the caller. Typically achieved via an interface/abstraction layer that lives in the same process.

```
Caller --> Interface/Abstract Class --> Concrete Implementation
```

**Examples:** Repository pattern (mock repository in tests), strategy pattern, plugin systems.
**Testing:** Inject a mock or stub implementation through the interface.
**Key property:** The seam exists in-process, making substitution cheap and deterministic.

---

### 3. Remote-but-Owned
A remote dependency whose adapter you own. This is the **ports and adapters** (hexagonal architecture) pattern: the remote detail is isolated behind a local adapter that you control.

```
Caller --> Own Adapter --> Remote Service (owned contract)
```

**Examples:** A wrapper around a third-party API that you maintain, a database access layer with a defined schema you own.
**Testing:** Use a test instance of the remote service, a test container, or a mock server that you control.
**Key property:** The contract is owned by you, so you can update it and control the test environment.

---

### 4. True External
A remote dependency whose contract you do not control. Must be mocked.

```
Caller --> External Service (GitHub API, Stripe, SendGrid, etc.)
```

**Examples:** Third-party APIs, cloud services, shared databases you do not own.
**Testing:** Must mock. Real calls are slow, non-deterministic, and may have quota/cost implications.
**Key property:** You cannot run real tests against these -- mocks or test accounts are the only reliable option.

---

## GitHub Issue RFC Template

```markdown
## Problem: [what's wrong]

Describe the architectural friction in concrete terms:
- What change were you trying to make?
- Where did the code fight back?
- What is the maintenance cost of the current state?

## Proposal: [what to change]

Describe the proposed changes:
- Which modules are created, modified, or removed?
- What is the new interface surface?
- How do the four dependency categories shift as a result?

## Alternatives Considered: [other options]

List alternatives with brief tradeoffs:
- Option A: [description] -- [why rejected]
- Option B: [description] -- [why rejected]

## Consequences: [what happens if we do this]

- What becomes easier?
- What becomes harder?
- What are the migration costs?
- What tests need to be written or updated?
```

---

## Signs of Shallow vs Deep Modules

### Shallow Module Warning Signs

| Symptom | Why It Matters |
|---|---|
| Complex parameter objects (5+ fields) | Callers must construct and manage too much context |
| Many imports/exports (20+) | High coupling; changing one affects many |
| "God class" with 40+ methods | Single responsibility principle violated |
| Interface mirrors implementation | No abstraction benefit; complexity is not hidden |
| Difficult to test in isolation | Indicates hidden dependencies or tight coupling |
| Feature flags proliferate | Module is trying to be too many things |
| Circular import chains | Modules are so coupled they cannot be understood independently |

### Deep Module Signals

| Signal | Why It Matters |
|---|---|
| Small public interface (1-5 methods/properties) | Easy to reason about, easy to call |
| Rich implementation behind the interface | Complexity is managed, not exposed |
| Easy to test with simple inputs | Design is focused and cohesive |
| Hard to misuse | API guides the caller toward correct usage |
| Low import count | Focused responsibility; does not pull in unrelated concerns |
| Stable interface over time | Small surface area means fewer callers break on change |

---

## Signs of Architectural Friction

### Primary Friction Signals (direct experience during change)

- **The "find and replace" problem:** You need to make a small change but it requires editing 15+ files.
- **The hidden handshake:** A simple operation requires calling 4-5 functions in a specific sequence.
- **Context carrying:** Functions require large configuration/context objects that are hard to construct.
- **The cascade:** Changing one module breaks another, which breaks another.
- **The copy-paste solution:** When a new feature resembles an existing one, it is easier to copy code than to extend it.

### Secondary Friction Signals (observable in the codebase)

- **Import explosion:** A file imports many modules, indicating it is doing too much.
- **Feature flags as architecture:** Feature flags are used to maintain incompatible modes that should be separate modules.
- **Comment-heavy code:** When code requires many comments to explain its behavior, the abstraction is wrong.
- **Test setup overhead:** Tests require complex setup relative to what they actually verify.
- **Modularization attempts that didn't stick:** Past attempts to split a module were reverted or worked around.

### Tertiary Friction Signals (team-level indicators)

- **Onboarding friction:** New team members cannot make their first contribution without asking where things live.
- **"Nobody touches that code":** Certain modules are avoided by the team due to perceived risk.
- **Inconsistent patterns:** The same concern is handled differently in different parts of the codebase.
- **Review comments about architecture:** PR reviews repeatedly flag the same areas as problematic.
