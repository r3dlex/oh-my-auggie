// plugins/oma/src/cli/run.ts — Run a mode or slash command via OMA CLI
// Ported from cli/commands/super-run.mjs

import { findOmaDir } from '../utils.js';
import { generateCommandManifest, loadCommandManifest } from './tmux.js';

interface RunOpts {
  omaDir?: string;
}

export async function runCommand(args: string[], opts: RunOpts = {}): Promise<number> {
  const omaDir = opts.omaDir || findOmaDir();

  if (args.length === 0) {
    process.stderr.write('run: missing command. Usage: oma run <mode|/oma:command> [args...]\n');
    return 2;
  }

  const first = args[0];

  // Check if it's a known slash command from the manifest
  const manifest = loadCommandManifest(omaDir);
  if (manifest) {
    const resolved = (manifest as Record<string, unknown>).commands as Record<string, string> | undefined;
    if (resolved && resolved[first]) {
      process.stdout.write(`oma run: resolved ${first} → ${resolved[first]}\n`);
      // In a fully integrated CLI this would execute the resolved command
      return 0;
    }
  }

  process.stdout.write(`oma run: starting mode "${first}" with args: ${args.slice(1).join(' ') || '(none)'}\n`);
  return 0;
}
