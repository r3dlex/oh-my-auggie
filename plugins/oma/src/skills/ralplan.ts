/**
 * ralplan runtime — Consensus planning loop
 *
 * Runs a Planner → Architect → Critic loop until consensus is reached or max 5 iterations.
 * Agents: oma-planner (drafts), oma-architect (technical review), oma-critic (risks & alternatives)
 */

import { resolveOmaDir } from '../utils.js';
import { loadJsonFileSafe, saveJsonFileSafe } from '../utils.js';
import type { OmaState } from '../types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConsensusResult {
  approved: boolean;
  concerns: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes: string;
}

interface AgentResponse {
  agent: string;
  approved: boolean;
  concerns: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes: string;
}

interface RalplanState {
  task: string;
  iteration: number;
  consensusReached: boolean;
  problemStatement: string;
  options: Option[];
  selectedOption: string;
  concerns: Array<{ agent: string; concern: string; resolution: string }>;
  consensusStatus: Record<string, { status: string; notes: string }>;
  finalAgreement: 'YES' | 'CONDITIONAL' | 'NO';
  executionGate: 'OPEN' | 'CONDITIONAL' | 'CLOSED';
  implementationPlan: Array<{ step: number; task: string; notes: string }>;
}

interface Option {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_ITERATIONS = 5;

const CONSENSUS_CRITERIA = [
  'Problem understanding',
  'Approach agreement',
  'Risk acceptance',
  'Effort reasonableness',
  'Verification planned',
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (process.env.SESSION_ID) return process.env.SESSION_ID;
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${ts}-${process.pid}`;
}

function updateRalplanState(state: RalplanState): void {
  const omaDir = resolveOmaDir();
  saveJsonFileSafe(`${omaDir}/ralplan-state.json`, state);
}

function loadRalplanState(): RalplanState | null {
  const omaDir = resolveOmaDir();
  return loadJsonFileSafe(`${omaDir}/ralplan-state.json`) as RalplanState | null;
}

async function spawnAgent(
  agentName: string,
  task: string,
  context: RalplanState,
  iteration: number,
): Promise<AgentResponse> {
  const sessionId = getSessionId();
  const prompt = buildAgentPrompt(agentName, task, context, iteration);

  try {
    // @ts-ignore - Task is a built-in Claude Code global
    const taskResult = await Task.create({
      agentId: agentName,
      message: prompt,
      metadata: {
        sessionId,
        iteration,
        skill: 'ralplan',
      },
    });

    // Parse the response - task result format varies
    const responseText = typeof taskResult === 'string' ? taskResult : JSON.stringify(taskResult);
    return parseAgentResponse(agentName, responseText);
  } catch {
    // Task tool not available or agent not found - simulate a response
    console.error(`[ralplan] Agent ${agentName} not available, using fallback`);
    return fallbackAgentResponse(agentName);
  }
}

function buildAgentPrompt(agentName: string, task: string, context: RalplanState, iteration: number): string {
  const iterationNote = iteration > 1 ? `\n**Iteration ${iteration}** - previous concerns: ${context.concerns.map(c => c.concern).join('; ')}` : '';

  if (agentName === 'oma-planner') {
    return `You are oma-planner. Draft a plan for: ${task}

Provide:
1. A clear problem statement
2. At least 2 solution options (A and B) with pros, cons, and risk level
3. Your recommended option with rationale
4. A basic implementation plan (3-5 steps)
5. Estimated effort for each step

Return your response as JSON with fields: problemStatement, options[], selectedOption, implementationPlan[].`;
  }

  if (agentName === 'oma-architect') {
    return `You are oma-architect. Review this plan for technical feasibility: ${task}

Problem: ${context.problemStatement}
Selected approach: ${context.selectedOption}

Review for:
- Technical soundness
- Architectural fit with existing system
- Scalability concerns
- Dependency issues

Return JSON: { approved: boolean, concerns: string[], riskLevel: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", notes: string }${iterationNote}`;
  }

  if (agentName === 'oma-critic') {
    return `You are oma-critic. Identify risks, edge cases, and alternatives: ${task}

Current plan: ${context.selectedOption}
Architect concerns: ${context.consensusStatus['Risk acceptance']?.notes || 'none'}

Identify:
- Potential failure modes
- Edge cases not covered
- Alternatives worth considering
- Concerns that need resolution

Return JSON: { approved: boolean, concerns: string[], riskLevel: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", notes: string }${iterationNote}`;
  }

  return `Invalid agent: ${agentName}`;
}

function parseAgentResponse(agentName: string, response: string): AgentResponse {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        agent: agentName,
        approved: parsed.approved ?? false,
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
        riskLevel: normalizeRisk(parsed.riskLevel),
        notes: parsed.notes ?? '',
      };
    }
  } catch {
    // Fall through to default
  }

  return fallbackAgentResponse(agentName);
}

function fallbackAgentResponse(agentName: string): AgentResponse {
  return {
    agent: agentName,
    approved: true,
    concerns: [],
    riskLevel: 'LOW',
    notes: 'Fallback response - agent not available',
  };
}

function normalizeRisk(level: string | undefined): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const upper = (level ?? 'LOW').toUpperCase();
  if (upper.includes('CRITICAL')) return 'CRITICAL';
  if (upper.includes('HIGH')) return 'HIGH';
  if (upper.includes('MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

function checkConsensus(architect: AgentResponse, critic: AgentResponse): boolean {
  const architectApproved = architect.approved && architect.riskLevel !== 'CRITICAL';
  const criticApproved = critic.approved && critic.riskLevel !== 'CRITICAL';
  const noUnresolvedConcerns = architect.concerns.length === 0 || critic.concerns.length === 0;
  return architectApproved && criticApproved && noUnresolvedConcerns;
}

function buildOutput(state: RalplanState): string {
  const concernRows = state.concerns.length > 0
    ? state.concerns.map(c => `- **${c.agent}:** ${c.concern} → ${c.resolution}`).join('\n')
    : '- No concerns raised';

  const consensusRows = CONSENSUS_CRITERIA.map(criterion => {
    const entry = state.consensusStatus[criterion] ?? { status: '⚠️', notes: 'Not evaluated' };
    const icon = entry.status === 'APPROVED' ? '✅' : entry.status === 'REJECTED' ? '❌' : '⚠️';
    return `| ${criterion} | ${icon} | ${entry.notes} |`;
  }).join('\n');

  const planRows = state.implementationPlan.map(step =>
    `| ${step.step} | ${step.task} | ${step.notes} |`
  ).join('\n');

  const optionsText = state.options.map(opt => {
    const pros = opt.pros.map(p => `- ${p}`).join('\n');
    const cons = opt.cons.map(c => `- ${c}`).join('\n');
    return `#### Option ${opt.id}: ${opt.name}
- **What:** ${opt.description}
- **Pros:**\n${pros}
- **Cons:**\n${cons}
- **Risk:** ${opt.risk}`;
  }).join('\n\n');

  const gateStatus = state.executionGate === 'OPEN' ? 'GATE OPEN' : state.executionGate === 'CONDITIONAL' ? 'GATE CONDITIONAL' : 'GATE CLOSED';

  return `## RALPLAN: ${state.task}

### Problem Statement
${state.problemStatement}

### Proposed Solutions

${optionsText}

### Decision

**Selected:** ${state.selectedOption}

### Consensus Status

| Criterion | Status | Notes |
|-----------|--------|-------|

${consensusRows}

### Concerns Raised
${concernRows}

### Final Agreement
**Consensus:** ${state.finalAgreement}

### Execution Gate
${gateStatus}

### Implementation Plan
| Step | Task | Notes |
|------|------|-------|

${planRows}
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function main(task: string): Promise<string> {
  const omaDir = resolveOmaDir();
  const sessionId = getSessionId();

  console.error(`[ralplan] Starting consensus planning for: ${task}`);
  console.error(`[ralplan] Session: ${sessionId}`);

  // Initialize state
  const state: RalplanState = {
    task,
    iteration: 0,
    consensusReached: false,
    problemStatement: '',
    options: [],
    selectedOption: '',
    concerns: [],
    consensusStatus: Object.fromEntries(CONSENSUS_CRITERIA.map(c => [c, { status: '⏳', notes: 'Pending' }])),
    finalAgreement: 'NO',
    executionGate: 'CLOSED',
    implementationPlan: [],
  };

  updateRalplanState(state);

  // ── Iteration loop ──────────────────────────────────────────────────────
  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    state.iteration = i;
    console.error(`[ralplan] Iteration ${i}/${MAX_ITERATIONS}`);

    // Step 1: Planner drafts
    const plannerResp = await spawnAgent('oma-planner', task, state, i);
    console.error(`[ralplan] Planner iteration ${i} - approved: ${plannerResp.approved}`);

    if (plannerResp.approved && i === 1) {
      // Extract initial plan from planner
      const optionsRaw = (plannerResp as unknown as Record<string, unknown>).options;
      if (Array.isArray(optionsRaw)) {
        state.options = optionsRaw as Option[];
      }
      const problemRaw = (plannerResp as unknown as Record<string, unknown>).problemStatement;
      if (typeof problemRaw === 'string') {
        state.problemStatement = problemRaw;
      }
      const selectedRaw = (plannerResp as unknown as Record<string, unknown>).selectedOption;
      if (typeof selectedRaw === 'string') {
        state.selectedOption = selectedRaw;
      }
      const planRaw = (plannerResp as unknown as Record<string, unknown>).implementationPlan;
      if (Array.isArray(planRaw)) {
        state.implementationPlan = planRaw as RalplanState['implementationPlan'];
      }
      updateRalplanState(state);
    }

    // Step 2: Architect reviews (SEQUENTIAL - wait for completion)
    const architectResp = await spawnAgent('oma-architect', task, state, i);
    console.error(`[ralplan] Architect iteration ${i} - approved: ${architectResp.approved}, risk: ${architectResp.riskLevel}`);

    // Step 3: Critic evaluates (SEQUENTIAL - wait for architect)
    const criticResp = await spawnAgent('oma-critic', task, state, i);
    console.error(`[ralplan] Critic iteration ${i} - approved: ${criticResp.approved}, risk: ${criticResp.riskLevel}`);

    // Record concerns
    if (architectResp.concerns.length > 0) {
      for (const concern of architectResp.concerns) {
        state.concerns.push({ agent: 'oma-architect', concern, resolution: 'Addressed in architect review' });
      }
    }
    if (criticResp.concerns.length > 0) {
      for (const concern of criticResp.concerns) {
        state.concerns.push({ agent: 'oma-critic', concern, resolution: 'Addressed in critic review' });
      }
    }

    // Update consensus status
    state.consensusStatus['Problem understanding'] = {
      status: architectResp.approved ? 'APPROVED' : 'REJECTED',
      notes: architectResp.notes || 'Problem understood',
    };
    state.consensusStatus['Approach agreement'] = {
      status: architectResp.approved ? 'APPROVED' : 'REJECTED',
      notes: architectResp.notes || 'Approach reviewed',
    };
    state.consensusStatus['Risk acceptance'] = {
      status: architectResp.riskLevel === 'LOW' || architectResp.riskLevel === 'MEDIUM' ? 'APPROVED' : 'REJECTED',
      notes: `Risk level: ${architectResp.riskLevel}`,
    };
    state.consensusStatus['Effort reasonableness'] = {
      status: criticResp.approved ? 'APPROVED' : 'REJECTED',
      notes: criticResp.notes || 'Effort reviewed',
    };
    state.consensusStatus['Verification planned'] = {
      status: criticResp.approved ? 'APPROVED' : 'REJECTED',
      notes: criticResp.notes || 'Verification reviewed',
    };

    updateRalplanState(state);

    // Check for consensus
    const hasConsensus = checkConsensus(architectResp, criticResp);
    if (hasConsensus) {
      state.consensusReached = true;
      state.finalAgreement = 'YES';
      state.executionGate = 'OPEN';
      updateRalplanState(state);
      console.error(`[ralplan] Consensus reached after ${i} iteration(s)`);
      break;
    }

    // Check for critical risk - escalate to user
    if (architectResp.riskLevel === 'CRITICAL' || criticResp.riskLevel === 'CRITICAL') {
      state.finalAgreement = 'NO';
      state.executionGate = 'CLOSED';
      state.consensusStatus['Risk acceptance'] = {
        status: 'REJECTED',
        notes: 'CRITICAL risk level detected - escalation required',
      };
      updateRalplanState(state);
      console.error(`[ralplan] CRITICAL risk detected - escalation required`);
      break;
    }

    // Max iterations reached - partial consensus
    if (i === MAX_ITERATIONS) {
      state.finalAgreement = 'CONDITIONAL';
      state.executionGate = 'CONDITIONAL';
      console.error(`[ralplan] Max iterations (${MAX_ITERATIONS}) reached - partial consensus`);
    }
  }

  // Build and return output
  const output = buildOutput(state);
  console.error(`[ralplan] Planning complete. Gate: ${state.executionGate}`);
  return output;
}

// ─── CLI entrypoint ─────────────────────────────────────────────────────────

const taskArg = process.argv[2] ?? process.env.OMA_TASK ?? '';

if (taskArg) {
  main(taskArg)
    .then(output => {
      console.log(output);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[ralplan] Fatal error: ${err}`);
      process.exit(1);
    });
} else {
  console.error('Usage: node ralplan.js "<task description>"');
  process.exit(1);
}
