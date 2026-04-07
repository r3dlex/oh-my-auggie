---
name: ultrawork
description: Parallel execution engine for concurrent agent tasks. Use for "run in parallel", "concurrent execution", and "ultrawork".
trigger: /oma:ultrawork
---

## Skill: ultrawork

Execute multiple tasks in parallel using coordinated agent sub-processes.

## When to Use

- Multiple independent tasks that can run simultaneously
- Time-critical work requiring parallel execution
- Batch operations on separate files or modules
- When tasks have no interdependencies

## How Ultrawork Works

1. **Identify** — find tasks that can run independently
2. **Dispatch** — launch parallel execution contexts
3. **Coordinate** — manage shared resources and dependencies
4. **Collect** — gather results when complete
5. **Integrate** — combine outputs into coherent result

## Task Independence Check

Tasks are independent when:
- They don't read/write shared state
- They don't depend on each other's output
- They can run in any order
- They don't compete for resources

## Parallelization Patterns

### Embarrassingly Parallel
- Multiple files processed independently
- Multiple test suites on different modules
- Multiple documentation pages generated
- Lint/format checks on separate components

### Fan-out/Fan-in
- Main task spawns sub-tasks
- Sub-tasks run in parallel
- Results aggregated at end

## Ultrawork Modes

### `ultrawork:parallel`
Run all tasks simultaneously. Use when tasks are truly independent.

### `ultrawork:staggered`
Offset start times to prevent resource contention. Use for API rate limits.

### `ultrawork:adaptive`
Dynamic concurrency based on system load. Use for resource-intensive tasks.

## Output Format

```
## Ultrawork: {task description}

### Execution Plan
| Task | Dependencies | Est. Duration |
|------|--------------|---------------|
| {task 1} | none | {time} |
| {task 2} | none | {time} |
| {task 3} | task 1 | {time} |

### Execution
- **Mode:** {parallel|staggered|adaptive}
- **Concurrency:** {n} tasks
- **Started:** {time}

### Results
| Task | Status | Duration | Output |
|------|--------|----------|--------|
| {task 1} | ✅ | {time} | {summary} |
| {task 2} | ✅ | {time} | {summary} |

### Summary
- **Total duration:** {time}
- **Effective time:** {time} (parallel) vs {time} (sequential)
- **Speedup:** {n}x
- **Failures:** {n}
```

## Constraints

- Verify independence before parallelizing
- Set appropriate timeout per task
- Handle partial failures gracefully
- Don't over-parallelize (diminishing returns)
- Respect rate limits and quotas

<Do_Not_Use_When>
- Tasks have interdependencies or shared state that could cause race conditions
- The user explicitly wants to see sequential reasoning ("walk me through this step by step")
- A single change touches the same file across multiple parallel tasks (merge conflicts guaranteed)
- The task is I/O bound with a very low number of operations (parallel overhead exceeds serial time)
- Running in Auggie with limited context window — parallel tasks consume more tokens per round
- The user invoked `/oma:ralph` or `/oma:ultraqa` — those modes have their own coordination logic
</Do_Not_Use_When>

<Tool_Usage>
- **oma-executor**: The primary worker — ultrawork dispatches executor agents to run tasks in parallel. Each executor works in its own context with no cross-agent state sharing.
- **oma-planner**: Use before ultrawork to analyze task independence and decompose the work into non-conflicting subtasks
- **oma-architect**: Consult when tasks involve architectural decisions — ensure parallel changes don't accidentally create inconsistent design decisions
- **Direct Bash tools**: For truly trivial independent ops (e.g., linting 10 files in parallel), use Bash with background jobs directly rather than spawning agents
</Tool_Usage>

<Why_This_Exists>
OMA orchestrates Auggie agents that work on real codebases. Some tasks are genuinely parallel — lint 10 files, generate docs for 5 modules, run independent test suites. Doing these sequentially in Auggie's session model wastes time and burns context tokens. ultrawork provides the coordination pattern (identify → dispatch → coordinate → collect → integrate) so parallel execution is deliberate and safe rather than chaotic.
</Why_This_Exists>

<Examples>

### Good Usage

**Embarrassingly parallel file processing:**
```
User: "Lint all 12 TypeScript files in the src/ directory"
Agent: /oma:ultrawork
OMA: [Analyzes — all 12 files are independent]
OMA: [Dispatches 12 parallel executor tasks, one per file]
OMA: [Collects: 12/12 pass, 0 failures]
OMA: [Integrates: Summary report of all lint results]
```

**Parallel exploration before implementation:**
```
User: "Audit all 6 skill directories for missing SKILL.md sections"
OMA: [Dispatches 6 parallel explorer agents, one per skill directory]
OMA: [Collects 6 audit reports]
OMA: [Integrates into a single gap analysis]
```

### Bad Usage

**False independence — same file touched twice:**
```
User: "Refactor the auth service and update all callers"
OMA: [Ultrawork dispatches 2 parallel tasks: refactor auth + update callers]
Task 1 modifies auth.ts; Task 2 is waiting for the new API to exist
→ Race condition: Task 2 either fails or works on stale interface
```
→ Should use ralph mode: sequential refactor-then-update chain.

**Over-parallelization:**
```
User: "Echo 'hello' in 5 parallel processes"
OMA: [Spawns 5 executor agents for echo]
OMA: [Result: same as running echo once, but 5x the token cost]
```
→ Use Bash background jobs directly.
</Examples>

<Escalation_And_Stop_Conditions>
- **Stop and report:** A task in the parallel set fails — report which task failed, surface the error, stop collecting further results
- **Continue with partial:** A non-critical task fails but others succeed — report failure, continue waiting for remaining tasks
- **Stop and escalate:** A failure reveals an architectural inconsistency (e.g., two parallel tasks made conflicting design decisions) — escalate to oma-architect
- **Escalate to user:** All tasks succeed but integration fails (incompatible outputs) — present the conflict to the user for resolution
- **Hard stop:** User says "cancel" — stop all active tasks immediately, report partial results
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Task independence verified before dispatching (no shared files, no read-after-write dependencies)
- [ ] Concurrency limit set appropriately (do not spawn more agents than the task justifies)
- [ ] Each parallel task has a named output tracked in the Execution table
- [ ] Partial failures handled gracefully — remaining tasks complete even if one fails early
- [ ] Integration step produces a coherent combined result (not just raw concatenation of outputs)
- [ ] Speedup metric calculated and reported (effective time vs sequential time)
- [ ] Failed tasks reported with exact error messages, not silently dropped
- [ ] Output format matches the Ultrawork Execution table template
</Final_Checklist>
