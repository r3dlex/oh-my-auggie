#!/usr/bin/env node
// audit-log.mjs -- PostToolUse/SessionEnd hook: structured audit log for enterprise profile
// Exit 0 = allow (always)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';

const SESSION_ID = process.env.SESSION_ID ?? `${Date.now()}-${process.pid}`;

// ── OMA_DIR resolution (matches cli/utils.mjs) ────────────────────────────────

function resolveOmaDir() {
  if (process.env.OMA_DIR) {
    const abs = resolve(process.env.OMA_DIR);
    mkdirSync(abs, { recursive: true });
    return abs;
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

const OMA_DIR = resolveOmaDir();
const AUDIT_LOG_FILE = join(OMA_DIR, 'audit-log.json');

// ── Enterprise profile check ──────────────────────────────────────────────────

function isEnterpriseProfile(config) {
  return config?.profile === 'enterprise';
}

function getMergedConfig() {
  try {
    const configPath = join(OMA_DIR, 'config.json');
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf8'));
    }
  } catch {}
  return { profile: 'default' };
}

// ── Audit log helpers ─────────────────────────────────────────────────────────

function ensureAuditLog() {
  if (!existsSync(OMA_DIR)) {
    mkdirSync(OMA_DIR, { recursive: true });
  }
  if (!existsSync(AUDIT_LOG_FILE)) {
    writeFileSync(AUDIT_LOG_FILE, JSON.stringify({ sessions: [], version: '0.1' }, null, 2));
  }
}

function readAuditLog() {
  ensureAuditLog();
  try {
    const content = readFileSync(AUDIT_LOG_FILE, 'utf8');
    if (!content.trim()) return { sessions: [], version: '0.1' };
    return JSON.parse(content);
  } catch {
    return { sessions: [], version: '0.1' };
  }
}

function writeAuditLog(log) {
  writeFileSync(AUDIT_LOG_FILE, JSON.stringify(log, null, 2));
}

function upsertSession(log, sessionId) {
  let session = log.sessions.find(s => s.id === sessionId);
  if (!session) {
    session = { id: sessionId, start_time: new Date().toISOString(), events: [] };
    log.sessions.push(session);
  }
  return session;
}

// ── File path extraction ───────────────────────────────────────────────────────

function extractFilePaths(toolInput) {
  const paths = [];
  for (const key of ['file_path', 'path', 'filePath', 'destination_path', 'target_path']) {
    const val = toolInput[key];
    if (typeof val === 'string' && val !== '') {
      paths.push(val);
    }
  }
  return paths;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const hookType = process.env.HOOK_TYPE ?? 'PostToolUse';
  const config = getMergedConfig();

  // Only active in enterprise profile
  if (!isEnterpriseProfile(config)) {
    process.exit(0);
  }

  if (hookType === 'PostToolUse') {
    const toolName = process.env.OMA_TOOL_NAME ?? 'unknown';
    const durationMs = parseInt(process.env.OMA_DURATION_MS ?? '0', 10);
    const exitCode = parseInt(process.env.OMA_EXIT_CODE ?? '0', 10);
    const outcome = exitCode === 2 ? 'blocked' : 'success';

    // Parse tool_input from env for file paths
    let filePaths = [];
    const toolInputStr = process.env.OMA_TOOL_INPUT ?? '{}';
    try {
      const toolInput = JSON.parse(toolInputStr);
      filePaths = extractFilePaths(toolInput);
    } catch {}

    const log = readAuditLog();
    const session = upsertSession(log, SESSION_ID);
    session.events.push({
      timestamp: new Date().toISOString(),
      tool_name: toolName,
      file_paths: filePaths,
      outcome,
      duration_ms: durationMs,
    });
    writeAuditLog(log);

    console.error(`[audit-log] session=${SESSION_ID} tool=${toolName} outcome=${outcome} files=${filePaths.length}`);
  } else if (hookType === 'SessionEnd' || hookType === 'session-end') {
    ensureAuditLog();
    const log = readAuditLog();
    const session = log.sessions.find(s => s.id === SESSION_ID);
    if (session) {
      console.error(`[audit-log] Session summary for ${SESSION_ID}:`);
      console.error(`[audit-log]   Events: ${session.events.length}`);
      console.error(`[audit-log]   Start: ${session.start_time}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(`[audit-log] fatal error: ${err}`);
  process.exit(0);
});
