import { readAllStdin } from '../utils.js';
import { loadJsonFile, isEnterpriseProfile, resolveOmaDir, isApprovalExpired, getMergedConfig } from '../utils.js';
import { join } from 'path';
const FILE_MODIFYING_TOOLS = new Set(['Edit', 'Write', 'remove_files', 'str-replace-editor', 'save-file', 'Bash']);
/**
 * Determines the required approval type for a given file path.
 */
export function getRequiredApproval(filePath) {
    const lower = filePath.toLowerCase();
    if (lower.includes('secrets') || lower.includes('secret')) {
        return 'Security+DevOps';
    }
    if (lower.includes('auth') || filePath.match(/auth\*\.ts$/i) !== null) {
        return 'Security';
    }
    if (lower.includes('config') || filePath.includes('/config')) {
        return 'DevOps';
    }
    if (lower.includes('migration') || filePath.includes('/migration') || lower.includes('migrate')) {
        return 'DBA';
    }
    return '';
}
/**
 * Loads approvals from the approvals.json file.
 */
function loadApprovals(omaDir) {
    const approvalsPath = join(omaDir, 'approvals.json');
    const config = loadJsonFile(approvalsPath);
    return config?.approvals ?? [];
}
/**
 * Returns true if a valid (non-expired) approval of the required type exists for the file.
 * For Security+DevOps dual approval, requires two separate records.
 */
export function hasValidApproval(filePath, required, approvals) {
    if (required === '' || approvals.length === 0)
        return false;
    if (required === 'Security+DevOps') {
        const hasSecurity = approvals.some((r) => r.type === 'Security' && !isApprovalExpired(r));
        const hasDevOps = approvals.some((r) => r.type === 'DevOps' && !isApprovalExpired(r));
        return hasSecurity && hasDevOps;
    }
    return approvals.some((r) => r.type === required && !isApprovalExpired(r));
}
export async function main() {
    const config = getMergedConfig();
    const omaDir = resolveOmaDir();
    // Only enforce in enterprise profile
    if (!isEnterpriseProfile(config)) {
        process.exit(0);
    }
    const raw = await readAllStdin();
    let input;
    try {
        input = JSON.parse(raw);
    }
    catch {
        // Could not parse -- allow by default
        process.exit(0);
    }
    const toolName = input.tool_name ?? '';
    // Only check file-modifying tools
    if (!FILE_MODIFYING_TOOLS.has(toolName)) {
        process.exit(0);
    }
    // Extract file paths from tool_input
    const toolInput = input.tool_input ?? {};
    const filePaths = [];
    for (const key of ['file_path', 'path', 'filePath']) {
        if (typeof toolInput[key] === 'string' && toolInput[key] !== '') {
            filePaths.push(toolInput[key]);
        }
    }
    if (filePaths.length === 0) {
        // No file path found -- allow by default
        process.exit(0);
    }
    const approvals = loadApprovals(omaDir);
    for (const filePath of filePaths) {
        const required = getRequiredApproval(filePath);
        if (!required)
            continue;
        if (!hasValidApproval(filePath, required, approvals)) {
            let approvalDesc = required;
            if (required === 'Security+DevOps')
                approvalDesc = 'Security and DevOps';
            const output = {
                decision: 'block',
                reason: `Change to ${filePath} requires ${approvalDesc} approval. No valid approval found in .oma/approvals.json`,
                systemMessage: `OMA approval gate: ${filePath} path requires ${approvalDesc} approval. Record approval in .oma/approvals.json`,
            };
            console.error(JSON.stringify(output));
            process.exit(2);
        }
    }
    process.exit(0);
}
main().catch(() => { });
