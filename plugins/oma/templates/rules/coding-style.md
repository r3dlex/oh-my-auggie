---
name: coding-style
description: Coding style and quality rules for OMA agents
origin: oma-template
---

# Coding Style Rules (OMA)

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate existing state:

```typescript
// WRONG: Mutation in executor agent
function updateTask(task, status) {
  task.status = status  // MUTATION!
  return task
}

// CORRECT: Immutable update
function updateTask(task, status) {
  return { ...task, status }
}
```

## File Organization for Multi-Agent Projects

MANY SMALL FILES > FEW LARGE FILES in multi-agent codebases:
- Each agent definition file: max 300 lines
- Utility shared across agents: separate `src/utils/` files
- Agent-specific code stays within agent's scope
- 200-400 lines typical, 800 max per file

## Agent Communication Patterns

Use structured message passing between agents:

```typescript
// WRONG: Implicit coupling
executor.doSomething()

// CORRECT: Explicit task/result structure
const task = { id: '1', type: 'implement', target: 'feature-x' }
const result = await delegateTo('oma-executor', task)
```

## Error Handling in Orchestrated Flows

Errors in one agent must not crash the orchestration:

```typescript
try {
  const result = await delegateTo(agent, task)
  return result
} catch (error) {
  // Log for debugging, structured error for orchestrator
  throw new Error(`[${agent}] Task failed: ${task.type}`, { cause: error })
}
```

## Code Quality Checklist (Pre-Commit)

- [ ] No hardcoded secrets or credentials
- [ ] Immutable patterns used
- [ ] Files < 800 lines
- [ ] Functions < 50 lines
- [ ] Proper error handling with context
- [ ] No console.log (use structured logging)
- [ ] No deep nesting > 4 levels
