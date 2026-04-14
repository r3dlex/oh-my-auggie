// cli/commands/super-run.mjs — command launcher/injector for super-oma

import {
  readSessionArtifacts,
  resolveSessionId,
  resolveSlashCommand,
  resolveSuperOmaDir,
  runTmux,
  tmuxHasSession,
} from '../super-utils.mjs';

export async function superRun(opts = {}) {
  const omaDir = resolveSuperOmaDir(opts);
  const command = resolveSlashCommand(omaDir, opts.args || []);
  const sessionId = resolveSessionId(omaDir, opts.session);
  const artifacts = sessionId ? readSessionArtifacts(omaDir, sessionId) : { session: null, panes: null };
  const leaderPane = artifacts.panes?.panes?.find(p => p.role === 'leader');

  if (!artifacts.session?.tmux_session_name || !leaderPane?.pane_id || !tmuxHasSession(artifacts.session.tmux_session_name)) {
    process.stdout.write(`${command}\n`);
    return 0;
  }

  const result = runTmux(['send-keys', '-t', leaderPane.pane_id, command, 'C-m']);
  if (result.status !== 0) {
    process.stderr.write(result.stderr || 'super-oma run: failed to inject command\n');
    return 1;
  }
  process.stdout.write(`super-oma run: sent to ${leaderPane.pane_id}: ${command}\n`);
  return 0;
}
