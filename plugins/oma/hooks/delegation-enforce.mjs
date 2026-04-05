#!/usr/bin/env node
// delegation-enforce.mjs -- PreToolUse hook: block file edits when orchestration mode is active
// Exit 0 = allow, Exit 2 = block

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const OMA_DIR = process.env.OMA_DIR ?? '.oma';
const STATE_FILE = join(OMA_DIR, 'state.json');

function getState() {
  try {
    const content = readFileSync(STATE_FILE, 'utf8');
    const state = JSON.parse(content);
    return { mode: state.mode ?? 'none', active: state.active ?? false };
  } catch {
    return { mode: 'none', active: false };
  }
}

async function main() {
  let hookInput = '';
  // Read stdin
  for await (const chunk of process.stdin) {
    hookInput += chunk;
  }

  // Extract tool name from JSON
  const toolMatch = hookInput.match(/"tool_name"\s*:\s*"([^"]+)"/);
  if (!toolMatch) {
    process.exit(0);
  }
  const toolName = toolMatch[1];

  const fileModifyingTools = ['Edit', 'Write', 'remove_files', 'str-replace-editor', 'save-file'];
  if (!fileModifyingTools.includes(toolName)) {
    process.exit(0);
  }

  const { mode, active } = getState();

  if (mode !== 'none' && active === true) {
    const output = JSON.stringify({
      decision: 'block',
      reason: `OMA orchestration mode (${mode}) is active. Direct file edits are blocked. Use oma-executor agent for all code changes.`,
      systemMessage: 'Delegation enforcement: orchestration mode is active. Spawn oma-executor via Task tool for code changes.',
    });
    console.error(output);
    process.exit(2);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
