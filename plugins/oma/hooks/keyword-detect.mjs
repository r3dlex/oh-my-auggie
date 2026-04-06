#!/usr/bin/env node
// keyword-detect.mjs -- PostToolUse hook: detect keywords that auto-activate modes
// Exit 0 = no keyword detected, Exit 0 with output = keyword found

import { readFileSync } from 'fs';
import { join } from 'path';

const OMA_DIR = process.env.OMA_DIR ?? '.oma';
const STATE_FILE = join(OMA_DIR, 'state.json');

const KEYWORDS = [
  ['autopilot', '/oma:autopilot'],
  ['ralph', '/oma:ralph'],
  ['ulw', '/oma:ultrawork'],
  ['ultrawork', '/oma:ultrawork'],
  ['ccg', '/oma:ccg'],
  ['ralplan', '/oma:ralplan'],
  ['deep-interview', '/oma:deep-interview'],
  ['deslop', '/oma:deslop'],
  ['anti-slop', '/oma:deslop'],
  ['canceloma', '/oma:cancel'],
  ['setup', '/oma:setup'],
  ['ultraqa', '/oma:ultraqa'],
  ['team', '/oma:team'],
];

function getLastUserMessage() {
  // Try environment variable first
  const envMsg = process.env.LAST_USER_MESSAGE ?? '';
  if (envMsg) return envMsg;

  // Try messages file
  try {
    const messagesFile = join(OMA_DIR, 'messages.json');
    const content = readFileSync(messagesFile, 'utf8');
    const messages = JSON.parse(content);
    const lastUser = messages.filter(m => m.role === 'user').pop();
    return lastUser?.content ?? '';
  } catch {
    return '';
  }
}

function main() {
  const lastInput = getLastUserMessage();
  if (!lastInput) {
    process.exit(0);
  }

  const lowerInput = lastInput.toLowerCase();

  for (const [keyword, command] of KEYWORDS) {
    if (lowerInput.includes(keyword)) {
      const output = JSON.stringify({
        keywordDetected: keyword,
        suggestedCommand: command,
        systemMessage: `Keyword detected: '${keyword}'. Suggesting ${command}`,
      });
      console.log(output);
      process.exit(0);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
