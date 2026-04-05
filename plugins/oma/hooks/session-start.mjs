#!/usr/bin/env node
// session-start.mjs -- SessionStart hook: inject OMA context and restore mode
// Auggie invokes this on session start. Output to stdout is injected as context.

import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';

const OMA_DIR = process.env.OMA_DIR ?? '.oma';
const STATE_FILE = join(OMA_DIR, 'state.json');
const NOTEPAD_FILE = join(OMA_DIR, 'notepad.json');

function getState() {
  try {
    const content = readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return { mode: 'none', active: false, task: '' };
  }
}

function getNotepadPriority() {
  try {
    const content = readFileSync(NOTEPAD_FILE, 'utf8');
    const notepad = JSON.parse(content);
    return notepad.priority ?? null;
  } catch {
    return null;
  }
}

function main() {
  const state = getState();
  const auggieVersion = process.env.AUGGIE_VERSION ?? 'unknown';
  let sessionContext = '';

  // Mode injection
  if (state.mode !== 'none' && state.active === true) {
    sessionContext += `\n[OMA MODE RESTORED] Active mode: ${state.mode}. Task: ${state.task ?? ''}. Use /oma:status to check details. Use /oma:cancel to clear mode.`;
  }

  // Notepad priority injection
  const priority = getNotepadPriority();
  if (priority && priority !== 'null') {
    sessionContext += `\n[OMA NOTEPAD - PRIORITY]\n${priority}`;
  }

  // Auggie version
  if (auggieVersion !== 'unknown') {
    sessionContext += `\n[OMA] Running on Auggie ${auggieVersion}.`;
  }

  if (sessionContext) {
    console.log(sessionContext.trim());
  }
}

main();
