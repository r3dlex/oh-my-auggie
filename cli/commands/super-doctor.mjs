// cli/commands/super-doctor.mjs — diagnostics for super-oma

import { existsSync } from 'fs';
import { join } from 'path';
import {
  hasTmux,
  loadCommandManifest,
  readRegistry,
  readSessionArtifacts,
  readSessionEvents,
  resolveSessionId,
  resolveSuperOmaDir,
  listTmuxPanes,
  readState,
} from '../super-utils.mjs';

export async function superDoctor(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const statePath = join(omaDir, 'state.json');
  const sessionId = resolveSessionId(omaDir, opts.session);
  const artifacts = sessionId ? readSessionArtifacts(omaDir, sessionId) : { session: null, panes: null, topology: null };
  const livePanes = artifacts.session?.tmux_session_name ? listTmuxPanes(artifacts.session.tmux_session_name) : [];
  const { invalidLines } = readSessionEvents(omaDir, sessionId, 20);
  const registry = readRegistry(omaDir);
  const manifest = loadCommandManifest(omaDir);
  const tmuxAvailable = hasTmux();
  const state = readState(omaDir);

  const payload = {
    ok: true,
    oma_dir: omaDir,
    tmux_available: tmuxAvailable,
    state_exists: existsSync(statePath),
    state_parsable: Object.keys(state || {}).length > 0 || existsSync(statePath),
    active_session_id: sessionId,
    registry_sessions: registry.sessions?.length || 0,
    live_panes: livePanes.length,
    invalid_event_lines: invalidLines,
    command_manifest_count: manifest.command_count || manifest.commands?.length || 0,
    session_health: artifacts.session?.health || (tmuxAvailable ? 'unknown' : 'degraded'),
  };

  if (opts.json) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return payload.state_exists ? 0 : 1;
  }

  process.stdout.write('super-oma doctor\n');
  process.stdout.write('─'.repeat(72) + '\n');
  process.stdout.write(`OMA_DIR          : ${payload.oma_dir}\n`);
  process.stdout.write(`tmux             : ${payload.tmux_available ? 'available' : 'missing'}\n`);
  process.stdout.write(`state.json       : ${payload.state_exists ? 'present' : 'missing'}\n`);
  process.stdout.write(`active session   : ${payload.active_session_id || 'none'}\n`);
  process.stdout.write(`session health   : ${payload.session_health}\n`);
  process.stdout.write(`registry sessions: ${payload.registry_sessions}\n`);
  process.stdout.write(`live panes       : ${payload.live_panes}\n`);
  process.stdout.write(`command manifest : ${payload.command_manifest_count} command(s)\n`);
  if (payload.invalid_event_lines > 0) {
    process.stdout.write(`event stream     : ${payload.invalid_event_lines} corrupt line(s) ignored\n`);
  }

  return payload.state_exists ? 0 : 1;
}
