import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { readAllStdin, isEnterpriseProfile, normalizePath, isGitAvailable, getMergedConfig, resolveOmaDir } from '../utils.js';
// ─── Helpers ─────────────────────────────────────────────────────────────────
function adrDirExists(adrDir) {
    return existsSync(adrDir);
}
function getChangedFiles(cached) {
    if (!isGitAvailable())
        return [];
    try {
        if (cached) {
            const staged = execSync('git diff --cached --name-only', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
            return staged ? staged.split('\n').filter(f => f) : [];
        }
        else {
            const all = execSync('git diff HEAD --name-only', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
            return all ? all.split('\n').filter(f => f) : [];
        }
    }
    catch {
        return [];
    }
}
export function requiresAdr(files) {
    const fileCount = files.length;
    // External API integration patterns
    const apiPattern = /(api[-_]?client|fetch|axios|request|http[-_]?client|rest[-_]?client|graphql[-_]?client)/i;
    if (files.some(f => apiPattern.test(f)))
        return true;
    // Database schema change patterns
    const dbPattern = /(migration|schema|migrate|db[-_]?schema|table[-_]?schema)/i;
    if (files.some(f => dbPattern.test(f)))
        return true;
    // Auth/authorization patterns
    const authPattern = /(auth|jwt|oauth|passport|session|acl|permission|role)/i;
    if (files.some(f => authPattern.test(f)))
        return true;
    // Service boundary / interface patterns
    const servicePattern = /(interface[-_]?service|service[-_]?contract|port[-_]?adapter|adapter[-_]?pattern)/i;
    if (files.some(f => servicePattern.test(f)))
        return true;
    // Significant refactoring (>20 files)
    if (fileCount > 20)
        return true;
    // Agent definition files — require ADR per ADR-0002
    const agentPattern = /plugins\/oma\/agents\/.*\.md$/i;
    if (files.some(f => agentPattern.test(f)))
        return true;
    return false;
}
export function hasAdrReference(commitMsg) {
    const pattern = /ADR-[0-9]+|\.oma\/adr\/[0-9]+-|architectural[-_]?decision/i;
    return pattern.test(commitMsg);
}
function adrFilesExist(adrDir) {
    try {
        const files = readdirSync(adrDir);
        return files.length > 0;
    }
    catch {
        return false;
    }
}
// ─── Main ─────────────────────────────────────────────────────────────────────
export async function main() {
    const config = getMergedConfig();
    const omaDir = resolveOmaDir();
    // Only enforce in enterprise profile
    if (!isEnterpriseProfile(config)) {
        process.exit(0);
    }
    const hookType = process.env.HOOK_TYPE ?? 'PreToolUse';
    // Only enforce on PreToolUse or commit-msg hooks
    if (hookType !== 'PreToolUse' && hookType !== 'commit-msg') {
        process.exit(0);
    }
    // Read hook input
    const rawInput = await readAllStdin();
    let hookInput = {};
    try {
        hookInput = JSON.parse(rawInput);
    }
    catch {
        // Non-JSON input (e.g., commit message) — treat as plain string
    }
    // Extract commit message if commit-msg hook
    let commitMsg = '';
    if (hookType === 'commit-msg' && rawInput) {
        commitMsg = rawInput.trim();
    }
    // Get changed files from git
    const stagedFiles = getChangedFiles(true);
    const allFiles = getChangedFiles(false);
    // Merge both
    const changedFiles = [];
    const seen = new Set();
    for (const f of [...stagedFiles, ...allFiles]) {
        const normalized = normalizePath(f);
        if (!seen.has(normalized)) {
            seen.add(normalized);
            changedFiles.push(f);
        }
    }
    // Check if this change requires an ADR
    if (!requiresAdr(changedFiles)) {
        process.exit(0);
    }
    // ADR is required — check for reference
    let hasReference = false;
    if (commitMsg && hasAdrReference(commitMsg)) {
        hasReference = true;
    }
    // Also check if hook input contains ADR reference
    const inputStr = rawInput.toLowerCase();
    if (/\d{4,}/.test(inputStr) && (inputStr.includes('adr-') || inputStr.includes('.oma/adr/'))) {
        hasReference = true;
    }
    // Check if any ADRs exist at all
    const adrDir = join(omaDir, 'adr');
    if (!adrFilesExist(adrDir)) {
        // No ADRs exist yet — allow but warn
        const warn = {
            decision: 'warn',
            reason: 'No ADR files found in .oma/adr/. Consider creating an ADR for architectural decisions.',
            systemMessage: 'OMA: ADR directory is empty. Consider documenting architectural decisions in .oma/adr/.',
        };
        console.error(JSON.stringify(warn));
        process.exit(0);
    }
    if (!hasReference) {
        const block = {
            decision: 'block',
            reason: 'Architectural change detected but no ADR reference found. Include ADR-NNN in your commit message or link to .oma/adr/NNNN-*.md',
            systemMessage: 'OMA ADR enforcement: Architectural change requires ADR reference. Add ADR-NNN to commit message or link to .oma/adr/ file.',
        };
        console.error(JSON.stringify(block));
        process.exit(2);
    }
    process.exit(0);
}
main().catch((err) => {
    console.error(`[adr-enforce] unexpected error: ${err}`);
    process.exit(2);
});
