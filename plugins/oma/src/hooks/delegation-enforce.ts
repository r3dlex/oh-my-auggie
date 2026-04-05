import { readAllStdin } from '../utils.js';
import { loadOmaState, resolveOmaDir } from '../utils.js';
import type { HookInput } from '../types.js';

const BLOCKING_TOOLS = new Set(['Edit', 'Write', 'remove_files', 'str-replace-editor', 'save-file']);

export async function main(): Promise<void> {
  const raw = await readAllStdin();

  // Parse tool_name from JSON using simple extraction
  let toolName = '';
  try {
    const input = JSON.parse(raw) as HookInput;
    toolName = input.tool_name ?? '';
  } catch {
    // Could not parse -- allow by default
    process.exit(0);
  }

  if (!toolName) {
    process.exit(0);
  }

  // Only block file-modifying tools
  if (!BLOCKING_TOOLS.has(toolName)) {
    process.exit(0);
  }

  const omaDir = resolveOmaDir();
  const state = loadOmaState(omaDir);

  if (state.mode !== 'none' && state.active === true) {
    const output = {
      decision: 'block',
      reason: `OMA orchestration mode (${state.mode}) is active. Direct file edits are blocked. Use oma-executor agent for all code changes.`,
      systemMessage: `Delegation enforcement: orchestration mode is active. Spawn oma-executor via Task tool for code changes.`,
    };
    console.error(JSON.stringify(output));
    process.exit(2);
  }

  process.exit(0);
}

main();
