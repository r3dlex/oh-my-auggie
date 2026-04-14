import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { resolveOmaDir, writeJsonFile } from '../utils.js';
import { emitHookEvent } from '../super-oma-events.js';
export const KEYWORDS = [
    // ── Core execution modes (safe standalone) ─────────────────────────────────
    { keyword: 'autopilot', command: '/oma:autopilot' },
    { keyword: 'ralph', command: '/oma:ralph' },
    { keyword: "don't stop", command: '/oma:ralph' },
    { keyword: 'ulw', command: '/oma:ultrawork' },
    { keyword: 'ultrawork', command: '/oma:ultrawork' },
    { keyword: 'ultraqa', command: '/oma:ultraqa' },
    { keyword: 'ralplan', command: '/oma:ralplan' },
    { keyword: 'canceloma', command: '/oma:cancel' },
    { keyword: 'deslop', command: '/oma:deslop' },
    { keyword: 'anti-slop', command: '/oma:deslop' },
    { keyword: 'team', command: '/oma:team' },
    { keyword: 'ralphthon', command: '/oma:ralphthon' },
    { keyword: 'ccg', command: '/oma:ccg' },
    // ── deep-interview / deepinit ───────────────────────────────────────────────
    { keyword: 'deep interview', command: '/oma:interview' },
    { keyword: 'deepinit', command: '/oma:deepinit' },
    // ── Commands requiring "oma" prefix to avoid generic word conflicts ────────
    // "ask", "plan", "help", "team", "config", "note", "session", "status", "trace", "wait"
    // are too generic as standalone keywords; pair with "oma" for specificity
    { keyword: 'oma ask', command: '/oma:ask' },
    { keyword: 'oma plan', command: '/oma:plan' },
    { keyword: 'oma help', command: '/oma:help' },
    { keyword: 'oma team', command: '/oma:team' },
    { keyword: 'oma config', command: '/oma:config' },
    { keyword: 'oma note', command: '/oma:note' },
    { keyword: 'oma session', command: '/oma:session' },
    { keyword: 'oma status', command: '/oma:status' },
    { keyword: 'oma trace', command: '/oma:trace' },
    { keyword: 'oma wait', command: '/oma:wait' },
    // ── Specific compound keywords (safe standalone) ────────────────────────────
    { keyword: 'doctor', command: '/oma:doctor' }, // "oma doctor" natural
    { keyword: 'teleport', command: '/oma:teleport' },
    { keyword: 'tdd', command: '/oma:tdd' }, // acronym, unambiguous
    { keyword: 'skillify', command: '/oma:skillify' },
    { keyword: 'visual verdict', command: '/oma:visual-verdict' },
    // ── Setup / doctor / skill ──────────────────────────────────────────────────
    { keyword: 'oma setup', command: '/oma:setup' },
    { keyword: 'oma doctor', command: '/oma:doctor' },
    { keyword: 'oma skill', command: '/oma:skill' },
    // ── Research / science ─────────────────────────────────────────────────────
    { keyword: 'oma research', command: '/oma:research' },
    { keyword: 'data science', command: '/oma:science' },
    // ── session-search / release / notifications ────────────────────────────────
    { keyword: 'session search', command: '/oma:session-search' },
    { keyword: 'oma release', command: '/oma:release' },
    { keyword: 'oma hud', command: '/oma:hud' },
    { keyword: 'notifications', command: '/oma:notifications' },
    // ── Architecture improvement ───────────────────────────────────────────────
    { keyword: 'improve architecture', command: '/oma:improve-codebase-architecture' },
    // ── Graph provider ─────────────────────────────────────────────────────────
    { keyword: 'graph-provider', command: '/oma:graph-provider' },
    { keyword: 'graph provider', command: '/oma:graph-provider' },
    // ── learner / writer-memory / ralphthon ───────────────────────────────────
    { keyword: 'learner mode', command: '/oma:learner' },
    { keyword: 'writer memory', command: '/oma:writer-memory' },
    { keyword: 'ralphthon', command: '/oma:ralphthon' },
];
// ─── Skill name mapping ────────────────────────────────────────────────────────
// Maps keyword to the skill directory name for SKILL.md loading.
export const SKILL_NAME_MAP = {
    'autopilot': 'autopilot',
    'ralph': 'ralph',
    "don't stop": 'ralph',
    'ulw': 'ultrawork',
    'ultrawork': 'ultrawork',
    'ultraqa': 'ultraqa',
    'ralplan': 'ralplan',
    'canceloma': 'cancel',
    'deslop': 'deslop',
    'anti-slop': 'deslop',
    'ccg': 'ccg',
    'deep interview': 'deep-interview',
    'deepinit': 'deepinit',
    'oma ask': 'ask',
    'oma plan': 'plan',
    'oma help': 'help',
    'oma team': 'team',
    'oma config': 'config',
    'oma note': 'note',
    'oma session': 'session',
    'oma status': 'status',
    'oma trace': 'trace',
    'oma wait': 'wait',
    'doctor': 'doctor',
    'teleport': 'teleport',
    'tdd': 'tdd',
    'skillify': 'skillify',
    'visual verdict': 'visual-verdict',
    'oma setup': 'setup',
    'oma doctor': 'doctor',
    'oma skill': 'skill',
    'oma research': 'research',
    'data science': 'science',
    'session search': 'session-search',
    'oma release': 'release',
    'oma hud': 'hud',
    'notifications': 'notifications',
    'improve architecture': 'improve-codebase-architecture',
    'graph-provider': 'graph-context',
    'graph provider': 'graph-context',
    'learner mode': 'learner',
    'writer memory': 'writer-memory',
    'ralphthon': 'ralphthon',
};
// ─── Mode-activating keywords (write initial state) ───────────────────────────
const MODE_KEYWORDS = new Set([
    'autopilot',
    'ralph',
    "don't stop",
    'ulw',
    'ultrawork',
    'ultraqa',
    'ralplan',
    'team',
    'ralphthon',
]);
// ─── SKILL.md loading ─────────────────────────────────────────────────────────
const SKILL_MAX_CHARS = 4000;
function getSkillPath(skillName) {
    const root = process.env.AUGMENT_PLUGIN_ROOT ?? '';
    const base = root
        ? resolve(root, 'plugins', 'oma')
        : resolve(join(__dirname, '..', '..'));
    return join(base, 'skills', skillName, 'SKILL.md');
}
function loadSkillMd(skillName) {
    const skillPath = getSkillPath(skillName);
    if (!existsSync(skillPath))
        return '';
    try {
        const content = readFileSync(skillPath, 'utf8');
        return content.length > SKILL_MAX_CHARS ? content.slice(0, SKILL_MAX_CHARS) : content;
    }
    catch {
        return '';
    }
}
function writeInitialState(mode) {
    const omaDir = resolveOmaDir();
    const state = { active: true, mode, iteration: 1, status: 'starting' };
    writeJsonFile(join(omaDir, 'state.json'), state);
}
function clearState() {
    const omaDir = resolveOmaDir();
    const state = { active: false, mode: 'none' };
    writeJsonFile(join(omaDir, 'state.json'), state);
}
// ─── Main ─────────────────────────────────────────────────────────────────────
export async function main() {
    const omaDir = resolveOmaDir();
    // Try to get the last user message from various sources
    let lastInput = process.env.LAST_USER_MESSAGE ?? '';
    if (!lastInput) {
        // Try messages.json
        try {
            const messagesPath = join(omaDir, 'messages.json');
            const content = readFileSync(messagesPath, 'utf8');
            // Extract the last content field using a simple approach
            const matches = content.matchAll(/"content"\s*:\s*"([^"]*)"/g);
            let lastMatch = null;
            for (const match of matches) {
                lastMatch = match[1];
            }
            if (lastMatch)
                lastInput = lastMatch;
        }
        catch {
            // File doesn't exist or can't be read
        }
    }
    // Fall back to stdin
    if (!lastInput) {
        const { readAllStdin } = await import('../utils.js');
        const rawInput = await readAllStdin();
        if (rawInput) {
            try {
                const parsed = JSON.parse(rawInput);
                if (typeof parsed.content === 'string' && parsed.content) {
                    lastInput = parsed.content;
                }
            }
            catch {
                // Non-JSON — treat raw string as content
                lastInput = rawInput.trim();
            }
        }
    }
    if (!lastInput) {
        process.exit(0);
    }
    // Lowercase for case-insensitive matching
    const lowerInput = lastInput.toLowerCase();
    for (const entry of KEYWORDS) {
        if (lowerInput.includes(entry.keyword)) {
            const skillName = SKILL_NAME_MAP[entry.keyword] ?? '';
            const skillMd = skillName ? loadSkillMd(skillName) : '';
            // State management
            if (entry.keyword === 'canceloma') {
                clearState();
            }
            else if (MODE_KEYWORDS.has(entry.keyword)) {
                const mode = skillName; // e.g. 'ralph', 'ultrawork'
                writeInitialState(mode);
            }
            // Build additionalContext
            let additionalContext = `Keyword detected: '${entry.keyword}'. Activating ${entry.command}.`;
            if (skillMd) {
                additionalContext += `\n\n${skillMd}`;
            }
            emitHookEvent({
                kind: 'command_detected',
                mode: MODE_KEYWORDS.has(entry.keyword) ? skillName : undefined,
                command: entry.command,
                status: 'detected',
                message: `keyword=${entry.keyword}`,
            });
            const result = {
                hookSpecificOutput: {
                    hookEventName: 'PostToolUse',
                    additionalContext,
                },
            };
            // Primary JSON output to stdout for auggie CLI
            console.log(JSON.stringify(result));
            process.exit(0);
            return;
        }
    }
    process.exit(0);
}
main().catch((err) => {
    console.error(`[keyword-detect] unexpected error: ${err}`);
    process.exit(2);
});
