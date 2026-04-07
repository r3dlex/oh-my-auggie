/**
 * basic-usage.ts — OMA SDK Basic Usage Examples
 *
 * Demonstrates core OMA functionality:
 * - Session creation and lifecycle
 * - enhancePrompt() for context injection
 * - Keyword detection and skill activation
 * - Hook integration (ad-hoc registration)
 *
 * Run with: npx ts-node examples/basic-usage.ts
 * Requires: ts-node, oma SDK (or mock implementations)
 */

// ---------------------------------------------------------------------------
// Mock SDK implementations (replace with real @oma/sdk import in production)
// ---------------------------------------------------------------------------

type HookEvent = 'preToolUse' | 'postToolUse' | 'prePromptEnhance' | 'postSessionStart';

type HookFn = (ctx: HookContext) => void | HookContext | Promise<void | HookContext>;

interface HookContext {
  sessionId: string;
  toolName?: string;
  prompt?: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

interface SessionOptions {
  id?: string;
  model?: string;
  hooks?: Partial<Record<HookEvent, HookFn>>;
  metadata?: Record<string, unknown>;
}

interface EnhancePromptOptions {
  sessionId: string;
  userPrompt: string;
  detectedKeywords?: string[];
  context?: Record<string, unknown>;
}

interface KeywordMatch {
  keyword: string;
  skill: string;
  confidence: number;
  activations: string[];
}

/**
 * Mock OMA Session class.
 * In production, replace with `new OMA.Session(options)` from the SDK.
 */
class OMASession {
  readonly id: string;
  readonly model: string;
  private hooks: Map<HookEvent, HookFn[]> = new Map();
  private metadata: Record<string, unknown>;

  constructor(options: SessionOptions = {}) {
    this.id = options.id ?? crypto.randomUUID();
    this.model = options.model ?? 'claude-sonnet-4-6';
    this.metadata = options.metadata ?? {};
    if (options.hooks) {
      for (const [event, fn] of Object.entries(options.hooks)) {
        if (fn) this.registerHook(event as HookEvent, fn);
      }
    }
  }

  /**
   * Register a lifecycle hook for a named event.
   */
  registerHook(event: HookEvent, fn: HookFn): void {
    const existing = this.hooks.get(event) ?? [];
    this.hooks.set(event, [...existing, fn]);
  }

  /**
   * Fire all registered hooks for an event, threading context through them.
   */
  private async fireHooks(event: HookEvent, ctx: HookContext): Promise<HookContext> {
    let current = { ...ctx };
    const handlers = this.hooks.get(event) ?? [];
    for (const handler of handlers) {
      const result = await handler(current);
      if (result) current = { ...current, ...result };
    }
    return current;
  }

  /**
   * Enhance a user prompt with detected keywords, context, and hook injection.
   * This is the primary entry-point for OMA prompt augmentation.
   */
  async enhancePrompt(opts: EnhancePromptOptions): Promise<string> {
    const ctx: HookContext = {
      sessionId: opts.sessionId,
      prompt: opts.userPrompt,
      metadata: opts.context ?? {},
    };

    // pre-prompt-enhance hook (allows custom injections, skill detection)
    const preCtx = await this.fireHooks('prePromptEnhance', ctx);

    const detected = detectKeywords(preCtx.prompt ?? '');
    const keywords: KeywordMatch[] = opts.detectedKeywords
      ? detected.concat(opts.detectedKeywords.map((s) => ({ keyword: s, skill: s, confidence: 1.0, activations: [s] })))
      : detected;
    const skillActivations = resolveSkills(keywords);

    let enhanced = preCtx.prompt ?? '';

    // Inject detected keyword activations
    if (skillActivations.length > 0) {
      const activationBlock = `\n\n<!-- OMA SKILL ACTIVATIONS: ${skillActivations.join(', ')} -->`;
      enhanced += activationBlock;
    }

    // Inject context metadata if present
    if (Object.keys(preCtx.metadata ?? {}).length > 0) {
      const contextBlock = `\n\n<!-- OMA CONTEXT: ${JSON.stringify(preCtx.metadata)} -->`;
      enhanced += contextBlock;
    }

    return enhanced;
  }

  /** End the session and flush any pending hook teardowns. */
  async close(): Promise<void> {
    await this.fireHooks('postSessionStart', { sessionId: this.id });
  }
}

// ---------------------------------------------------------------------------
// Keyword Detection Utilities
// ---------------------------------------------------------------------------

/**
 * Magic keywords that activate OMA orchestration skills.
 * OMA scans incoming prompts for these patterns before routing work.
 */
const MAGIC_KEYWORDS: Array<{ pattern: RegExp; skill: string; weight: number }> = [
  { pattern: /\bautopilot\b/i, skill: '/oma:autopilot', weight: 1.0 },
  { pattern: /\b(ralph|don't stop)\b/i, skill: '/oma:ralph', weight: 1.0 },
  { pattern: /\bulw\b/i, skill: '/oma:ultrawork', weight: 1.0 },
  { pattern: /\bultraqa\b/i, skill: '/oma:ultraqa', weight: 1.0 },
  { pattern: /\bralplan\b/i, skill: '/oma:ralplan', weight: 1.0 },
  { pattern: /\bdeep interview\b/i, skill: '/oma:deep-interview', weight: 0.95 },
  { pattern: /\bdeslop\b/i, skill: '/oma:deslop', weight: 1.0 },
  { pattern: /\bcanceloma\b/i, skill: '/oma:cancel', weight: 1.0 },
  { pattern: /\boma:setup\b/i, skill: '/oma:setup', weight: 1.0 },
  { pattern: /\boma:debug\b/i, skill: '/oma:debug', weight: 0.85 },
];

/**
 * Detect magic keywords in a prompt and return matched activations.
 * @param prompt - Raw user input
 * @returns Array of KeywordMatch objects sorted by confidence descending
 */
export function detectKeywords(prompt: string): KeywordMatch[] {
  const matches: KeywordMatch[] = [];

  for (const { pattern, skill, weight } of MAGIC_KEYWORDS) {
    const execResult = pattern.exec(prompt);
    if (execResult) {
      matches.push({
        keyword: execResult[0],
        skill,
        confidence: weight,
        activations: [skill],
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Resolve detected keyword matches to full skill activation commands.
 * Used by enhancePrompt() to generate the activation block.
 */
export function resolveSkills(matches: KeywordMatch[]): string[] {
  const seen = new Set<string>();
  return matches.flatMap((m) => m.activations).filter((s) => seen.has(s) ? false : (seen.add(s), true));
}

// ---------------------------------------------------------------------------
// Hook Integration Examples
// ---------------------------------------------------------------------------

/**
 * Example: Logging hook — logs every prompt before enhancement.
 * Attach via session.registerHook('prePromptEnhance', loggingHook);
 */
const loggingHook: HookFn = (ctx) => {
  console.log(`[OMA Hook: prePromptEnhance] session=${ctx.sessionId} prompt="${ctx.prompt?.slice(0, 60)}..."`);
  return ctx; // must return ctx to keep it flowing through the chain
};

/**
 * Example: Keyword augmentation hook — injects project memory context
 * when specific keywords are detected in the prompt.
 */
const projectMemoryHook: HookFn = (ctx) => {
  const prompt = ctx.prompt ?? '';
  const keywords = detectKeywords(prompt);
  if (keywords.some((k) => ['/oma:debug', '/oma:ralph'].includes(k.skill))) {
    return {
      ...ctx,
      metadata: {
        ...ctx.metadata,
        injectedContext: 'persistence-mode: ENABLED — all tool writes are deferred until architect PASS.',
      },
    };
  }
  return ctx;
};

// ---------------------------------------------------------------------------
// Usage Examples
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== OMA Basic Usage Demo ===\n');

  // --- 1. Session Creation ---
  const session = new OMASession({
    id: 'basic-demo-session',
    model: 'claude-sonnet-4-6',
    hooks: {
      prePromptEnhance: loggingHook,
      postSessionStart: projectMemoryHook,
    },
  });
  console.log(`Session created: id=${session.id}, model=${session.model}\n`);

  // --- 2. enhancePrompt() usage ---
  const prompts = [
    'Fix the authentication bug in login.ts',
    'Run the autopilot pipeline for refactoring the API layer',
    'Show me all files changed in the last commit',
  ];

  for (const prompt of prompts) {
    console.log(`Input:  "${prompt}"`);

    const keywords = detectKeywords(prompt);
    if (keywords.length > 0) {
      console.log(`Keywords detected: ${keywords.map((k) => `${k.keyword}→${k.skill}`).join(', ')}`);
    }

    const enhanced = await session.enhancePrompt({
      sessionId: session.id,
      userPrompt: prompt,
      detectedKeywords: keywords.map((k) => k.skill),
    });

    console.log(`Enhanced: ${enhanced}\n`);
  }

  // --- 3. Keyword detection standalone ---
  console.log('--- Standalone Keyword Detection ---');
  const testPrompt = "Don't stop until the tests pass — use ralph mode";
  const matches = detectKeywords(testPrompt);
  console.log(`Prompt: "${testPrompt}"`);
  console.log(`Matches: ${JSON.stringify(matches, null, 2)}\n`);

  // --- 4. Hook registration after session creation ---
  console.log('--- Dynamic Hook Registration ---');
  session.registerHook('prePromptEnhance', async (ctx) => {
    if (ctx.prompt?.toLowerCase().includes('security')) {
      return { ...ctx, metadata: { ...ctx.metadata, securityContext: 'elevated-sensitivity: true' } };
    }
    return ctx;
  });

  const securityPrompt = 'Review the security of the auth module';
  const enhancedSecurity = await session.enhancePrompt({ sessionId: session.id, userPrompt: securityPrompt });
  console.log(`Security-enhanced prompt: ${enhancedSecurity}\n`);

  // --- 5. Cleanup ---
  await session.close();
  console.log('Session closed. Demo complete.\n');
}

main().catch(console.error);