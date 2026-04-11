import { loadJsonFile, loadOmaState, resolveOmaDir, writeJsonFile } from '../utils.js';
import { join } from 'path';
const PERSISTENT_MODES = new Set(['ralph', 'ultrawork', 'autopilot', 'team', 'ultraqa', 'ralplan', 'ralphthon']);
export async function main() {
    const omaDir = resolveOmaDir();
    // Load state via loadOmaState so mocks can intercept
    const state = loadOmaState(omaDir);
    // Allow stop if no state file or inactive
    if (state.mode === 'none' && state.active === false) {
        process.stdout.write('{}\n');
        process.exit(0);
    }
    // Allow if not a persistent mode or not active
    if (!PERSISTENT_MODES.has(state.mode) || !state.active) {
        process.stdout.write('{}\n');
        process.exit(0);
    }
    // Determine the iteration cap
    const maxIterations = state.maxIterations ?? 50;
    const iteration = state.iteration ?? 0;
    // Ralph mode: also allow if architect PASS verdict found in task.log.json
    if (state.mode === 'ralph') {
        const taskLogPath = join(omaDir, 'task.log.json');
        const taskLog = loadJsonFile(taskLogPath);
        if (taskLog && taskLog.length > 0) {
            const lastArchitect = [...taskLog].reverse().find((entry) => entry.agent === 'oma-architect' && entry.status === 'PASS');
            if (lastArchitect) {
                process.stdout.write('{}\n');
                process.exit(0);
            }
        }
    }
    // Allow stop once iteration limit is reached
    if (iteration >= maxIterations) {
        process.stdout.write('{}\n');
        process.exit(0);
    }
    // Block stop: persistent mode active without exit condition
    // Increment iteration counter in state.json
    const updatedState = { ...state, iteration: iteration + 1 };
    writeJsonFile(join(omaDir, 'state.json'), updatedState);
    const output = {
        decision: 'block',
        reason: `${state.mode} mode is active. Cannot stop until verification is complete or iteration limit (${maxIterations}) is reached.`,
        systemMessage: `Stop blocked: ${state.mode} mode active (iteration ${iteration + 1}/${maxIterations}). Wait for oma-architect verification or run /oma:cancel to force-stop.`,
    };
    console.error(JSON.stringify(output));
    process.exit(2);
}
main().catch(() => { });
