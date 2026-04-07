/**
 * advanced-usage.ts — OMA SDK Advanced Usage Examples
 *
 * Demonstrates advanced OMA customization:
 * - Custom agent creation with bespoke system prompts
 * - MCP server configuration and tooling
 * - Custom magic keyword registration
 * - Custom tool integration and chaining
 * - Orchestration mode configuration
 *
 * Run with: npx ts-node examples/advanced-usage.ts
 */

// ---------------------------------------------------------------------------
// Mock SDK type definitions (replace with real @oma/sdk in production)
// ---------------------------------------------------------------------------

type AgentCapability =
  | 'code-edit'
  | 'read-only'
  | 'debug'
  | 'security-review'
  | 'verification'
  | 'planning'
  | 'documentation';

interface AgentConfig {
  id: string;
  name: string;
  /** Base system prompt — injected at session start */
  systemPrompt: string;
  /** Additional instructions merged into the agent's context */
  instructions?: string;
  /** Tool access whitelist (empty = all tools allowed) */
  allowedTools?: string[];
  /** Agent capability tags */
  capabilities?: AgentCapability[];
  /** Parent agent for delegation routing */
  parentAgent?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  /** Enabled tools from this server */
  enabledTools?: string[];
  /** MCP server connection timeout (ms) */
  connectTimeout?: number;
}

interface KeywordRegistration {
  pattern: string | RegExp;
  skill: string;
  weight?: number;
  description?: string;
}

interface ToolIntegrationConfig {
  /** Unique tool identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Tool executor function */
  executor: ToolExecutorFn;
  /** Pre-execution hook */
  preHook?: (ctx: ToolContext) => ToolContext | Promise<ToolContext>;
  /** Post-execution hook */
  postHook?: (ctx: ToolContext, result: unknown) => unknown | Promise<unknown>;
  /** Whether this tool requires elevated privileges */
  requiresElevation?: boolean;
}

type ToolExecutorFn = (ctx: ToolContext) => Promise<ToolResult>;
type ToolResult = { success: boolean; output?: unknown; error?: string };

interface ToolContext {
  toolId: string;
  args: Record<string, unknown>;
  sessionId: string;
  agentId: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Custom Agent Creation
// ---------------------------------------------------------------------------

/**
 * Creates a custom OMA agent with a bespoke system prompt.
 * Agents are registered with the orchestrator and become available for delegation.
 *
 * @example
 * ```typescript
 * const debuggerAgent = createCustomAgent({
 *   id: 'oma-debugger',
 *   name: 'Debugger Agent',
 *   systemPrompt: 'You are a debugging specialist. Always trace root causes.',
 *   capabilities: ['debug', 'verification'],
 * });
 * ```
 */
export function createCustomAgent(config: AgentConfig): AgentConfig {
  // Validate required fields
  if (!config.id || !config.name || !config.systemPrompt) {
    throw new Error('Agent config requires id, name, and systemPrompt');
  }

  // Inject OMA orchestration preamble into the system prompt
  const omaPreamble = [
    '--- OMA AGENT CONFIGURATION ---',
    `Agent ID: ${config.id}`,
    `Capabilities: ${(config.capabilities ?? []).join(', ') || 'general-purpose'}`,
    `Allowed tools: ${(config.allowedTools ?? ['all']).join(', ')}`,
    'You are operating within the oh-my-auggie orchestration layer.',
    'Follow delegation protocols. Escalate ambiguities to oma-architect.',
    '--- END OMA CONFIGURATION ---\n',
  ].join('\n');

  return {
    ...config,
    systemPrompt: omaPreamble + config.systemPrompt,
  };
}

/**
 * Injects dynamic system prompt fragments into an active session.
 * Used for context-aware prompt engineering (e.g., project memory, task state).
 *
 * @param agentId - Target agent to inject into
 * @param fragments - Array of prompt fragments to prepend
 */
export function injectSystemPromptFragments(
  agentId: string,
  fragments: string[],
): void {
  // Production implementation would mutate the live agent prompt buffer
  console.log(
    `[OMA] Injecting ${fragments.length} prompt fragment(s) into agent "${agentId}"`,
  );
  for (const fragment of fragments) {
    console.log(`  + "${fragment.slice(0, 80)}${fragment.length > 80 ? '...' : ''}"`);
  }
}

// ---------------------------------------------------------------------------
// MCP Server Configuration
// ---------------------------------------------------------------------------

/**
 * Creates an MCP server configuration for integration with OMA.
 * MCP servers expose tools and resources to OMA agents.
 *
 * @example
 * ```typescript
 * const githubMCP = createMCPConfig({
 *   id: 'github-mcp',
 *   name: 'GitHub',
 *   command: 'npx',
 *   args: ['-y', '@modelcontextprotocol/server-github'],
 *   env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
 *   enabledTools: ['list_issues', 'create_pull_request', 'get_file_contents'],
 * });
 * ```
 */
export function createMCPConfig(config: MCPServerConfig): MCPServerConfig {
  return {
    ...config,
    // Apply defaults
    connectTimeout: config.connectTimeout ?? 30_000,
    env: config.env ?? {},
    args: config.args ?? [],
  };
}

/**
 * Installs and validates an MCP server connection.
 * Returns true if the server is reachable and its tools are enumerated.
 */
export async function installMCPServer(config: MCPServerConfig): Promise<boolean> {
  console.log(`[OMA MCP] Installing server: ${config.name} (${config.id})`);
  console.log(`  command: ${config.command} ${(config.args ?? []).join(' ')}`);
  console.log(`  timeout: ${config.connectTimeout}ms`);
  console.log(`  tools:   ${(config.enabledTools ?? ['all']).join(', ')}`);

  // Mock validation — replace with real MCP handshake in production
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(`[OMA MCP] ${config.name} connected. Tools registered.`);
  return true;
}

// ---------------------------------------------------------------------------
// Custom Magic Keywords
// ---------------------------------------------------------------------------

/** Global keyword registry — replace with real OMA registry in production */
const keywordRegistry: KeywordRegistration[] = [];

/**
 * Registers a custom magic keyword that triggers a skill activation.
 * Keywords are matched using case-insensitive regex against incoming prompts.
 *
 * @example
 * ```typescript
 * registerMagicKeyword({
 *   pattern: /\bcode review\b/i,
 *   skill: '/oma:ultraqa',
 *   weight: 0.9,
 *   description: 'Activates QA cycling for code review tasks',
 * });
 * ```
 */
export function registerMagicKeyword(config: KeywordRegistration): void {
  if (!config.pattern || !config.skill) {
    throw new Error('Keyword registration requires pattern and skill');
  }
  keywordRegistry.push({
    weight: config.weight ?? 0.8,
    ...config,
  });
  console.log(
    `[OMA Keywords] Registered: ${config.skill} (weight=${config.weight ?? 0.8}) => "${config.pattern}"`,
  );
}

/**
 * Scans a prompt against the full keyword registry (built-in + custom).
 * Returns all matching registrations sorted by weight descending.
 */
export function scanForKeywords(prompt: string): KeywordRegistration[] {
  return keywordRegistry
    .filter((kw) => {
      const re = typeof kw.pattern === 'string' ? new RegExp(kw.pattern, 'i') : kw.pattern;
      return re.test(prompt);
    })
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
}

// ---------------------------------------------------------------------------
// Custom Tool Integration
// ---------------------------------------------------------------------------

/** Tool registry — replace with real OMA tool registry in production */
const toolRegistry = new Map<string, ToolIntegrationConfig>();

/**
 * Registers a custom tool with the OMA tool registry.
 * Tools can have pre/post hooks for validation, logging, or transformation.
 *
 * @example
 * ```typescript
 * registerTool({
 *   id: 'oma:code-scan',
 *   name: 'Static Code Scanner',
 *   requiresElevation: true,
 *   executor: async (ctx) => {
 *     const result = await runScanner(ctx.args.path);
 *     return { success: true, output: result };
 *   },
 *   preHook: (ctx) => {
 *     if (!ctx.args.path) throw new Error('path is required');
 *     return ctx;
 *   },
 * });
 * ```
 */
export function registerTool(config: ToolIntegrationConfig): void {
  if (!config.id || !config.name || !config.executor) {
    throw new Error('Tool config requires id, name, and executor');
  }
  toolRegistry.set(config.id, config);
  console.log(`[OMA Tools] Registered tool: ${config.id} ("${config.name}")`);
}

/**
 * Executes a registered tool by ID, running pre-hook, executor, then post-hook.
 */
export async function executeTool(
  toolId: string,
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = toolRegistry.get(toolId);
  if (!tool) throw new Error(`Unknown tool: ${toolId}`);

  // Run pre-hook
  let context = ctx;
  if (tool.preHook) {
    context = (await tool.preHook(ctx)) as ToolContext;
  }

  // Execute
  const result = await tool.executor(context);

  // Run post-hook
  if (tool.postHook && result.output !== undefined) {
    tool.postHook(context, result.output);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Orchestration Mode Configuration
// ---------------------------------------------------------------------------

interface OrchestrationModeConfig {
  mode: 'autopilot' | 'ralph' | 'ultrawork' | 'ultraqa' | 'ralplan';
  maxIterations?: number;
  agents?: string[];
  hooks?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Configures and activates an OMA orchestration mode.
 * Each mode has different agent coordination and iteration behavior.
 *
 * @example
 * ```typescript
 * const config = createOrchestrationConfig({
 *   mode: 'ralph',
 *   maxIterations: 50,
 *   agents: ['oma-executor', 'oma-architect'],
 *   hooks: ['enforceModelInPreToolUse', 'keywordDetect'],
 * });
 * activateMode(config);
 * ```
 */
export function createOrchestrationConfig(
  mode: OrchestrationModeConfig,
): OrchestrationModeConfig {
  const defaults: Record<string, Partial<OrchestrationModeConfig>> = {
    autopilot: { maxIterations: 10 },
    ralph: { maxIterations: 100 },
    ultrawork: { maxIterations: 5 },
    ultraqa: { maxIterations: 20 },
    ralplan: { maxIterations: 3 },
  };

  return {
    ...defaults[mode.mode],
    ...mode,
  };
}

/**
 * Activates an orchestration mode, initializing all required hooks and agents.
 */
export async function activateMode(config: OrchestrationModeConfig): Promise<void> {
  console.log(`[OMA Mode] Activating: ${config.mode}`);
  console.log(`  maxIterations: ${config.maxIterations ?? 'unlimited'}`);
  console.log(`  agents:        ${(config.agents ?? ['oma-executor']).join(', ')}`);
  console.log(`  hooks:         ${(config.hooks ?? []).join(', ') || 'default'}`);

  await new Promise((resolve) => setTimeout(resolve, 50));
  console.log(`[OMA Mode] ${config.mode} active.`);
}

// ---------------------------------------------------------------------------
// Usage Examples
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== OMA Advanced Usage Demo ===\n');

  // --- 1. Custom Agent Creation ---
  console.log('--- Custom Agent Creation ---');
  const executorAgent = createCustomAgent({
    id: 'oma-executor',
    name: 'Executor Agent',
    systemPrompt:
      'You implement code changes precisely as specified. ' +
      'You prefer the smallest viable change and verify all outcomes.',
    capabilities: ['code-edit', 'verification'],
    allowedTools: ['Edit', 'Write', 'Bash', 'Read'],
    metadata: { version: '1.0' },
  });
  console.log(`Created agent: ${executorAgent.name} (${executorAgent.id})`);
  console.log(`  capabilities: ${executorAgent.capabilities?.join(', ')}`);
  console.log(`  systemPrompt preview: "${executorAgent.systemPrompt.slice(0, 120)}..."\n`);

  // --- 2. Custom System Prompt Injection ---
  console.log('--- System Prompt Injection ---');
  injectSystemPromptFragments('oma-executor', [
    'Project directive: Always use TypeScript strict mode.',
    'Project directive: All new files must include JSDoc comments.',
  ]);
  console.log('');

  // --- 3. MCP Server Configuration ---
  console.log('--- MCP Server Configuration ---');
  const githubMCP = createMCPConfig({
    id: 'github-mcp',
    name: 'GitHub MCP Server',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? 'demo-token' },
    enabledTools: [
      'list_issues',
      'create_pull_request',
      'get_file_contents',
      'search_repositories',
    ],
    connectTimeout: 15_000,
  });
  await installMCPServer(githubMCP);
  console.log('');

  // --- 4. Custom Magic Keywords ---
  console.log('--- Custom Magic Keywords ---');
  registerMagicKeyword({
    pattern: /\b(?:full audit|strict review)\b/i,
    skill: '/oma:ultraqa',
    weight: 1.0,
    description: 'Activates QA cycling for comprehensive review tasks',
  });
  registerMagicKeyword({
    pattern: /\b(?:delegation check|model enforcement)\b/i,
    skill: '/oma:delegate-enforce',
    weight: 0.9,
    description: 'Triggers delegation enforcement and model checking',
  });

  const testPrompts = [
    'Run a full audit on the auth module',
    'Do a strict review of all API endpoints',
    'Check model enforcement on this PR',
  ];
  for (const prompt of testPrompts) {
    const matches = scanForKeywords(prompt);
    console.log(`Prompt: "${prompt}"`);
    console.log(`  Matches: ${matches.map((m) => `${m.skill}(w=${m.weight})`).join(', ') || 'none'}`);
  }
  console.log('');

  // --- 5. Custom Tool Integration ---
  console.log('--- Custom Tool Integration ---');
  registerTool({
    id: 'oma:static-analyze',
    name: 'Static Code Analyzer',
    requiresElevation: false,
    preHook: (ctx) => {
      if (!ctx.args.path) throw new Error('path argument is required');
      return ctx;
    },
    executor: async (ctx) => {
      const path = ctx.args.path as string;
      // Mock analysis — replace with real static analysis in production
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        success: true,
        output: { path, issues: 0, score: 98, timestamp: new Date().toISOString() },
      };
    },
    postHook: (_ctx, result) => {
      const analysis = result as { score: number };
      if (analysis.score < 80) {
        console.log(`  [WARNING] Low code quality score: ${analysis.score}`);
      }
    },
  });

  const toolResult = await executeTool('oma:static-analyze', {
    toolId: 'oma:static-analyze',
    args: { path: 'src/auth/login.ts' },
    sessionId: 'advanced-demo',
    agentId: 'oma-executor',
  });
  console.log(`Tool result: ${JSON.stringify(toolResult)}\n`);

  // --- 6. Orchestration Mode Configuration ---
  console.log('--- Orchestration Mode Configuration ---');
  const ralphConfig = createOrchestrationConfig({
    mode: 'ralph',
    maxIterations: 50,
    agents: ['oma-executor', 'oma-architect'],
    hooks: ['enforceModelInPreToolUse', 'keywordDetect', 'stopGate'],
  });
  await activateMode(ralphConfig);
  console.log('');

  console.log('Advanced demo complete.\n');
}

main().catch(console.error);