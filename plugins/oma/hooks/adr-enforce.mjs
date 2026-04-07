#!/usr/bin/env node
// adr-enforce.mjs -- PreToolUse/commit-msg hook: enforce ADR references for architectural changes
// Exit 0 = allow, Exit 2 = block

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

const OMA_DIR = process.env.OMA_DIR ?? '.oma';
const CONFIG_FILE = join(OMA_DIR, 'config.json');
const ADR_DIR = join(OMA_DIR, 'adr');
const STATE_FILE = join(OMA_DIR, 'state.json');

function isEnterprise() {
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    return config.profile === 'enterprise';
  } catch {
    return false;
  }
}

function getChangedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only 2>/dev/null || echo ""', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
    const all = execSync('git diff HEAD --name-only 2>/dev/null || echo ""', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
    return [staged, all].filter(Boolean).join('\n');
  } catch {
    return '';
  }
}

function requiresAdr(files) {
  if (!files) return false;
  const patterns = [
    /api[-_]?client|fetch|axios|request|http[-_]?client|rest[-_]?client|graphql[-_]?client/i,
    /migration|schema|migrate|db[-_]?schema|table[-_]?schema/i,
    /auth|jwt|oauth|passport|session|acl|permission|role/i,
    /interface[-_]?service|service[-_]?contract|port[-_]?adapter|adapter[-_]?pattern/i,
  ];
  if (patterns.some(p => p.test(files))) return true;
  const fileCount = files.split('\n').filter(Boolean).length;
  return fileCount > 20;
}

function hasAdrReference(text) {
  return /ADR-[0-9]+|\.oma\/adr\/[0-9]+-|architectural[-_]?decision/i.test(text ?? '');
}

function adrDirExists() {
  try {
    return existsSync(ADR_DIR) && readdirSync(ADR_DIR).length > 0;
  } catch {
    return false;
  }
}

async function main() {
  const hookType = process.env.HOOK_TYPE ?? 'PreToolUse';

  if (!isEnterprise()) {
    process.exit(0);
  }

  // Read stdin hook input
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let hookInput = '';
  for await (const line of rl) {
    hookInput += line + '\n';
  }

  let commitMsg = '';
  if (hookType === 'commit-msg') {
    commitMsg = hookInput;
  }

  const changedFiles = getChangedFiles();

  if (!requiresAdr(changedFiles)) {
    process.exit(0);
  }

  if (!hasAdrReference(commitMsg) && !hasAdrReference(hookInput)) {
    if (!adrDirExists()) {
      const warn = JSON.stringify({
        decision: 'warn',
        reason: 'No ADR files found in .oma/adr/. Consider creating an ADR for architectural decisions.',
        systemMessage: 'OMA: ADR directory is empty. Consider documenting architectural decisions in .oma/adr/.',
      });
      console.error(warn);
      process.exit(0);
    }
    const block = JSON.stringify({
      decision: 'block',
      reason: 'Architectural change detected but no ADR reference found. Include ADR-NNN in your commit message or link to .oma/adr/NNNN-*.md',
      systemMessage: 'OMA ADR enforcement: Architectural change requires ADR reference. Add ADR-NNN to commit message or link to .oma/adr/ file.',
    });
    console.error(block);
    process.exit(2);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
