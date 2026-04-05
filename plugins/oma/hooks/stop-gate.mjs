#!/usr/bin/env node
// stop-gate.mjs -- Stop hook: block agent completion when ralph mode active without architect PASS
// Exit 0 = allow stop, Exit 2 = block stop

import { readFileSync } from 'fs';
import { join } from 'path';

const OMA_DIR = process.env.OMA_DIR ?? '.oma';
const STATE_FILE = join(OMA_DIR, 'state.json');
const TASK_LOG = join(OMA_DIR, 'task.log.json');

function getState() {
  try {
    const content = readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return { mode: 'none', active: false, iteration: 0 };
  }
}

function main() {
  const state = getState();

  if (state.mode !== 'ralph' || state.active !== true) {
    console.log('{}');
    process.exit(0);
  }

  // Check for architect PASS verdict in task log
  try {
    const taskLog = readFileSync(TASK_LOG, 'utf8');
    const lines = taskLog.split('\n').filter(Boolean);
    const architectLines = lines.filter(l => l.includes('"agent":"oma-architect"'));
    const lastArchitect = architectLines[architectLines.length - 1];
    if (lastArchitect && lastArchitect.includes('"status":"PASS"')) {
      console.log('{}');
      process.exit(0);
    }
  } catch {
    // No task log
  }

  // Block stop
  const output = JSON.stringify({
    decision: 'block',
    reason: 'Ralph mode is active and oma-architect has not returned PASS verdict. Cannot stop until verification is complete.',
    systemMessage: `Stop blocked: ralph mode active (iteration ${state.iteration ?? 'unknown'}). Wait for oma-architect verification or run /oma:cancel to force-stop.`,
  });
  console.log(output);
  process.exit(2);
}

main();
