---
name: improve-codebase-architecture
description: Deep exploration and architectural improvement via organic friction detection
triggers:
  - /oma:improve-architecture
  - /oma:architect-deep
---

# improve-codebase-architecture

Deep architectural analysis of a codebase with the goal of making the system easier to change. This skill works by following friction, not by applying rigid rules.

---

## <Do_Not_Use_When>

- **You need a specific bug fixed** -- Use a targeted debugging skill instead. This skill is about structure and long-term maintainability, not fixing individual bugs.
- **The codebase is new or small (< 5 files)** -- A codebase this young has not accumulated enough friction to reveal its real problems. Wait until the system has been modified several times.
- **You need an immediate hotfix deployed** -- Architectural changes require testing and verification. If the fix is urgent, do the hotfix first and schedule the architecture work.
- **The team is in crisis mode** -- Crisis mode prioritizes shipping over quality. Do architectural work between crises, not during them.
- **You are asked to "just add a feature"** -- If the task is narrowly scoped, it should be handled directly without this skill. Only engage when there is a sense that the system is fighting back or that something is fundamentally hard.

---

## <Tool_Usage>

### Entry Points

| Trigger | When to Use |
|---|---|
| `/oma:improve-architecture` | General request to analyze and improve a codebase's structure |
| `/oma:architect-deep` | When you suspect deep architectural problems and want a thorough analysis |

### Sub-Agent Orchestration (Parallel Interface Design)

Spawn multiple sub-agents simultaneously, each with a different constraint perspective. This is the core technique for designing better module interfaces.

```
Agent A: Minimize the interface surface
  - Goal: Reduce parameters, simplify signatures
  - Ask: "What is the smallest interface that still fulfills the contract?"

Agent B: Maximize flexibility / ease of change
  - Goal: Identify where changes cascade, minimize blast radius
  - Ask: "What would I need to change to swap this dependency?"

Agent C: Optimize for the common case
  - Goal: Make the happy path effortless
  - Ask: "What does this code do most of the time, and how do we make that the default?"
```

**Workflow:**
1. Run all agents in parallel.
2. Collect proposals from each.
3. Compare interface shapes, tradeoffs, and constraints.
4. Synthesize the best aspects of each design.
5. Document the chosen approach with rationale.

### Codebase Investigation Tools

- **explore agent** -- Map the file structure and module boundaries.
- **ast_grep_search** -- Find structural patterns (e.g., functions with many parameters, large classes).
- **Grep** -- Track import/export chains to understand coupling.
- **Read** -- Deep-dive into specific modules identified as friction points.
- **lsp_workspace_symbols** -- Understand public API surfaces of modules.

### Output Format

After analysis, produce a GitHub Issue RFC using this template:

```markdown
## Problem: [what's wrong]
## Proposal: [what to change]
## Alternatives Considered: [other options]
## Consequences: [what happens if we do this]
```

---

## <Why_This_Exists>

Most codebases degrade silently. Features are added, conditions accumulate, abstractions pile on top of abstractions. Eventually, every team reaches a point where changing one thing breaks three others -- and nobody knows why.

This skill exists because **friction is a signal, not a noise**. When a developer hits resistance while trying to make a change, that resistance reveals the architecture's true shape. The goal is to listen to that friction, trace it to its root cause, and propose changes that make the system easier to work with -- not by applying external rules, but by following what the code is already telling you.

The core ideas come from John Ousterhout's *A Philosophy of Software Design*:
- **Deep modules** hide complexity behind small, focused interfaces.
- **Shallow modules** expose as much complexity as they contain -- making them cognitive burdens.
- **Organic exploration** means trusting the difficulty you encounter, rather than applying a checklist.

This skill is also a direct response to the failure mode of "architecture astronauts" -- people who design grand systems upfront without reacting to what the code actually needs. The approach here is the opposite: start from real friction and let the architecture emerge from the evidence.

---

## <Examples>

### Example 1: Detecting a Shallow Module

A team has a `UserManager` class with 47 methods. It is imported everywhere. The LSP shows it in 200+ files.

**What the friction tells you:**
- Changing any behavior in `UserManager` risks breaking many unrelated callers.
- The class has become a "god class" -- it knows too much and is depended on by too much.

**Organic response:**
- Identify cohesive subgroups of functionality within `UserManager`.
- Extract those subgroups into focused modules with narrow interfaces.
- Keep `UserManager` as a facade with a small, stable interface.

**Proposal (RFC snippet):**
```markdown
## Problem: UserManager is a shallow module with 47 methods imported by 200+ files.
  Any change to it risks cascading failures across the codebase.

## Proposal: Extract three cohesive sub-modules (AuthManager, ProfileManager, PreferencesManager)
  and replace UserManager's responsibilities with delegation to these new modules.
  Keep UserManager as a thin facade with no more than 5 public methods.

## Alternatives Considered:
  - Keep UserManager and add deprecation warnings (does not reduce coupling)
  - Create a single new class replacing UserManager (too large a change, hard to review)
```

### Example 2: Following Friction to Find a Design Problem

A developer tries to add a new log level and discovers that the logging system has 6 different configuration locations, each with different precedence rules.

**What the friction tells you:**
- Configuration is not centralized -- it has spread across layers.
- The "easy" thing (add a log level) is hard because the concern is not owned in one place.

**Organic response:**
- Map all 6 configuration sites.
- Identify which are dead, which are active, and which should be canonical.
- Propose a single configuration boundary and migrate consumers to it.

### Example 3: Parallel Interface Design

A team needs to redesign the `CacheManager` interface. Instead of one agent designing it in isolation, three agents work simultaneously:

- **Agent A (minimize surface):** Proposes a single `get(key)` / `set(key, value)` interface, with TTL as a property set once at initialization.
- **Agent B (maximize flexibility):** Proposes a strategy pattern with swappable `CacheStrategy` objects and a `CacheBackend` interface for swapping implementations.
- **Agent C (optimize common case):** Proposes an annotation-based approach where developers mark methods with `@Cacheable` and the system handles everything transparently.

**Synthesis:** Agent A's surface is too small (loses TTL control at runtime). Agent C is too magical (hard to debug). Agent B's strategy pattern is the best foundation, but the interface is tightened to 4 methods instead of 8.

### Example 4: Four Dependency Categories in Practice

When evaluating how to test a module, classify its dependencies:

| Module | Dependency | Category | Testing Strategy |
|---|---|---|---|
| `UserService` | `UserRepository` (local SQLite) | Local-substitutable | Inject a mock repository |
| `UserService` | `EmailClient` (external SendGrid) | True external | Use a test SMTP server or mock |
| `AuthService` | `SessionStore` (in-process Map) | In-process | Test directly with real instance |
| `PaymentService` | `PaymentGateway` (remote, owned adapter) | Remote-but-owned | Use a test payment gateway adapter |

---

## <Escalation_And_Stop_Conditions>

### Escalate when:

- **Architectural problem is systemic** -- If the friction you found points to a problem that would require changes across more than 30% of the codebase, escalate to a dedicated architecture review before making changes.
- **Cross-team ownership** -- If the modules involved are owned by different teams, the RFC must involve those teams. Do not propose changes that affect code you do not own.
- **Performance is a concern** -- Architectural improvements sometimes introduce indirection that affects latency. If performance constraints exist, document them in the RFC and involve a performance-conscious reviewer.
- **Database schema changes** -- Schema changes have high migration costs. Escalate schema changes to a senior architect or DBA review.

### Stop conditions (do not proceed):

- **The codebase does not have tests** -- Architectural changes without test coverage are uncontrolled experiments. Stop and escalate to establishing test infrastructure first.
- **The team disagrees on the direction** -- If stakeholders have conflicting priorities or views on the proposed changes, stop and reach consensus through structured discussion before proceeding.
- **Cost of change exceeds benefit** -- If the estimated cost of the refactor is greater than the estimated benefit (measured in future developer-hours saved), stop and document the tradeoff.
- **A better design cannot be agreed upon** -- If three parallel agents produce incompatible designs and no synthesis is possible, stop and escalate with all three proposals documented.

### Normal completion:

- A GitHub Issue RFC is filed with the problem analysis, proposal, alternatives, and consequences.
- If implementation is in scope, a follow-up task is created for the actual refactor.
- The notepad is updated with key learnings from the exploration.

---

## <Final_Checklist>

- [ ] **Friction-first**: Did you start from a real friction point (hard-to-change code, cascading breakage, unexpected coupling) rather than from a heuristic checklist?
- [ ] **Shallow module detection**: Did you identify modules whose interface complexity approaches their implementation complexity?
- [ ] **Sub-agent parallel design**: If proposing a new module interface, did you run parallel agents with different constraints? Are all three constraint perspectives represented in the proposal?
- [ ] **Deep module validation**: Does the proposed design for each new module have a small, focused interface hiding a rich implementation?
- [ ] **Dependency categorization**: Did you classify each dependency into one of the four categories (in-process, local-substitutable, remote-but-owned, true external)? Is the testing strategy appropriate for each category?
- [ ] **RFC completeness**: Does the GitHub Issue RFC include all four sections (Problem, Proposal, Alternatives Considered, Consequences)?
- [ ] **No over-engineering**: Did you avoid introducing abstractions for single-use logic? Is the change proportional to the friction it resolves?
- [ ] **Consensus tracked**: If the changes affect multiple teams, is there evidence of review or agreement from each team?
- [ ] **Notepad updated**: Are key learnings and architectural decisions appended to the notepad for future reference?
