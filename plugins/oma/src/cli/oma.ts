#!/usr/bin/env node
// plugins/oma/src/cli/oma.ts — OMA CLI main entry point
// Ported from cli/oma.mjs + cli/super-oma.mjs (merged)

import { resolveOmaDir } from './utils.js';
import { teamSpawn, teamStatus, teamShutdown, detectStaleWorkers } from './team.js';
import { hudSnapshot, hudWatch, statuslineSnapshot, statuslineWatch } from './hud.js';
import { doctorOffline, doctorInstall, doctorCi } from './doctor.js';
import { sessionUp, sessionAttach, sessionReconcile, sessionsList, sessionsInspect, panesList, sessionStatus, type SessionOpts } from './session.js';
import { eventsTail } from './events.js';
import { runCommand } from './run.js';

// ── Version ─────────────────────────────────────────────────────────────────
const VERSION = '0.6.0'; // Will be read from package.json at runtime

// ── Help text ───────────────────────────────────────────────────────────────
const HELP = `oma — OMA CLI Companion
Usage: oma <command> [options]

Commands:
  oma version                    Print version
  oma help                       Show this help
  oma team <N> "<task>"          Spawn N background worker processes
  oma team status [--json]       Show running workers and activity
  oma team shutdown [--stale]    Stop all workers and clean up
  oma hud [--watch]              HUD: show mode, iteration, task, workers
  oma statusline [--watch]       Compact single-line status
  oma doctor [--install|--ci]    Offline diagnostics
  oma session up [--attach]      Start a new tmux session
  oma session attach             Attach to a running session
  oma sessions list [--json]     List recorded sessions
  oma sessions inspect [--watch] Inspect a session
  oma session reconcile          Reconcile session metadata
  oma panes list                 List live panes
  oma events tail [--lines <N>]  Tail events for the current session
  oma run <mode|command>         Run a mode or slash command

Global flags:
  --json   Machine-readable output
  --watch  Continuous refresh mode

Run from the same directory as the Auggie session to pick up .oma/ state files.
`;

function printHelp(): void {
  process.stdout.write(HELP + '\n');
}

// ── Argument parsing ─────────────────────────────────────────────────────────
interface ParsedArgs {
  subcommand: string | null;
  positional: string[];
  flags: Record<string, boolean | string | number>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { subcommand: null, positional: [], flags: {} };

  let i = 2; // skip argv[0] (node), argv[1] (script path)
  while (i < argv.length) {
    const tok = argv[i];
    if (tok === '--help' || tok === '-h') { printHelp(); process.exit(0); }
    if (tok.startsWith('--')) {
      const key = tok.replace(/^--/, '').replace(/-/g, '_');
      if (key === 'json') { args.flags[key] = true; i++; continue; }
      if (key === 'watch') { args.flags[key] = true; i++; continue; }
      if (key === 'force') { args.flags[key] = true; i++; continue; }
      if (key === 'stale') { args.flags[key] = true; i++; continue; }
      if (key === 'attach') { args.flags[key] = true; i++; continue; }
      if (key === 'lines' || key === 'session' || key === 'interval_ms') {
        args.flags[key] = argv[++i] || '';
        i++; continue;
      }
      if (key === 'version') { args.subcommand = 'version'; i++; continue; }
      args.positional.push(tok); i++; continue;
    }
    if (tok.includes('/') || tok.includes('\\')) { i++; continue; }
    if (!args.subcommand) { args.subcommand = tok; }
    else { args.positional.push(tok); }
    i++;
  }
  return args;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  const omaDir = resolveOmaDir();

  if (!args.subcommand || args.subcommand === 'help') { printHelp(); process.exit(0); }

  try {
    switch (args.subcommand) {
      case 'version':
        process.stdout.write(`oma v${VERSION}\n`);
        break;

      case 'team': {
        const action = args.positional[0] || 'status';
        if (action === 'status') {
          await teamStatus({ json: Boolean(args.flags.json), omaDir });
        } else if (action === 'shutdown') {
          await teamShutdown({ stale: Boolean(args.flags.stale), omaDir });
        } else {
          const N = parseInt(action, 10);
          if (isNaN(N) || N < 1) { process.stderr.write('oma team: N must be a positive integer\n'); process.exit(2); }
          const task = args.positional.slice(1).join(' ');
          if (!task) { process.stderr.write('oma team: task string required\n'); process.exit(2); }
          await teamSpawn(N, task, { force: Boolean(args.flags.force), omaDir });
        }
        break;
      }

      case 'hud':
        if (args.flags.watch) { await hudWatch(1500, { omaDir }); }
        else { await hudSnapshot({ omaDir }); }
        break;

      case 'statusline':
        if (args.flags.watch) { await statuslineWatch(1500, { omaDir }); }
        else { await statuslineSnapshot({ omaDir }); }
        break;

      case 'doctor': {
        const opts: { omaDir: string; json?: boolean } = { omaDir };
        if (args.flags.ci) { process.exit(await doctorCi(opts)); }
        else if (args.flags.install) { process.exit(await doctorInstall(opts)); }
        else { opts.json = Boolean(args.flags.json); process.exit(await doctorOffline(opts)); }
        break;
      }

      case 'session': {
        const action = args.positional[0] || 'status';
        const sopts: SessionOpts = { omaDir, json: Boolean(args.flags.json), watch: Boolean(args.flags.watch) };
        if (args.flags.session) sopts.session = String(args.flags.session);
        if (args.flags.attach) sopts.attach = true;

        switch (action) {
          case 'up': process.exit(await sessionUp(sopts));
          case 'attach': process.exit(await sessionAttach(sopts));
          case 'reconcile': process.exit(await sessionReconcile(sopts));
          case 'status': process.exit(await sessionStatus(sopts));
          default:
            process.stderr.write(`oma session: unknown action: ${action}\n`);
            process.exit(2);
        }
        break;
      }

      case 'sessions': {
        const action = args.positional[0] || 'list';
        const sopts: SessionOpts = { omaDir, json: Boolean(args.flags.json), watch: Boolean(args.flags.watch) };
        if (args.flags.session) sopts.session = String(args.flags.session);

        switch (action) {
          case 'list': process.exit(await sessionsList(sopts));
          case 'inspect': process.exit(await sessionsInspect(sopts));
          default:
            process.stderr.write(`oma sessions: unknown action: ${action}\n`);
            process.exit(2);
        }
        break;
      }

      case 'panes': {
        const action = args.positional[0] || 'list';
        const sopts: SessionOpts = { omaDir, json: Boolean(args.flags.json) };
        if (args.flags.session) sopts.session = String(args.flags.session);
        if (action === 'list') process.exit(await panesList(sopts));
        else { process.stderr.write(`oma panes: unknown action: ${action}\n`); process.exit(2); }
        break;
      }

      case 'events': {
        const action = args.positional[0] || 'tail';
        const eopts: Record<string, unknown> = { omaDir, json: Boolean(args.flags.json) };
        if (args.flags.session) (eopts as Record<string, string>).session = String(args.flags.session);
        if (args.flags.lines) (eopts as Record<string, number>).lines = Number(args.flags.lines);
        if (action === 'tail') process.exit(await eventsTail(eopts));
        else { process.stderr.write(`oma events: unknown action: ${action}\n`); process.exit(2); }
        break;
      }

      case 'run':
        process.exit(await runCommand(args.positional, { omaDir }));

      default:
        process.stderr.write(`oma: unknown command: ${args.subcommand}\n`);
        printHelp();
        process.exit(2);
    }
  } catch (err) {
    process.stderr.write(`oma: error: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

main(process.argv).catch(err => {
  process.stderr.write(`oma: fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
