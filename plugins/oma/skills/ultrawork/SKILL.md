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
