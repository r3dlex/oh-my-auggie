#!/usr/bin/env node
// cli/oma.mjs — OMA CLI Companion entry point (zero npm deps, ESM only)

import { resolveOmaDir } from './utils.mjs';
import { teamSpawn, teamStatus, teamShutdown, detectStaleWorkers } from './commands/team.mjs';
import { hudSnapshot, hudWatch } from './commands/hud.mjs';
import { doctorOffline, doctorInstall, doctorCi } from './commands/doctor.mjs';
import { maybeCheckAndPromptUpdate } from './update.mjs';

// ── Help text ─────────────────────────────────────────────────────────────────

const HELP = `oma — OMA CLI Companion
Usage: oma <command> [options]

Commands:
  oma team <N> "<task>" [--force]   Spawn N background worker processes
  oma team status [--json]           Show running workers and activity
  oma team shutdown [--stale]        Stop all workers and clean up
  oma hud [--watch]                  HUD: show mode, iteration, task, workers
  oma doctor [--install|--ci]        Offline diagnostics (no Auggie running)

Global flags (must precede the command):
  --json   Machine-readable output for team/status and doctor commands

Run from the same directory as the Auggie session to pick up .oma/ state files.
`;

function printHelp() {
  process.stdout.write(HELP + '\n');
}

// ── Argument parsing ────────────────────────────────────────────────────────────

/**
 * Parse raw argv into a structured command + flags object.
 * Global flags (--json, --watch, --ci, --install) can appear before or after
 * the subcommand. The first non-flag positional is the subcommand.
 */
function parseArgs(argv) {
  const args = {
    subcommand: null,
    positional: [],      // everything after the subcommand
    flags: {
      json: false,
      watch: false,
      ci: false,
      install: false,
      force: false,
      stale: false,
    }
  };

  let i = 1; // skip argv[0] (node path)
  while (i < argv.length) {
    const tok = argv[i];

    if (tok === '--') {
      args.positional.push(...argv.slice(i + 1));
      break;
    }

    if (tok.startsWith('-')) {
      // Long flags
      switch (tok) {
        case '--help':
          printHelp();
          process.exit(0);
        case '--json':
          args.flags.json = true;
          break;
        case '--watch':
          args.flags.watch = true;
          break;
        case '--ci':
          args.flags.ci = true;
          break;
        case '--install':
          args.flags.install = true;
          break;
        case '--force':
          args.flags.force = true;
          break;
        case '--stale':
          args.flags.stale = true;
          break;
        default:
          if (tok === '--') {
            // POSIX argument separator: skip, remaining tokens go to positional
            args.positional.push(...argv.slice(i + 1));
            break;
          }
          process.stderr.write(`oma: unknown flag: ${tok}\n`);
          process.exit(2);
      }
    } else if (args.subcommand === null) {
      // Skip script-path tokens Node.js puts in argv when called as
      // "node cli/oma.mjs" or "node /abs/path/cli/oma.mjs".
      // Real subcommands (team, hud, doctor) never contain path separators.
      if (tok.includes('/') || tok.includes('\\')) { i++; continue; }
      args.subcommand = tok;
    } else {
      args.positional.push(tok);
    }
    i++;
  }

  return args;
}

// ── Exit codes ─────────────────────────────────────────────────────────────────
// 0  — success
// 1  — operational error (stale workers, partial failure)
// 2  — usage error (missing args, claude-code not found, etc.)

async function main(argv) {
  const args = parseArgs(argv);

  if (!args.subcommand) {
    printHelp();
    process.exit(0);
  }

  const omaDir = resolveOmaDir();
  const { flags, positional } = args;

  await maybeCheckAndPromptUpdate({ omaDir });

  try {
    switch (args.subcommand) {
      case 'team': {
        const action = positional[0] || 'status';

        if (action === 'spawn') {
          const rawN = positional[1];
          const N = parseInt(rawN, 10);
          if (isNaN(N) || N < 1) {
            process.stderr.write('oma team: N must be a positive integer\n');
            process.exit(2);
          }
          const task = (positional[2] || '').trim();
          if (!task) {
            process.stderr.write('oma team: task string required\n');
            process.exit(2);
          }
          await teamSpawn(N, task, { force: flags.force, omaDir });
        } else if (/^\d+$/.test(action)) {
          const N = parseInt(action, 10);
          if (isNaN(N) || N < 1) {
            process.stderr.write('oma team: N must be a positive integer\n');
            process.exit(2);
          }
          const task = (positional[1] || '').trim();
          if (!task) {
            process.stderr.write('oma team: task string required\n');
            process.exit(2);
          }
          await teamSpawn(N, task, { force: flags.force, omaDir });
        } else if (action === 'status') {
          const ok = await teamStatus({ json: flags.json, omaDir });
          process.exit(ok ? 0 : 1);
        } else if (action === 'shutdown') {
          const ok = await teamShutdown({ stale: flags.stale, omaDir });
          process.exit(ok ? 0 : 1);
        } else {
          process.stderr.write(`oma team: unknown action: ${action}\n`);
          process.exit(2);
        }
        break;
      }

      case 'hud': {
        if (flags.watch) {
          await hudWatch(1500, { omaDir });
        } else {
          const ok = await hudSnapshot({ omaDir });
          process.exit(ok ? 0 : 1);
        }
        break;
      }

      case 'doctor': {
        let exitCode = 0;
        if (flags.ci) {
          exitCode = await doctorCi({ omaDir });
        } else if (flags.install) {
          exitCode = await doctorInstall({ omaDir });
        } else {
          exitCode = await doctorOffline({ omaDir, json: flags.json });
        }
        process.exit(exitCode);
      }

      default:
        process.stderr.write(`oma: unknown command: ${args.subcommand}\n`);
        printHelp();
        process.exit(2);
    }
  } catch (err) {
    process.stderr.write(`oma: error: ${err.message}\n`);
    process.exit(1);
  }
}

main(process.argv).catch(err => {
  process.stderr.write(`oma: fatal: ${err.message}\n`);
  process.exit(1);
});
