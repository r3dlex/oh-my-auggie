# Karpathy Guidelines

## Purpose

Four engineering heuristics that apply to every task in this repository.
Think before acting. Simplify before extending. Change only what's needed.
Stop when the goal is met.

## The Four Rules

### Rule 1 — Think Before Coding

Read the issue, acceptance criteria, and relevant ADRs before writing code.
Understand the problem before reaching for a solution.

**Bad:** Opening a file and immediately adding a function because the task title
mentions it.

**Good:** Reading the task, the relevant spec, and the existing code to identify
where the change belongs, what shape it should take, and what must not break.

### Rule 2 — Simplicity First

Prefer the simplest solution that meets acceptance criteria. Do not introduce
abstractions, configuration knobs, or extensibility hooks until a concrete
second use case exists.

**Bad:**
```typescript
// Generic fetch with retry, circuit breaker, and caching — for a single
// call to an internal service that has 99.99% uptime
interface FetchConfig { retries: number; timeout: number; cacheTTL: number; }
function createFetchClient<T>(config: FetchConfig) { … }
```

**Good:**
```typescript
// Concrete function for the one case that exists today
async function fetchUser(id: string): Promise<User> { … }
// If fetchPost() is needed later and shares logic → extract then, not now.
```

### Rule 3 — Surgical Changes

Change only what the task requires. Do not refactor adjacent code, rename
variables "while you're here", or fix unrelated linting warnings in the same
commit.

### Rule 4 — Goal-Driven Execution

Keep the original task visible. Before each action, ask: "Does this directly
advance the stated goal?" Stop when the goal is met.
