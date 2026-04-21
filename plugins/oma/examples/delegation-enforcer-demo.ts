/**
 * delegation-enforcer-demo.ts — OMA Delegation Enforcer & Model Injection Demo
 *
 * Demonstrates OMA's delegation enforcement system:
 * - Model auto-injection per agent type
 * - enforceModel() — blocks non-compliant tool usage
 * - getModelForAgent() — routing model selection
 * - enforceModelInPreToolUse hook — intercepts direct Edit/Write calls
 * - How delegation-enforce hook blocks unauthorized agent edits
 *
 * Run with: npx ts-node examples/delegation-enforcer-demo.ts
 *
 * Key concept: OMA agents are classified by role (orchestrator, executor, explorer, etc.)
 * Each role has an assigned model. The enforcer ensures only the appropriate agent
 * types can perform tool writes, preventing direct file edits from non-executor agents.
 */

// ---------------------------------------------------------------------------
// Mock SDK types (replace with real @oma/sdk in production)
// ---------------------------------------------------------------------------

type AgentRole = 'orchestrator' | 'executor' | 'explorer' | 'architect' | 'verifier' | 'qa';

interface ModelAssignment {
  role: AgentRole;
  model: string;
  /** Priority when multiple models are available (higher = preferred) */
  priority: number;
  /** Whether this role can perform direct file writes */
  canWrite: boolean;
  /** Fallback model if primary is unavailable */
  fallbackModel?: string;
}

interface EnforcerConfig {
  /** Map of agent role → model assignment */
  assignments: ModelAssignment[];
  /** Hook event to intercept (default: preToolUse) */
  hookEvent?: 'preToolUse';
  /** Whether to block writes or just warn */
  enforcement: 'block' | 'warn' | 'log';
  /** Custom override map (e.g., session-specific relaxations) */
  overrides?: Record<string, string>;
}

interface ToolCallContext {
  toolName: string;
  agentId: string;
  agentRole: AgentRole;
  model: string;
  file?: string;
  args?: Record<string, unknown>;
  sessionId: string;
}

type EnforcerResult =
  | { allowed: true; model: string }
  | { allowed: false; reason: string; suggestion?: string };

// ---------------------------------------------------------------------------
// Model Assignment Registry
// ---------------------------------------------------------------------------

/**
 * Default model assignments per agent role.
 * In production, these come from OMA configuration or project memory.
 */
const DEFAULT_ASSIGNMENTS: ModelAssignment[] = [
  { role: 'orchestrator', model: 'claude-sonnet-4-6', priority: 10, canWrite: false },
  { role: 'executor', model: 'claude-sonnet-4-6', priority: 9, canWrite: true },
  { role: 'explorer', model: 'claude-opus-4-7', priority: 7, canWrite: false },
  { role: 'architect', model: 'claude-opus-4-7', priority: 8, canWrite: false },
  { role: 'verifier', model: 'claude-sonnet-4-6', priority: 6, canWrite: false },
  { role: 'qa', model: 'claude-sonnet-4-6', priority: 5, canWrite: false },
];

/** In-memory registry — replace with persistent config in production */
const assignmentRegistry = new Map<AgentRole, ModelAssignment>(
  DEFAULT_ASSIGNMENTS.map((a) => [a.role, a]),
);

// ---------------------------------------------------------------------------
// Core Enforcer Functions
// ---------------------------------------------------------------------------

/**
 * Returns the assigned model for a given agent role.
 * Used by the orchestrator to inject the correct model into agent contexts.
 *
 * @example
 * ```typescript
 * const model = getModelForAgent('oma-executor', 'executor');
 * // Returns: 'claude-sonnet-4-6'
 * ```
 */
export function getModelForAgent(
  agentId: string,
  role: AgentRole,
): string {
  const assignment = assignmentRegistry.get(role);
  if (!assignment) {
    console.warn(`[OMA Enforcer] No model assignment for role "${role}" — using default`);
    return 'claude-sonnet-4-6';
  }

  console.log(`[OMA Enforcer] getModelForAgent("${agentId}", "${role}") => "${assignment.model}"`);
  return assignment.model;
}

/**
 * Enforces model compliance for a tool call.
 * Returns { allowed: true } if the agent's model matches its role assignment,
 * or { allowed: false, reason, suggestion } if there is a mismatch.
 *
 * This is the core enforcement function — it is called by the preToolUse hook
 * before any file-modifying tool (Edit, Write, Bash) is executed.
 *
 * @example
 * ```typescript
 * const result = enforceModel({
 *   toolName: 'Edit',
 *   agentId: 'oma-executor',
 *   agentRole: 'executor',
 *   model: 'claude-sonnet-4-6',
 *   file: 'src/utils.ts',
 *   sessionId: 'demo',
 * });
 * if (!result.allowed) throw new Error(result.reason);
 * ```
 */
export function enforceModel(ctx: ToolCallContext): EnforcerResult {
  const { toolName, agentId, agentRole, model, sessionId } = ctx;

  // Step 1: Determine if this tool requires write enforcement
  const writeTools = ['Edit', 'Write', 'Bash', 'Delete'];
  const requiresWrite = writeTools.includes(toolName);

  if (!requiresWrite) {
    return { allowed: true, model };
  }

  // Step 2: Look up the model assignment for this role
  const assignment = assignmentRegistry.get(agentRole);

  if (!assignment) {
    return {
      allowed: false,
      reason: `No model assignment found for role "${agentRole}"`,
      suggestion: 'Assign a model in OMA configuration or project memory',
    };
  }

  // Step 3: Check if this role is allowed to write
  if (!assignment.canWrite) {
    return {
      allowed: false,
      reason: `Role "${agentRole}" (agent: ${agentId}) is not permitted to perform write operations. ` +
        `Only "executor" role agents can write.`,
      suggestion: `Delegate this work to oma-executor using SendMessage or TaskCreate.`,
    };
  }

  // Step 4: Verify model compliance
  if (model !== assignment.model) {
    return {
      allowed: false,
      reason: `Model mismatch: agent "${agentId}" is using "${model}" but role "${agentRole}" ` +
        `requires "${assignment.model}"`,
      suggestion: `Route the request through oma-executor which uses the correct model.`,
    };
  }

  return { allowed: true, model: assignment.model };
}

// ---------------------------------------------------------------------------
// Pre-Tool-Use Hook Implementation
// ---------------------------------------------------------------------------

/**
 * The main pre-tool-use hook that enforces model compliance and blocks
 * unauthorized writes.
 *
 * This hook is registered at session start and fires before every tool call.
 * It checks:
 *  1. Is the tool a write tool (Edit/Write/Bash)?
 *  2. Does the calling agent have write permission for its role?
 *  3. Is the agent using the correct model?
 *
 * If any check fails, the hook throws an error, preventing the tool from running.
 */
export function enforceModelInPreToolUse(
  ctx: ToolCallContext,
  config: EnforcerConfig = { assignments: DEFAULT_ASSIGNMENTS, enforcement: 'block' },
): void {
  const { toolName, agentId, agentRole, model, file } = ctx;

  // Filter to only write tools — reads are always allowed
  const writeTools = ['Edit', 'Write', 'Bash'];
  if (!writeTools.includes(toolName)) return;

  const result = enforceModel(ctx);

  const logEntry = `[OMA Hook: enforceModelInPreToolUse] ` +
    `agent=${agentId} role=${agentRole} tool=${toolName} ` +
    `file=${file ?? 'n/a'} model=${model} => ${result.allowed ? 'ALLOWED' : 'BLOCKED'}`;

  if (config.enforcement === 'log' || config.enforcement === 'warn') {
    console.log(logEntry);
    if (!result.allowed) {
      const msg = `[OMA Enforcer] ${result.reason}`;
      if (config.enforcement === 'warn') console.warn(msg);
      else console.log(msg);
    }
    return;
  }

  // Block mode
  if (!result.allowed) {
    console.error(`${logEntry} — REASON: ${result.reason}`);
    if (result.suggestion) {
      console.error(`[OMA Enforcer] SUGGESTION: ${result.suggestion}`);
    }
    throw new Error(
      `[OMA Delegation Enforcer] Blocked: ${toolName} by ${agentId} (${agentRole}). ` +
        `Reason: ${result.reason}`,
    );
  }

  console.log(logEntry);
}

// ---------------------------------------------------------------------------
// Delegation Enforcement (blocks direct edits from non-executors)
// ---------------------------------------------------------------------------

/**
 * Demonstrates how the delegation-enforce hook works.
 *
 * The hook intercepts Edit/Write calls and checks whether the calling agent
 * is in the orchestrator's allowlist. If not, the edit is blocked and the
 * agent is instructed to delegate to oma-executor.
 *
 * @param agentId - The agent attempting the write
 * @param toolName - The tool being invoked
 * @returns true if allowed, throws if blocked
 */
export function delegationEnforceHook(
  agentId: string,
  toolName: string,
): boolean {
  const writeTools = ['Edit', 'Write'];
  if (!writeTools.includes(toolName)) return true;

  // Determine agent type from ID prefix
  const isExecutor = agentId.startsWith('oma-executor') || agentId === 'executor';
  const isOrchestrator = agentId.startsWith('oma-') && !isExecutor;

  if (isOrchestrator) {
    const msg =
      `[OMA: delegation-enforce] Agent "${agentId}" is an orchestrator agent and is not ` +
      `permitted to perform direct file edits. ` +
      `Use oma-executor to make changes. ` +
      `Call SendMessage({ to: "oma-executor", message: "...", summary: "..." }) to delegate.`;
    console.error(msg);
    throw new Error(msg);
  }

  if (!isExecutor) {
    console.warn(`[OMA: delegation-enforce] Unknown agent "${agentId}" attempting ${toolName}.`);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Model Assignment Management
// ---------------------------------------------------------------------------

/**
 * Updates the model assignment for a role.
 * Used for dynamic reconfiguration (e.g., session-specific model overrides).
 */
export function updateModelAssignment(
  role: AgentRole,
  updates: Partial<ModelAssignment>,
): void {
  const existing = assignmentRegistry.get(role);
  if (!existing) {
    throw new Error(`Cannot update unknown role: ${role}`);
  }
  const updated = { ...existing, ...updates };
  assignmentRegistry.set(role, updated);
  console.log(`[OMA Enforcer] Updated model assignment for "${role}": ${updated.model}`);
}

/**
 * Registers a new agent role with its model assignment.
 */
export function registerAgentRole(assignment: ModelAssignment): void {
  assignmentRegistry.set(assignment.role, assignment);
  console.log(
    `[OMA Enforcer] Registered role "${assignment.role}" => model="${assignment.model}" ` +
      `(canWrite=${assignment.canWrite})`,
  );
}

// ---------------------------------------------------------------------------
// Simulation: How OMA Blocks Direct Edits
// ---------------------------------------------------------------------------

/**
 * Simulates what happens when an orchestrator agent (e.g., oma-architect)
 * attempts a direct Edit call. The delegation-enforce hook blocks it.
 */
function simulateDirectEditBlocked(): void {
  console.log('\n--- Simulating: Direct Edit from Orchestrator Agent ---\n');

  const orchestratorAgent = 'oma-architect';

  console.log(`${orchestratorAgent} calling Edit(file_path="src/utils.ts", old_string="...", new_string="...")`);
  console.log('Hook: enforceModelInPreToolUse()');

  try {
    enforceModelInPreToolUse({
      toolName: 'Edit',
      agentId: orchestratorAgent,
      agentRole: 'architect',
      model: 'claude-opus-4-7',
      file: 'src/utils.ts',
      sessionId: 'demo',
    });
    console.log('Result: ALLOWED — this should not happen!');
  } catch (err) {
    console.log(`\nResult: BLOCKED\n`);
    console.log(`Error: ${(err as Error).message}\n`);
    console.log('Resolution: The orchestrator must delegate to oma-executor.');
  }
}

/**
 * Simulates a correct executor workflow: orchestrator delegates, executor writes.
 */
function simulateCorrectDelegationFlow(): void {
  console.log('\n--- Simulating: Correct Delegation Flow ---\n');

  // Step 1: Orchestrator detects a code change need
  console.log('[oma-architect] Detected: "Fix typo in src/utils.ts"');
  console.log('[oma-architect] Creating task for oma-executor...\n');

  // Step 2: Task is created for executor
  console.log('[oma-executor] Received task: Fix typo in src/utils.ts');
  console.log('[oma-executor] Model check:', getModelForAgent('oma-executor', 'executor'));

  // Step 3: Executor enforces model before writing
  const result = enforceModel({
    toolName: 'Edit',
    agentId: 'oma-executor',
    agentRole: 'executor',
    model: 'claude-sonnet-4-6',
    file: 'src/utils.ts',
    sessionId: 'demo',
  });

  console.log(`[oma-executor] enforceModel() => allowed=${result.allowed}`);
  if (result.allowed) {
    console.log('[oma-executor] Proceeding with Edit...');
    console.log('[oma-executor] Edit completed successfully.\n');
  }
}

/**
 * Simulates model override (e.g., using a more powerful model for complex tasks).
 */
function simulateModelOverride(): void {
  console.log('\n--- Simulating: Model Override for Complex Task ---\n');

  // Override executor model temporarily (e.g., for complex refactoring)
  updateModelAssignment('executor', {
    model: 'claude-opus-4-7',
    priority: 10,
  });

  console.log(`[oma-executor] Using overridden model: ${getModelForAgent('oma-executor', 'executor')}`);

  const result = enforceModel({
    toolName: 'Edit',
    agentId: 'oma-executor',
    agentRole: 'executor',
    model: 'claude-opus-4-7',
    file: 'src/api/client.ts',
    sessionId: 'demo',
  });

  console.log(`[oma-executor] enforceModel() => allowed=${result.allowed}`);

  // Restore default
  updateModelAssignment('executor', { model: 'claude-sonnet-4-6', priority: 9 });
  console.log('[oma-executor] Model assignment restored.\n');
}

// ---------------------------------------------------------------------------
// Usage Examples
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== OMA Delegation Enforcer Demo ===\n');

  // --- 1. Show all model assignments ---
  console.log('--- Current Model Assignments ---');
  for (const [role, assignment] of Array.from(assignmentRegistry.entries())) {
    console.log(
      `  ${role.padEnd(12)} | model: ${assignment.model.padEnd(20)} ` +
        `| canWrite: ${assignment.canWrite} | priority: ${assignment.priority}`,
    );
  }
  console.log('');

  // --- 2. getModelForAgent usage ---
  console.log('--- getModelForAgent() ---');
  const agents: Array<{ id: string; role: AgentRole }> = [
    { id: 'oma-orchestrator', role: 'orchestrator' },
    { id: 'oma-executor', role: 'executor' },
    { id: 'oma-architect', role: 'architect' },
    { id: 'oma-verifier', role: 'verifier' },
  ];
  for (const { id, role } of agents) {
    const model = getModelForAgent(id, role);
    const assignment = assignmentRegistry.get(role)!;
    console.log(
      `  ${id.padEnd(20)} role=${role.padEnd(14)} model=${model.padEnd(20)} ` +
        `canWrite=${assignment.canWrite}`,
    );
  }
  console.log('');

  // --- 3. enforceModel usage ---
  console.log('--- enforceModel() Examples ---\n');

  // 3a: Valid executor write
  let result = enforceModel({
    toolName: 'Edit',
    agentId: 'oma-executor',
    agentRole: 'executor',
    model: 'claude-sonnet-4-6',
    file: 'src/config.ts',
    sessionId: 'demo',
  });
  console.log(`Valid executor write: allowed=${result.allowed}`);

  // 3b: Non-write tool (always allowed)
  result = enforceModel({
    toolName: 'Read',
    agentId: 'oma-executor',
    agentRole: 'executor',
    model: 'claude-sonnet-4-6',
    sessionId: 'demo',
  });
  console.log(`Read tool (no write): allowed=${result.allowed}`);

  // 3c: Orchestrator attempting write (blocked)
  result = enforceModel({
    toolName: 'Write',
    agentId: 'oma-orchestrator',
    agentRole: 'orchestrator',
    model: 'claude-sonnet-4-6',
    file: 'src/newfile.ts',
    sessionId: 'demo',
  });
  console.log(`Orchestrator write attempt: allowed=${result.allowed}`);
  if (!result.allowed) console.log(`  reason: ${(result as { reason: string }).reason}`);
  console.log('');

  // --- 4. enforceModelInPreToolUse hook ---
  console.log('--- enforceModelInPreToolUse Hook ---\n');
  simulateDirectEditBlocked();
  simulateCorrectDelegationFlow();
  simulateModelOverride();

  // --- 5. Delegation enforce hook ---
  console.log('--- delegation-enforce Hook ---\n');
  const orchestratorAgent = 'oma-architect';
  try {
    delegationEnforceHook(orchestratorAgent, 'Edit');
    console.log('Allowed — this should not print!');
  } catch (err) {
    console.log(`Blocked: ${(err as Error).message.split('\n')[0]}\n`);
  }

  const executorAgent = 'oma-executor';
  try {
    const allowed = delegationEnforceHook(executorAgent, 'Edit');
    console.log(`Executor Edit: ${allowed ? 'Allowed' : 'Blocked'}\n`);
  } catch (err) {
    console.log(`Blocked: ${err}\n`);
  }

  console.log('Delegation Enforcer demo complete.\n');
}

main().catch(console.error);