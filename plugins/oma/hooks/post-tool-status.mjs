#!/usr/bin/env node
// post-tool-status.mjs -- PostToolUse hook: output compact OMA status via additionalContext
// Fires on PostToolUse, reads .oma/state.json/.oma/notepad.json/.oma/task.log.json,
// scans tool_output for <remember> tags, outputs compact status via stdout.
// Exit 0 = always (hook-safe)

import { existsSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';

// ── OMA_DIR resolution ────────────────────────────────────────────────────────

function resolveOmaDir() {
  if (process.env.OMA_DIR) {
    return resolve(process.env.OMA_DIR);
  }
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, '.oma');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.env.HOME || '/tmp', '.oma');
}

function loadJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// ── Remember tag extraction ───────────────────────────────────────────────────

function extractRememberTags(toolOutput) {
  const tags = [];
  const regex = /<remember\s+key="([^"]+)"\s*>([\s\S]*?)<\/remember>/gi;
  let match;
  while ((match = regex.exec(toolOutput)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key && value) tags.push({ key, value });
  }
  return tags;
}

// ── Status formatting ────────────────────────────────────────────────────────

function formatTaskSummary(tasks) {
  if (!tasks?.length) return '';
  const pending = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');
  const parts = [];
  if (pending.length) parts.push(`${pending.length} pending`);
  if (completed.length) parts.push(`${completed.length} done`);
  return parts.length ? `[OMA] Tasks: ${parts.join(', ')}` : '';
}

function formatRememberSummary(tags) {
  if (!tags.length) return '';
  if (tags.length === 1) {
    const v = tags[0].value;
    return `[OMA Remember] ${tags[0].key}: ${v.slice(0, 60)}${v.length > 60 ? '...' : ''}`;
  }
  return `[OMA Remember] ${tags.length} items stored`;
}

// ── stdin reading ─────────────────────────────────────────────────────────────

async function readAllStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', () => resolve(''));
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const omaDir = resolveOmaDir();
  const contextParts = [];

  // Read stdin for tool output
  let rawInput = '';
  if (!process.stdin.isTTY) {
    rawInput = await readAllStdin();
  }

  // Extract <remember> tags from tool output
  if (rawInput) {
    try {
      const parsed = JSON.parse(rawInput);
      const toolOutput = parsed.tool_output;
      if (toolOutput) {
        const tags = extractRememberTags(toolOutput);
        if (tags.length) {
          const summary = formatRememberSummary(tags);
          if (summary) contextParts.push(summary);
        }
      }
    } catch { /* ignore */ }
  }

  // Read OMA state
  const state = loadJsonFile(join(omaDir, 'state.json'));
  if (state?.active && state?.mode && state.mode !== 'none') {
    const iteration = state.iteration ?? 1;
    const max = state.maxIterations ?? 100;
    contextParts.push(`[OMA] ${state.mode} ${iteration}/${max}`);
    if (state.task && typeof state.task === 'string') {
      const preview = state.task.slice(0, 60);
      contextParts.push(`  ${preview}${state.task.length > 60 ? '...' : ''}`);
    }
  }

  // Read notepad priority
  const notepad = loadJsonFile(join(omaDir, 'notepad.json'));
  if (notepad?.priority && typeof notepad.priority === 'string' && notepad.priority.trim()) {
    const preview = notepad.priority.trim().slice(0, 80);
    contextParts.push(`[OMA Note] ${preview}${notepad.priority.length > 80 ? '...' : ''}`);
  }

  // Read task log summary
  const taskLog = loadJsonFile(join(omaDir, 'task.log.json'));
  if (taskLog?.tasks?.length) {
    const summary = formatTaskSummary(taskLog.tasks);
    if (summary) contextParts.push(summary);
  }

  // Output compact status
  if (contextParts.length > 0) {
    const context = contextParts.join('\n');
    const truncated = context.length > 500 ? context.slice(0, 497) + '...' : context;
    console.log(truncated);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(`[post-tool-status] unexpected error: ${err}`);
  process.exit(0);
});
