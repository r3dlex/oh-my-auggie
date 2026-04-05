export interface HookInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  mode?: string;
  agent?: string;
  timestamp?: string;
  content?: string;
  [key: string]: unknown;
}

export interface HookOutput {
  decision: 'allow' | 'block' | 'warn';
  reason?: string;
  systemMessage?: string;
  keywordDetected?: string;
  suggestedCommand?: string;
}

export interface OmaState {
  mode: string;
  active: boolean;
  iteration?: number;
  task?: string;
  [key: string]: unknown;
}

export type ApprovalType = 'Security' | 'DevOps' | 'DBA' | 'Security+DevOps' | '';

export interface ApprovalRecord {
  path: string;
  type: ApprovalType;
  approvedBy: string;
  approvedAt: string; // ISO 8601: "2026-04-04T12:00:00Z"
  expires?: string;   // ISO 8601; absent = never expires
}

export interface ApprovalConfig {
  approvals: ApprovalRecord[];
}

export interface CostEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: string; // ISO 8601
  estimatedCost: number;
  [key: string]: unknown;
}
