---
name: team
description: N coordinated agents on shared task list using Claude Code native teams, with git worktree isolation per executor
aliases: []
level: 4
---

# Team Skill

Spawn N coordinated agents working on a shared task list using Claude Code's native team tools. Each executor gets its own isolated git worktree to prevent file conflicts.

## Usage

```
/oh-my-claudecode:team N "task description"
/oh-my-claudecode:team "task description"
```

### Parameters

- **N** - Number of teammate executors (1-20). Defaults to auto-sizing based on task decomposition.
- **task** - High-level task to decompose and distribute among teammates.

## Architecture

```
User: "/team 3 fix all TypeScript errors"
              |
              v
      [TEAM ORCHESTRATOR (Lead)]
              |
              +-- TeamCreate("fix-ts-errors")
              |       -> lead becomes team-lead@fix-ts-errors
              |
              +-- Analyze & decompose task into subtasks
              |
              +-- For each executor:
              |   -> createExecutorWorktree(executorId, teamName, repoRoot)
              |       -> creates .omc/worktrees/{team}/{executor}/ on branch oma-team/{team}/{executor}
              |
              +-- TaskCreate x N (one per subtask)
              |       -> tasks #1, #2, #3 with dependencies
              |
              +-- TaskUpdate x N (pre-assign owners)
              |
              +-- Task(team_name="fix-ts-errors", name="executor-N") x N
              |       -> spawns teammates, each in their own worktree
              |
              +-- Monitor loop
              |
              +-- On shutdown:
                  -> cleanupTeamWorktrees(teamName, repoRoot)
                      -> removes all executor worktrees and branches
```

## Git Worktree Isolation

Each executor operates in its own git worktree at:

```
{repoRoot}/.omc/worktrees/{teamName}/{executorId}/
```

With an isolated branch:

```
oma-team/{teamName}/{executorId}
```

### Worktree Lifecycle

1. **Before spawning**: `createExecutorWorktree(executorId, teamName, repoRoot, baseBranch?)`
   - Creates worktree directory
   - Creates and checks out new branch based on `baseBranch` (default: `main`)
   - Registers worktree in `.omc/state/team-bridge/{teamName}/worktrees.json`

2. **During execution**: Executor operates exclusively in its worktree. No file conflicts with other executors.

3. **After completion**: `removeExecutorWorktree(executorId, teamName, repoRoot)`
   - Removes worktree
   - Prunes stale entries
   - Deletes executor branch

4. **Team shutdown**: `cleanupTeamWorktrees(teamName, repoRoot)`
   - Removes all executor worktrees for the team
   - Called automatically on team completion or cancellation

### Worktree Manager API

```javascript
import {
  createExecutorWorktree,
  removeExecutorWorktree,
  listWorktrees,
  cleanupTeamWorktrees,
} from './skills/team/worktree-manager.mjs';

// Create worktree for an executor
const info = await createExecutorWorktree('executor-1', 'fix-ts-errors', repoRoot, 'main');
// info.path      -> /path/to/repo/.omc/worktrees/fix-ts-errors/executor-1
// info.branch    -> oma-team/fix-ts-errors/executor-1
// info.executorId -> 'executor-1'
// info.teamName  -> 'fix-ts-errors'

// List active worktrees
const paths = listWorktrees('fix-ts-errors', repoRoot);
// ['/path/to/repo/.omc/worktrees/fix-ts-errors/executor-1', ...]

// Remove a single executor worktree
await removeExecutorWorktree('executor-1', 'fix-ts-errors', repoRoot);

// Remove all team worktrees (on team shutdown)
await cleanupTeamWorktrees('fix-ts-errors', repoRoot);
```

### Metadata Storage

Worktree metadata is persisted at:

```
.omc/state/team-bridge/{teamName}/worktrees.json
```

Format:

```json
[
  {
    "path": "/repo/.omc/worktrees/fix-ts-errors/executor-1",
    "branch": "oma-team/fix-ts-errors/executor-1",
    "executorId": "executor-1",
    "teamName": "fix-ts-errors",
    "createdAt": "2026-04-05T12:00:00.000Z"
  }
]
```

### Safety

- All paths validated against directory traversal (`..` rejection)
- Names sanitized (alphanumeric, hyphen, underscore only)
- File locking on metadata writes to prevent concurrent races
- Worktrees NOT cleaned up on individual executor shutdown (allows post-mortem inspection)
- Full team cleanup only on explicit team shutdown

## Workflow

### Phase 1: Parse Input

Extract **N** (agent count, 1-20) and **task** description.

### Phase 2: Analyze & Decompose

Break the task into N independent subtasks (file-scoped or module-scoped to avoid conflicts).

### Phase 3: Create Team

Call `TeamCreate`:

```json
{
  "team_name": "fix-ts-errors",
  "description": "Fix all TypeScript errors across the project"
}
```

Write OMC state:

```
state_write(mode="team", active=true, current_phase="team-exec", state={
  "team_name": "fix-ts-errors",
  "agent_count": 3,
  "task": "fix all TypeScript errors",
  "stage_history": "team-plan"
})
```

### Phase 4: Create Executor Worktrees

For each executor before spawning:

```javascript
import { createExecutorWorktree } from '../../skills/team/worktree-manager.mjs';

const worktreeRoot = '/path/to/repo';
for (let i = 1; i <= agentCount; i++) {
  const executorId = `executor-${i}`;
  const info = await createExecutorWorktree(executorId, teamName, worktreeRoot, 'main');
  // Pass info.path as the workingDirectory for the executor
}
```

### Phase 5: Create Tasks

Call `TaskCreate` for each subtask. Pre-assign owners via `TaskUpdate(taskId, owner)` to avoid race conditions.

### Phase 6: Spawn Executors

Spawn each executor with their assigned worktree path:

```json
{
  "subagent_type": "oh-my-claudecode:executor",
  "team_name": "fix-ts-errors",
  "name": "executor-1",
  "prompt": "<worker-preamble + assigned tasks>",
  "workingDirectory": "/repo/.omc/worktrees/fix-ts-errors/executor-1"
}
```

**Worker preamble:**

```
You are a TEAM EXECUTOR in team "{team_name}". Your name is "{executor_name}".
You are working in an isolated git worktree at {worktree_path}.
You report to the team lead ("team-lead").

== WORK PROTOCOL ==

1. CLAIM: Call TaskList to see your assigned tasks (owner = "{executor_name}").
   Pick the first task with status "pending" that is assigned to you.
   Call TaskUpdate to set status "in_progress".

2. WORK: Execute the task using your tools (Read, Write, Edit, Bash).
   Do NOT spawn sub-agents. Do NOT delegate. Work directly in your worktree.

3. COMPLETE: When done, mark the task completed:
   {"taskId": "ID", "status": "completed"}

4. REPORT: Notify the lead via SendMessage:
   {"type": "message", "recipient": "team-lead", "content": "Completed task #ID: <summary>", "summary": "Task #ID complete"}

5. NEXT: Check TaskList for more assigned tasks. If no more, notify the lead.

6. SHUTDOWN: When you receive a shutdown_request, respond with:
   {"type": "shutdown_response", "request_id": "<from the request>", "approve": true}

== RULES ==
- NEVER spawn sub-agents or use the Task tool
- NEVER run team orchestration commands
- ALWAYS use absolute file paths
- ALWAYS report progress via SendMessage to "team-lead"
```

### Phase 7: Monitor

Monitor progress via inbound `SendMessage` from executors and periodic `TaskList` polling.

### Phase 8: Completion

1. Verify all tasks completed via `TaskList`
2. Shutdown all executors via `SendMessage(shutdown_request)`
3. Call `cleanupTeamWorktrees(teamName, repoRoot)` to remove all worktrees
4. Call `TeamDelete` to clean up team resources
5. Clear OMC team state

## Error Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `git worktree add failed` | Branch/path conflict or git error | Ensure base branch exists; check for path conflicts |
| `worktree path not under repo` | Path traversal attempt | Names are sanitized; check executor ID format |
| `metadata parse error` | Corrupted worktrees.json | Delete `.omc/state/team-bridge/{team}/worktrees.json` and retry |
| `Executor shutdown failed` | Agent did not respond | Use `TeamDelete` with force to clean up |

<Do_Not_Use_When>
- Tasks require sequential reasoning where later steps depend on earlier results — use ralph instead for a single-agent persistence loop
- The task is a single-file change or one-liner — spawning a team is massive overhead
- Tasks share mutable state or the same source files — git worktree isolation prevents cross-executor coordination on the same files, but tasks that need to coordinate file changes in real-time will conflict
- The codebase is not git-initialized (worktree manager requires git)
- User has Auggie context window constraints — team mode generates more orchestration overhead than a single agent
- The task is exploratory or research-only (no concrete implementation to parallelize)
</Do_Not_Use_When>

<Tool_Usage>
- **oma-executor**: Each spawned executor works on an assigned subtask in its own git worktree. The orchestrator assigns tasks via TaskCreate/TaskUpdate before spawning.
- **oma-planner**: Use before team creation to decompose the task into N independent subtasks that can run concurrently without file conflicts
- **oma-architect**: Consult when task decomposition might introduce architectural inconsistencies across parallel work
- **oma-qa**: After team execution completes, run a final quality verification pass across all changed files
- **Direct git worktree tools**: The worktree manager API (`createExecutorWorktree`, `removeExecutorWorktree`, `cleanupTeamWorktrees`) is called by the team orchestrator itself — no executor should call these directly
</Tool_Usage>

<Why_This_Exists>
OMA orchestrates Auggie agents on real codebases. Some tasks are large enough that a single agent taking turns is too slow — e.g., "fix all TypeScript errors" across 50 files, or "audit all skills for missing sections." Team mode provides git worktree isolation so multiple oma-executor agents can work simultaneously on different files without git conflicts, while the team orchestrator handles task distribution, monitoring, and cleanup. The isolation model prevents the most common failure mode of naive parallel execution: two agents modifying the same file.
</Why_This_Exists>

<Examples>

### Good Usage

**Large-scale parallel fix:**
```
User: "/oma:team 4 fix all TypeScript errors"
OMA: [Decomposes: 4 executor worktrees, each assigned ~12 files]
OMA: [Spawns 4 oma-executor agents, each in its own worktree]
OMA: [Monitors — executor 3 reports: "Fixed 8/12 files, 4 need manual review"]
OMA: [Shutdown, cleanup]
OMA: [Result: 50 TypeScript errors fixed in parallel vs. sequential]
```

**Parallel skills audit:**
```
User: "/oma:team 3 audit all 8 skill directories"
OMA: [Decomposes: 3 executors, each auditing ~2-3 skills]
OMA: [Each executor writes findings to its own worktree output file]
OMA: [Collects: 3 audit reports]
OMA: [Integrates into single gap analysis]
```

### Bad Usage

**Sequential dependency hidden as parallel:**
```
User: "/oma:team 2 refactor auth service and update all callers"
OMA: [Executor 1: refactors auth.ts in worktree 1]
OMA: [Executor 2: tries to update callers in worktree 2 — stale API]
OMA: [Result: executor 2 either fails or produces broken code]
```
→ Should decompose as a sequential chain: refactor first (1 agent), then update callers (1 agent after refactor completes).

**Single-file change:**
```
User: "/oma:team 1 fix the typo in README"
OMA: [Spawns 1 executor in a worktree for a README typo]
OMA: [Result: massive overhead for a 1-minute task]
```
→ Use oma-executor directly.
</Examples>

<Escalation_And_Stop_Conditions>
- **Stop and report:** An executor fails to start (worktree creation error) — report the error, do not spawn further executors until resolved
- **Stop and reassign:** An executor completes its tasks and another executor's task is still pending — reassign the pending task to the free executor rather than waiting
- **Continue with partial:** One executor fails mid-task — report the failure, continue monitoring remaining executors, note which tasks were not completed
- **Escalate to user:** All executors fail or all tasks are blocked — present the situation to the user for direction
- **Hard stop on user cancel:** Call `cleanupTeamWorktrees` immediately, report partial results
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Task decomposed into N truly independent subtasks (no shared file modifications)
- [ ] Base branch confirmed to exist and be clean before creating worktrees
- [ ] All executor worktrees created successfully before spawning agents
- [ ] Each executor's worktree path passed correctly as `workingDirectory`
- [ ] Executor worker preamble includes absolute path instruction and team-lead reporting protocol
- [ ] Task list pre-assigned (owners set via TaskUpdate) before spawning to avoid race conditions
- [ ] Shutdown signals sent to all executors after TaskList shows all tasks complete
- [ ] `cleanupTeamWorktrees` called after all executors confirm shutdown
- [ ] Team state cleared (`.oma/state.json` team mode entry removed)
- [ ] TeamDelete called to clean up team resources
- [ ] Partial results preserved and reported if shutdown was early
</Final_Checklist>
