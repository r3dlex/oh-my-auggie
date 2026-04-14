export const CONTRACTS_SCHEMA_VERSION = '1.0';

export const EVENT_SOURCES = ['hook', 'super-oma', 'tmux', 'user'];
export const EVENT_KINDS = [
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

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function assertBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function assertNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
  return value;
}

function assertOptionalString(value, label) {
  if (value === undefined) return undefined;
  return assertString(value, label);
}

function assertOptionalBoolean(value, label) {
  if (value === undefined) return undefined;
  return assertBoolean(value, label);
}

function assertOptionalNumber(value, label) {
  if (value === undefined) return undefined;
  return assertNumber(value, label);
}

function assertOptionalStringArray(value, label) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`${label} must be an array of non-empty strings`);
  }
  return value;
}

function validateIsoTimestamp(value, label) {
  const stringValue = assertString(value, label);
  if (Number.isNaN(Date.parse(stringValue))) {
    throw new Error(`${label} must be an ISO timestamp`);
  }
  return stringValue;
}

export function validateSchemaVersion(actual, expected = CONTRACTS_SCHEMA_VERSION) {
  if (actual === undefined || actual === null || actual === '') {
    return { ok: true, expected, actual: null, assumed: true };
  }
  return {
    ok: actual === expected,
    expected,
    actual,
    assumed: false,
  };
}

export function isEventSource(value) {
  return typeof value === 'string' && EVENT_SOURCES.includes(value);
}

export function isEventKind(value) {
  return typeof value === 'string' && EVENT_KINDS.includes(value);
}

export function parseOmaState(value) {
  const input = assertObject(value, 'OmaState');
  const schemaVersion = validateSchemaVersion(input.schema_version);
  if (!schemaVersion.ok) {
    throw new Error(`Unsupported OmaState schema_version: ${schemaVersion.actual}`);
  }

  return {
    ...input,
    schema_version: typeof input.schema_version === 'string' ? input.schema_version : CONTRACTS_SCHEMA_VERSION,
    mode: assertString(input.mode, 'OmaState.mode'),
    active: assertBoolean(input.active, 'OmaState.active'),
    iteration: assertOptionalNumber(input.iteration, 'OmaState.iteration'),
    maxIterations: assertOptionalNumber(input.maxIterations, 'OmaState.maxIterations'),
    task: assertOptionalString(input.task, 'OmaState.task'),
  };
}

export function parseWorkerStatus(value) {
  const input = assertObject(value, 'WorkerStatus');
  const schemaVersion = validateSchemaVersion(input.schema_version);
  if (!schemaVersion.ok) {
    throw new Error(`Unsupported WorkerStatus schema_version: ${schemaVersion.actual}`);
  }

  return {
    ...input,
    schema_version: typeof input.schema_version === 'string' ? input.schema_version : CONTRACTS_SCHEMA_VERSION,
    state: assertString(input.state, 'WorkerStatus.state'),
    updated_at: validateIsoTimestamp(input.updated_at, 'WorkerStatus.updated_at'),
    current_task_id: assertOptionalString(input.current_task_id, 'WorkerStatus.current_task_id'),
    reason: assertOptionalString(input.reason, 'WorkerStatus.reason'),
  };
}

export function parseSessionMetadata(value) {
  const input = assertObject(value, 'SessionMetadata');
  const schemaVersion = validateSchemaVersion(input.schema_version);
  if (!schemaVersion.ok) {
    throw new Error(`Unsupported SessionMetadata schema_version: ${schemaVersion.actual}`);
  }

  return {
    ...input,
    schema_version: typeof input.schema_version === 'string' ? input.schema_version : CONTRACTS_SCHEMA_VERSION,
    session_id: assertString(input.session_id, 'SessionMetadata.session_id'),
    created_at: validateIsoTimestamp(input.created_at, 'SessionMetadata.created_at'),
    leader_pane_id: assertOptionalString(input.leader_pane_id, 'SessionMetadata.leader_pane_id'),
    tmux_session: assertOptionalString(input.tmux_session, 'SessionMetadata.tmux_session'),
    degraded: assertOptionalBoolean(input.degraded, 'SessionMetadata.degraded'),
  };
}

export function parsePaneMetadata(value) {
  const input = assertObject(value, 'PaneMetadata');
  return {
    ...input,
    pane_id: assertString(input.pane_id, 'PaneMetadata.pane_id'),
    role: assertString(input.role, 'PaneMetadata.role'),
    status: assertOptionalString(input.status, 'PaneMetadata.status'),
    command: assertOptionalString(input.command, 'PaneMetadata.command'),
  };
}

export function parseTopology(value) {
  const input = assertObject(value, 'Topology');
  const schemaVersion = validateSchemaVersion(input.schema_version);
  if (!schemaVersion.ok) {
    throw new Error(`Unsupported Topology schema_version: ${schemaVersion.actual}`);
  }
  if (!Array.isArray(input.panes)) {
    throw new Error('Topology.panes must be an array');
  }

  return {
    ...input,
    schema_version: typeof input.schema_version === 'string' ? input.schema_version : CONTRACTS_SCHEMA_VERSION,
    session_id: assertString(input.session_id, 'Topology.session_id'),
    leader_pane_id: assertString(input.leader_pane_id, 'Topology.leader_pane_id'),
    panes: input.panes.map((pane) => parsePaneMetadata(pane)),
  };
}

export function parseEventRecord(value) {
  const input = assertObject(value, 'SuperOmaEvent');
  const schemaVersion = validateSchemaVersion(input.schema_version);
  if (!schemaVersion.ok) {
    throw new Error(`Unsupported SuperOmaEvent schema_version: ${schemaVersion.actual}`);
  }
  if (!isEventSource(input.source)) {
    throw new Error(`Unsupported event source: ${String(input.source)}`);
  }
  if (!isEventKind(input.kind)) {
    throw new Error(`Unsupported event kind: ${String(input.kind)}`);
  }

  return {
    ...input,
    schema_version: typeof input.schema_version === 'string' ? input.schema_version : CONTRACTS_SCHEMA_VERSION,
    ts: validateIsoTimestamp(input.ts, 'SuperOmaEvent.ts'),
    session_id: assertString(input.session_id, 'SuperOmaEvent.session_id'),
    source: input.source,
    kind: input.kind,
    seq: assertNumber(input.seq, 'SuperOmaEvent.seq'),
    mode: assertOptionalString(input.mode, 'SuperOmaEvent.mode'),
    command: assertOptionalString(input.command, 'SuperOmaEvent.command'),
    tool_name: assertOptionalString(input.tool_name, 'SuperOmaEvent.tool_name'),
    agent: assertOptionalString(input.agent, 'SuperOmaEvent.agent'),
    pane_id: assertOptionalString(input.pane_id, 'SuperOmaEvent.pane_id'),
    status: assertOptionalString(input.status, 'SuperOmaEvent.status'),
    message: assertOptionalString(input.message, 'SuperOmaEvent.message'),
  };
}

export function parseEventLine(line) {
  const trimmed = assertString(line, 'event line').trim();
  return parseEventRecord(JSON.parse(trimmed));
}

export function parseCommandManifestEntry(value) {
  const input = assertObject(value, 'CommandManifestEntry');
  return {
    ...input,
    name: assertString(input.name, 'CommandManifestEntry.name'),
    description: assertString(input.description, 'CommandManifestEntry.description'),
    aliases: assertOptionalStringArray(input.aliases, 'CommandManifestEntry.aliases'),
    modeImpact: assertOptionalString(input.modeImpact, 'CommandManifestEntry.modeImpact'),
    help: assertOptionalString(input.help, 'CommandManifestEntry.help'),
  };
}

export function parseCommandManifest(value) {
  const input = assertObject(value, 'CommandManifest');
  const schemaVersion = validateSchemaVersion(input.schema_version);
  if (!schemaVersion.ok) {
    throw new Error(`Unsupported CommandManifest schema_version: ${schemaVersion.actual}`);
  }
  if (!Array.isArray(input.commands)) {
    throw new Error('CommandManifest.commands must be an array');
  }

  return {
    schema_version: typeof input.schema_version === 'string' ? input.schema_version : CONTRACTS_SCHEMA_VERSION,
    generated_at: validateIsoTimestamp(input.generated_at, 'CommandManifest.generated_at'),
    commands: input.commands.map((entry) => parseCommandManifestEntry(entry)),
  };
}
