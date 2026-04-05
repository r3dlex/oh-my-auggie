#!/usr/bin/env node
// approval-gate.mjs -- PreToolUse hook: require approval for sensitive paths
// Exit 0 = allow, Exit 2 = block

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const OMA_DIR = process.env.OMA_DIR ?? '.oma';
const CONFIG_FILE = join(OMA_DIR, 'config.json');
const APPROVALS_FILE = join(OMA_DIR, 'approvals.json');

function isEnterprise() {
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    return config.profile === 'enterprise';
  } catch {
    return false;
  }
}

function extractFilePath(toolInput) {
  const patterns = [
    /"file_path"\s*:\s*"([^"]+)"/,
    /"path"\s*:\s*"([^"]+)"/,
    /"filePath"\s*:\s*"([^"]+)"/,
  ];
  for (const p of patterns) {
    const m = toolInput.match(p);
    if (m) return m[1];
  }
  return '';
}

function getRequiredApproval(filePath) {
  if (/secrets|secret/i.test(filePath)) return 'Security+DevOps';
  if (/auth.*\.ts|auth/i.test(filePath)) return 'Security';
  if (/config/i.test(filePath)) return 'DevOps';
  if (/migration|migrate/i.test(filePath)) return 'DBA';
  return '';
}

function hasValidApproval(filePath, requiredApproval, approvalsJson) {
  if (!approvalsJson || !approvalsJson.approvals) return false;
  const now = Date.now();
  return approvalsJson.approvals.some(a => {
    if (!a.path || !a.type) return false;
    const matches = filePath.includes(a.path) || a.path === '*';
    if (!matches) return false;
    if (a.expires) {
      const expiry = new Date(a.expires).getTime();
      if (now > expiry) return false;
    }
    if (requiredApproval === 'Security+DevOps') {
      return a.type === 'Security' || a.type === 'DevOps';
    }
    return a.type === requiredApproval;
  });
}

function main() {
  if (!isEnterprise()) {
    process.exit(0);
  }

  let hookInput = '';
  for await (const chunk of process.stdin) {
    hookInput += chunk;
  }

  const toolMatch = hookInput.match(/"tool_name"\s*:\s*"([^"]+)"/);
  if (!toolMatch) {
    process.exit(0);
  }
  const toolName = toolMatch[1];

  const fileModifyingTools = ['Edit', 'Write', 'remove_files', 'str-replace-editor', 'save-file', 'Bash'];
  if (!fileModifyingTools.includes(toolName)) {
    process.exit(0);
  }

  const filePath = extractFilePath(hookInput);
  if (!filePath) {
    process.exit(0);
  }

  const requiredApproval = getRequiredApproval(filePath);
  if (!requiredApproval) {
    process.exit(0);
  }

  try {
    const approvals = JSON.parse(readFileSync(APPROVALS_FILE, 'utf8'));
    if (!hasValidApproval(filePath, requiredApproval, approvals)) {
      const desc = requiredApproval === 'Security+DevOps' ? 'Security and DevOps' : requiredApproval;
      const output = JSON.stringify({
        decision: 'block',
        reason: `Change to ${filePath} requires ${desc} approval. No valid approval found in .oma/approvals.json`,
        systemMessage: `OMA approval gate: ${filePath} path requires ${desc} approval. Record approval in .oma/approvals.json`,
      });
      console.error(output);
      process.exit(2);
    }
  } catch {
    process.exit(0);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
