// plugins/oma/src/cli/run.ts — Run a mode or slash command via OMA CLI
// Ported from cli/commands/super-run.mjs
import { resolveOmaDir } from './utils.js';
import { loadCommandManifest } from './tmux.js';
export async function runCommand(args, opts = {}) {
    const omaDir = opts.omaDir || resolveOmaDir();
    if (args.length === 0) {
        process.stderr.write('run: missing command. Usage: oma run <mode|/oma:command> [args...]\n');
        return 2;
    }
    const first = args[0];
    // Check if it's a known slash command from the manifest
    const manifest = loadCommandManifest(omaDir);
    if (manifest) {
        const resolved = manifest.commands;
        if (resolved && resolved[first]) {
            process.stdout.write(`oma run: resolved ${first} → ${resolved[first]}\n`);
            // In a fully integrated CLI this would execute the resolved command
            return 0;
        }
    }
    process.stdout.write(`oma run: starting mode "${first}" with args: ${args.slice(1).join(' ') || '(none)'}\n`);
    return 0;
}
