import { readFileSync } from 'fs';
import { join } from 'path';
import { loadOmaState, resolveOmaDir } from '../utils.js';
// ─── Main ─────────────────────────────────────────────────────────────────────
export function main() {
    const omaDir = resolveOmaDir();
    const stateFile = join(omaDir, 'state.json');
    const notepadFile = join(omaDir, 'notepad.json');
    let sessionContext = '';
    // ── Mode Injection ──────────────────────────────────────────────────────────
    try {
        const state = loadOmaState(omaDir);
        if (state.mode !== 'none' && state.active === true) {
            const task = typeof state.task === 'string' ? state.task : '';
            sessionContext += `[OMA MODE RESTORED] Active mode: ${state.mode}. Task: ${task}. Use /oma:status to check details. Use /oma:cancel to clear mode.`;
        }
    }
    catch {
        // State file doesn't exist or is invalid — no mode to restore
    }
    // ── Notepad Injection (Priority) ───────────────────────────────────────────
    try {
        const notepadContent = readFileSync(notepadFile, 'utf8');
        const notepad = JSON.parse(notepadContent);
        const priority = notepad.priority;
        if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
            if (sessionContext)
                sessionContext += '\n';
            sessionContext += `[OMA NOTEPAD - PRIORITY]\n${priority.trim()}`;
        }
    }
    catch {
        // Notepad file doesn't exist or is invalid
    }
    // ── Auggie Version Check ───────────────────────────────────────────────────
    const auggieVersion = process.env.AUGGIE_VERSION ?? 'unknown';
    if (auggieVersion !== 'unknown') {
        if (sessionContext)
            sessionContext += '\n';
        sessionContext += `[OMA] Running on Auggie ${auggieVersion}.`;
    }
    // ── Output ─────────────────────────────────────────────────────────────────
    if (sessionContext) {
        console.log(sessionContext);
    }
    process.exit(0);
}
main();
