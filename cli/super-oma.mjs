#!/usr/bin/env node
// cli/super-oma.mjs — combined super-oma CLI entry point

import { resolveOmaDir } from './utils.mjs';
import { loadCommandManifest } from './super-utils.mjs';
import { superDoctor } from './commands/super-doctor.mjs';
import { superEventsTail } from './commands/super-events.mjs';
import { superOmaHudSnapshot, superOmaHudWatch } from './commands/super-oma-hud.mjs';
import { superOmaStatuslineSnapshot, superOmaStatuslineWatch } from './commands/super-oma-statusline.mjs';
import { superRun } from './commands/super-run.mjs';
import { superAttach, superPanesList, superReconcile, superSessionsInspect, superSessionsList, superUp } from './commands/super-session.mjs';
import { superStatus } from './commands/super-status.mjs';

const HELP = `super-oma — tmux/session supervisor for Auggie + OMA
Usage: super-oma <command> [options]

Commands:
  super-oma up [--session <id>] [--leader-cmd <cmd>] [--attach]
  super-oma attach [--session <id>]
  super-oma status [--json] [--session <id>]
  super-oma hud [--watch] [--session <id>] [--interval <ms>]
  super-oma statusline [--watch] [--session <id>] [--interval <ms>]
  super-oma doctor [--json] [--session <id>]
  super-oma reconcile [--session <id>] [--no-inspect]
  super-oma sessions list [--json]
  super-oma sessions inspect <id> [--json]
  super-oma panes list [--json]
  super-oma events tail [--session <id>] [--lines <n>] [--json]
  super-oma commands list [--json]
  super-oma run <mode|/oma:command> [args...]
`;

function printHelp() {
  process.stdout.write(HELP + '\n');
}

function parseArgs(argv) {
  const args = {
    subcommand: null,
    positional: [],
    flags: {
      json: false,
      watch: false,
      attach: false,
      noInspect: false,
    },
    values: {},
  };

  for (let i = 1; i < argv.length; i++) {
    const tok = argv[i];
    if (tok === '--help') {
      printHelp();
      process.exit(0);
    }
    if (tok === '--json') { args.flags.json = true; continue; }
    if (tok === '--watch') { args.flags.watch = true; continue; }
    if (tok === '--attach') { args.flags.attach = true; continue; }
    if (tok === '--no-inspect') { args.flags.noInspect = true; continue; }
    if (['--session', '--leader-cmd', '--cwd', '--lines', '--hud-height', '--interval'].includes(tok)) {
      const next = argv[++i];
      if (!next) {
        process.stderr.write(`super-oma: missing value for ${tok}\n`);
        process.exit(2);
      }
      args.values[tok.slice(2).replace(/-/g, '_')] = next;
      continue;
    }
    if (!args.subcommand) {
      if (tok.includes('/') || tok.includes('\\')) continue;
      args.subcommand = tok;
      continue;
    }
    args.positional.push(tok);
  }

  return args;
}

async function superCommandsList(opts = {}) {
  const manifest = loadCommandManifest(opts.omaDir || resolveOmaDir());
  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: true, commands: manifest.commands }, null, 2) + '\n');
    return 0;
  }
  for (const command of manifest.commands) {
    const aliases = Array.isArray(command.aliases) && command.aliases.length > 0
      ? ` [${command.aliases.join(', ')}]`
      : '';
    process.stdout.write(`${command.name}${aliases} — ${command.description}\n`);
  }
  return 0;
}

async function main(argv) {
  const args = parseArgs(argv);
  if (!args.subcommand) {
    printHelp();
    return 0;
  }

  const common = {
    omaDir: resolveOmaDir(),
    json: args.flags.json,
    session: args.values.session || null,
    lines: args.values.lines ? Number(args.values.lines) : undefined,
    hudHeight: args.values.hud_height ? Number(args.values.hud_height) : undefined,
    leaderCommand: args.values.leader_cmd || null,
    cwd: args.values.cwd || null,
    attach: args.flags.attach,
    inspect: args.flags.noInspect ? false : undefined,
    intervalMs: args.values.interval ? Number(args.values.interval) : 1500,
    sessionId: args.values.session || null,
  };

  switch (args.subcommand) {
    case 'up':
      return superUp(common);
    case 'attach':
      return superAttach(common);
    case 'status':
      return superStatus(common);
    case 'hud':
      return args.flags.watch ? superOmaHudWatch(common.intervalMs, common) : superOmaHudSnapshot(common);
    case 'statusline':
      return args.flags.watch ? superOmaStatuslineWatch(common.intervalMs, common) : superOmaStatuslineSnapshot(common);
    case 'doctor':
      return superDoctor(common);
    case 'reconcile':
      return superReconcile(common);
    case 'sessions': {
      const action = args.positional[0] || 'list';
      if (action === 'list') return superSessionsList(common);
      if (action === 'inspect') return superSessionsInspect({ ...common, session: args.positional[1] || common.session });
      process.stderr.write(`super-oma sessions: unknown action: ${action}\n`);
      return 2;
    }
    case 'panes': {
      const action = args.positional[0] || 'list';
      if (action === 'list') return superPanesList(common);
      process.stderr.write(`super-oma panes: unknown action: ${action}\n`);
      return 2;
    }
    case 'events': {
      const action = args.positional[0] || 'tail';
      if (action === 'tail') return superEventsTail(common);
      process.stderr.write(`super-oma events: unknown action: ${action}\n`);
      return 2;
    }
    case 'commands': {
      const action = args.positional[0] || 'list';
      if (action === 'list') return superCommandsList(common);
      process.stderr.write(`super-oma commands: unknown action: ${action}\n`);
      return 2;
    }
    case 'run':
      return superRun({ ...common, args: args.positional });
    default:
      process.stderr.write(`super-oma: unknown command: ${args.subcommand}\n`);
      printHelp();
      return 2;
  }
}

main(process.argv)
  .then(code => process.exit(typeof code === 'number' ? code : 0))
  .catch(err => {
    process.stderr.write(`super-oma: error: ${err.message}\n`);
    process.exit(1);
  });
