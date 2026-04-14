import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../src/utils.js', () => ({
  resolveOmaDir: vi.fn(() => '/mock/oma'),
}));

import { buildHookEvent } from '../../../src/super-oma-events.js';

describe('super-oma-events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T00:00:00.000Z'));
    process.env.SESSION_ID = 'test-session';
    delete process.env.OMA_AGENT;
    delete process.env.TMUX_PANE;
  });

  it('builds schema-versioned hook events', () => {
    const event = buildHookEvent({
      kind: 'command_detected',
      command: '/oma:ralplan',
      status: 'detected',
      message: 'keyword=ralplan',
    });

    expect(event).toMatchObject({
      schema_version: '1.0',
      session_id: 'test-session',
      source: 'hook',
      kind: 'command_detected',
      command: '/oma:ralplan',
      status: 'detected',
      message: 'keyword=ralplan',
    });
    expect(event.seq).toBeGreaterThan(0);
  });

  it('increments sequence numbers per session', () => {
    const first = buildHookEvent({ kind: 'warning', message: 'first' });
    const second = buildHookEvent({ kind: 'warning', message: 'second' });

    expect(second.seq).toBe(first.seq + 1);
  });
});
