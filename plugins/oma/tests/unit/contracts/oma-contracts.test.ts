import { describe, expect, it } from 'vitest';
import {
  CONTRACTS_SCHEMA_VERSION,
  parseCommandManifest,
  parseEventLine,
  parseEventRecord,
  parseOmaState,
  parseTopology,
  parseWorkerStatus,
  validateSchemaVersion,
} from '../../../../../packages/oma-contracts/index.mjs';

describe('oma-contracts', () => {
  it('accepts existing OMA state without explicit schema version', () => {
    expect(parseOmaState({ mode: 'ralph', active: true, iteration: 2, task: 'Ship contracts' })).toMatchObject({
      schema_version: CONTRACTS_SCHEMA_VERSION,
      mode: 'ralph',
      active: true,
      iteration: 2,
    });
  });

  it('validates worker status payloads', () => {
    expect(parseWorkerStatus({
      state: 'idle',
      updated_at: '2026-04-14T00:00:00.000Z',
      current_task_id: '3',
    })).toMatchObject({
      schema_version: CONTRACTS_SCHEMA_VERSION,
      state: 'idle',
      current_task_id: '3',
    });
  });

  it('parses topology payloads with pane metadata', () => {
    expect(parseTopology({
      session_id: 'session-1',
      leader_pane_id: '%1',
      panes: [{ pane_id: '%1', role: 'leader', status: 'ready' }],
    })).toMatchObject({
      schema_version: CONTRACTS_SCHEMA_VERSION,
      leader_pane_id: '%1',
      panes: [{ pane_id: '%1', role: 'leader', status: 'ready' }],
    });
  });

  it('parses event records and event lines', () => {
    const event = {
      schema_version: CONTRACTS_SCHEMA_VERSION,
      ts: '2026-04-14T00:00:00.000Z',
      session_id: 'session-1',
      source: 'hook',
      kind: 'tool_finished',
      seq: 1,
      tool_name: 'Edit',
      status: 'success',
    } as const;

    expect(parseEventRecord(event)).toMatchObject(event);
    expect(parseEventLine(JSON.stringify(event))).toMatchObject(event);
  });

  it('rejects unsupported schema versions', () => {
    expect(validateSchemaVersion('9.9').ok).toBe(false);
    expect(() => parseEventRecord({
      schema_version: '9.9',
      ts: '2026-04-14T00:00:00.000Z',
      session_id: 'session-1',
      source: 'hook',
      kind: 'warning',
      seq: 1,
    })).toThrow(/Unsupported SuperOmaEvent schema_version/);
  });

  it('parses command manifests as data-only metadata', () => {
    expect(parseCommandManifest({
      generated_at: '2026-04-14T00:00:00.000Z',
      commands: [{
        name: '/oma:status',
        description: 'Show current OMA status',
        aliases: ['status'],
        modeImpact: 'read-only',
      }],
    })).toMatchObject({
      schema_version: CONTRACTS_SCHEMA_VERSION,
      commands: [{ name: '/oma:status', aliases: ['status'] }],
    });
  });
});
