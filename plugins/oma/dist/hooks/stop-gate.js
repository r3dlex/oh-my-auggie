import { loadJsonFile } from '../utils.js';
import { loadOmaState, resolveOmaDir } from '../utils.js';
import { join } from 'path';
export async function main() {
    const omaDir = resolveOmaDir();
    const state = loadOmaState(omaDir);
    // Allow stop if no state file or empty
    if (state.mode === 'none' && state.active === false) {
        process.stdout.write('{}\n');
        process.exit(0);
    }
    // Allow if not ralph mode
    if (state.mode !== 'ralph' || state.active !== true) {
        process.stdout.write('{}\n');
        process.exit(0);
    }
    // Ralph mode active: check for architect PASS verdict in task.log.json
    const taskLogPath = join(omaDir, 'task.log.json');
    const taskLog = loadJsonFile(taskLogPath);
    if (taskLog && taskLog.length > 0) {
        // Find most recent architect entry with PASS status
        const lastArchitect = [...taskLog].reverse().find((entry) => entry.agent === 'oma-architect' && entry.status === 'PASS');
        if (lastArchitect) {
            process.stdout.write('{}\n');
            process.exit(0);
        }
    }
    // Block stop: ralph mode without architect PASS
    const iteration = state.iteration ?? 'unknown';
    const output = {
        decision: 'block',
        reason: `Ralph mode is active and oma-architect has not returned PASS verdict. Cannot stop until verification is complete.`,
        systemMessage: `Stop blocked: ralph mode active (iteration ${iteration}). Wait for oma-architect verification or run /oma:cancel to force-stop.`,
    };
    console.error(JSON.stringify(output));
    process.exit(2);
}
main().catch(() => { });
