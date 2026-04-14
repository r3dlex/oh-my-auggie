export const CONTRACTS_SCHEMA_VERSION: '1.0';
export const EVENT_SOURCES: readonly ['hook', 'super-oma', 'tmux', 'user'];
export const EVENT_KINDS: readonly [
  'mode_changed',
  'command_detected',
  'tool_started',
  'tool_finished',
  'worker_spawned',
  'worker_status',
  'session_started',
  'session_stopped',
  'warning',
  'error',
];

export interface SchemaValidationResult {
  ok: boolean;
  expected: string;
  actual: unknown;
  assumed: boolean;
}

export interface OmaStateContract {
  schema_version: string;
  mode: string;
  active: boolean;
  iteration?: number;
  maxIterations?: number;
  task?: string;
  [key: string]: unknown;
}

export interface WorkerStatusContract {
  schema_version: string;
  state: string;
  updated_at: string;
  current_task_id?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface SessionMetadataContract {
  schema_version: string;
  session_id: string;
  created_at: string;
  leader_pane_id?: string;
  tmux_session?: string;
  degraded?: boolean;
  [key: string]: unknown;
}

export interface PaneMetadataContract {
  pane_id: string;
  role: string;
  status?: string;
  command?: string;
  [key: string]: unknown;
}

export interface TopologyContract {
  schema_version: string;
  session_id: string;
  leader_pane_id: string;
  panes: PaneMetadataContract[];
  [key: string]: unknown;
}

export type EventSource = typeof EVENT_SOURCES[number];
export type EventKind = typeof EVENT_KINDS[number];

export interface SuperOmaEvent {
  schema_version: string;
  ts: string;
  session_id: string;
  source: EventSource;
  kind: EventKind;
  seq: number;
  mode?: string;
  command?: string;
  tool_name?: string;
  agent?: string;
  pane_id?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export interface CommandManifestEntry {
  name: string;
  description: string;
  aliases?: string[];
  modeImpact?: string;
  help?: string;
  [key: string]: unknown;
}

export interface CommandManifest {
  schema_version: string;
  generated_at: string;
  commands: CommandManifestEntry[];
}

export function validateSchemaVersion(actual: unknown, expected?: string): SchemaValidationResult;
export function isEventSource(value: unknown): value is EventSource;
export function isEventKind(value: unknown): value is EventKind;
export function parseOmaState(value: unknown): OmaStateContract;
export function parseWorkerStatus(value: unknown): WorkerStatusContract;
export function parseSessionMetadata(value: unknown): SessionMetadataContract;
export function parsePaneMetadata(value: unknown): PaneMetadataContract;
export function parseTopology(value: unknown): TopologyContract;
export function parseEventRecord(value: unknown): SuperOmaEvent;
export function parseEventLine(line: string): SuperOmaEvent;
export function parseCommandManifestEntry(value: unknown): CommandManifestEntry;
export function parseCommandManifest(value: unknown): CommandManifest;
