#!/usr/bin/env node
// OMA MCP State Server — zero npm dependencies, stdio transport
// Implements: state_read, state_write, mode_get, mode_set, task_log, notepad_read, notepad_write, skill_list, skill_inject, oma_config_read, oma_config_write, oma_config_reset

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'fs';
import { createInterface } from 'readline';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

// OMA_DIR is derived from the script's location: <plugin-root>/.oma
// This ensures state is always stored in the plugin's .oma dir regardless of cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OMA_DIR = join(__dirname, '..', '.oma');
const STATE_FILE = `${OMA_DIR}/state.json`;
const NOTEPAD_FILE = `${OMA_DIR}/notepad.json`;
const TASK_LOG_FILE = `${OMA_DIR}/task.log.json`;

// ── State helpers ────────────────────────────────────────────────────────────

function ensureOmaDir() {
  if (!existsSync(OMA_DIR)) {
    mkdirSync(OMA_DIR, { recursive: true });
  }
}

function readState() {
  ensureOmaDir();
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  ensureOmaDir();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function readNotepad() {
  ensureOmaDir();
  if (!existsSync(NOTEPAD_FILE)) return { priority: '', working: '', manual: '' };
  try {
    return JSON.parse(readFileSync(NOTEPAD_FILE, 'utf8'));
  } catch {
    return { priority: '', working: '', manual: '' };
  }
}

function writeNotepad(notepad) {
  ensureOmaDir();
  writeFileSync(NOTEPAD_FILE, JSON.stringify(notepad, null, 2));
}

function readTaskLog() {
  ensureOmaDir();
  if (!existsSync(TASK_LOG_FILE)) return [];
  try {
    return JSON.parse(readFileSync(TASK_LOG_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function appendTaskLog(entry) {
  ensureOmaDir();
  const log = readTaskLog();
  log.push({ ...entry, timestamp: new Date().toISOString() });
  writeFileSync(TASK_LOG_FILE, JSON.stringify(log, null, 2));
}

function readJsonSafe(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

// ── Two-tiered config helpers ───────────────────────────────────────────────

const DEFAULT_CONFIG = {
  version: '1.0',
  hud: { enabled: true, style: 'default' },
  orchestration: { mode: 'ralph', maxIterations: 100 },
  paths: { omaDir: '~/.oma', plansDir: '~/.oma/plans' },
  profile: 'default'
};

function expandTilde(p) {
  if (typeof p !== 'string') return p;
  if (p.startsWith('~/') || p === '~') {
    return resolve(homedir(), p.slice(2));
  }
  return p;
}

function resolveGlobalOmaDir() {
  return expandTilde('~/.oma');
}

function resolveLocalOmaDir() {
  return expandTilde('.oma');
}

function loadJsonFileSafe(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function saveJsonFileSafe(path, data) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + '.tmp.' + Date.now();
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  try {
    renameSync(tmp, path);
  } catch (err) {
    if (err.code === 'EXDEV') {
      writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
    } else {
      throw err;
    }
  }
}

function deepMerge(base, overlay) {
  const result = { ...base };
  for (const key of Object.keys(overlay ?? {})) {
    if (typeof overlay[key] === 'object' && overlay[key] !== null && !Array.isArray(overlay[key])) {
      const baseObj = base[key] ?? {};
      result[key] = { ...baseObj, ...overlay[key] };
    } else {
      result[key] = overlay[key];
    }
  }
  return result;
}

function getMergedConfig() {
  const globalPath = resolveGlobalOmaDir();
  const localPath = resolveLocalOmaDir();
  const globalConfig = loadJsonFileSafe(join(globalPath, 'config.json')) ?? {};
  const localConfig = loadJsonFileSafe(join(localPath, 'config.json')) ?? {};
  let merged = deepMerge(DEFAULT_CONFIG, globalConfig);
  merged = deepMerge(merged, localConfig);
  if (globalConfig.profile !== undefined) {
    merged.profile = globalConfig.profile;
  }
  return merged;
}

function getConfigKey(key) {
  const config = getMergedConfig();
  const parts = key.split('.');
  let value = config;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  return value;
}

function setConfigKey(key, value, scope = 'global') {
  const basePath = scope === 'global' ? resolveGlobalOmaDir() : resolveLocalOmaDir();
  const configPath = join(basePath, 'config.json');
  const config = loadJsonFileSafe(configPath) ?? { ...DEFAULT_CONFIG };
  const parts = key.split('.');
  let target = config;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in target)) target[parts[i]] = {};
    target = target[parts[i]];
  }
  target[parts[parts.length - 1]] = value;
  saveJsonFileSafe(configPath, config);
  return config;
}

function resetConfig(scope = 'global') {
  const basePath = scope === 'global' ? resolveGlobalOmaDir() : resolveLocalOmaDir();
  const configPath = join(basePath, 'config.json');
  if (existsSync(configPath)) {
    require('fs').unlinkSync(configPath);
  }
}

// ── JSON-RPC response helpers ────────────────────────────────────────────────

function jsonRpcError(id, code, message) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
}

function jsonRpcResult(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result });
}

// ── Tool handlers ────────────────────────────────────────────────────────────

const tools = {
  oma_state_read: {
    description: 'Read a value from OMA state',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'State key to read' }
      },
      required: ['key']
    },
    handler: ({ key }) => {
      const state = readState();
      return { value: state[key] ?? null };
    }
  },

  oma_state_write: {
    description: 'Write a key-value pair to OMA state',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'State key' },
        value: { description: 'Value to store (any JSON-serializable)' }
      },
      required: ['key']
    },
    handler: ({ key, value }) => {
      const state = readState();
      state[key] = value;
      writeState(state);
      return { ok: true };
    }
  },

  oma_mode_get: {
    description: 'Get the current OMA orchestration mode',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const state = readState();
      return { mode: state.mode ?? null, active: state.active ?? false };
    }
  },

  oma_mode_set: {
    description: 'Set the current OMA orchestration mode',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'Mode to set (e.g. ralph, autopilot, ultrawork)' },
        active: { type: 'boolean', description: 'Whether mode is active' }
      },
      required: ['mode']
    },
    handler: ({ mode, active = true }) => {
      const state = readState();
      state.mode = mode;
      state.active = active;
      writeState(state);
      return { ok: true, mode, active };
    }
  },

  oma_task_log: {
    description: 'Log a task completion entry',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent name (e.g. oma-architect)' },
        status: { type: 'string', description: 'Status (PASS, FAIL, PARTIAL)' },
        summary: { type: 'string', description: 'Brief summary of task outcome' }
      },
      required: ['agent', 'status', 'summary']
    },
    handler: ({ agent, status, summary }) => {
      appendTaskLog({ agent, status, summary });
      return { ok: true };
    }
  },

  oma_notepad_read: {
    description: 'Read OMA notepad sections',
    inputSchema: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: ['priority', 'working', 'manual'], description: 'Section to read' }
      }
    },
    handler: ({ section } = {}) => {
      const notepad = readNotepad();
      if (section) {
        return { [section]: notepad[section] ?? '' };
      }
      return notepad;
    }
  },

  oma_notepad_write: {
    description: 'Write to an OMA notepad section',
    inputSchema: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: ['priority', 'working', 'manual'], description: 'Section to write' },
        content: { type: 'string', description: 'Content to write' }
      },
      required: ['section', 'content']
    },
    handler: ({ section, content }) => {
      const notepad = readNotepad();
      notepad[section] = content;
      writeNotepad(notepad);
      return { ok: true, section };
    }
  },

  oma_skill_list: {
    description: 'List available OMA skills',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' }
      }
    },
    handler: ({ category } = {}) => {
      const { readFileSync, readdirSync, existsSync } = { readFileSync, readdirSync, existsSync };
      const skillsDir = 'plugins/oma/skills';
      const skills = [];

      if (existsSync(skillsDir)) {
        try {
          const skillDirs = readdirSync(skillsDir).filter(f => {
            const fullPath = `${skillsDir}/${f}`;
            return existsSync(`${fullPath}/SKILL.md`);
          });

          for (const dir of skillDirs) {
            const skillPath = `${skillsDir}/${dir}/SKILL.md`;
            try {
              const content = readFileSync(skillPath, 'utf8');
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (frontmatterMatch) {
                const fm = frontmatterMatch[1];
                const nameMatch = fm.match(/^name:\s*(.+)$/m);
                const descMatch = fm.match(/^description:\s*(.+)$/m);
                const catMatch = fm.match(/^category:\s*(.+)$/m);
                const name = nameMatch ? nameMatch[1].trim() : dir;
                const skillDesc = descMatch ? descMatch[1].trim() : '';
                const skillCat = catMatch ? catMatch[1].trim() : 'general';

                if (!category || skillCat === category) {
                  skills.push({ name, description: skillDesc, category: skillCat, path: skillPath });
                }
              }
            } catch (e) {
              // Skip malformed skill files
            }
          }
        } catch (e) {
          // Skills directory not accessible
        }
      }

      return { skills, count: skills.length };
    }
  },

  oma_skill_inject: {
    description: 'Inject a skill context into the current session',
    inputSchema: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'Skill name to inject' },
        prompt: { type: 'string', description: 'Optional additional prompt context' }
      },
      required: ['skill']
    },
    handler: ({ skill, prompt } = {}) => {
      const { readFileSync, existsSync } = { readFileSync, existsSync };
      const skillPath = `plugins/oma/skills/${skill}/SKILL.md`;

      if (!existsSync(skillPath)) {
        return { ok: false, error: `Skill not found: ${skill}` };
      }

      try {
        const content = readFileSync(skillPath, 'utf8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
        const bodyContent = frontmatterMatch ? content.replace(/^---[\s\S]*?\n---\n*/, '') : content;

        return {
          ok: true,
          skill,
          content: bodyContent.trim(),
          prompt: prompt || null
        };
      } catch (e) {
        return { ok: false, error: `Failed to read skill: ${e.message}` };
      }
    }
  },

  oma_team_status: {
    description: 'Read status of all OMA team workers',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const teamDir = `${OMA_DIR}/team`;
      if (!existsSync(teamDir)) {
        return { ok: true, workers: [] };
      }
      try {
        const entries = readdirSync(teamDir).filter(n => /^worker-\d+$/.test(n));
        const workers = [];
        for (const entry of entries) {
          const dir = `${teamDir}/${entry}`;
          const id = parseInt(entry.split('-')[1], 10);
          const meta = readJsonSafe(`${dir}/meta.json`, null);
          const status = readJsonSafe(`${dir}/status.json`, null);
          workers.push({
            id,
            status: status?.status || 'unknown',
            pid: status?.pid || null,
            parent_pid: meta?.parent_pid || null,
            spawned_at: meta?.spawned_at || null,
            log_path: `${dir}/log.txt`,
          });
        }
        return { ok: true, workers };
      } catch (e) {
        return { ok: false, error: e.message, workers: [] };
      }
    }
  },

  oma_team_stream: {
    description: 'Stream recent activity from all OMA team workers',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const teamDir = `${OMA_DIR}/team`;
      if (!existsSync(teamDir)) {
        return { ok: true, streams: [] };
      }
      try {
        const entries = readdirSync(teamDir).filter(n => /^worker-\d+$/.test(n));
        const streams = [];
        for (const entry of entries) {
          const id = parseInt(entry.split('-')[1], 10);
          const dir = `${teamDir}/${entry}`;
          const status = readJsonSafe(`${dir}/status.json`, null);
          const logPath = `${dir}/log.txt`;
          let excerpt = [];
          if (existsSync(logPath)) {
            try {
              const content = readFileSync(logPath, 'utf8');
              excerpt = content.split('\n').filter(l => l.length > 0).slice(-20);
            } catch { /* ignore */ }
          }
          streams.push({ id, status: status?.status || 'unknown', excerpt });
        }
        return { ok: true, streams };
      } catch (e) {
        return { ok: false, error: e.message, streams: [] };
      }
    }
  },

  oma_config_read: {
    description: 'Read the merged OMA config (global + local, with defaults applied)',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      return { config: getMergedConfig() };
    }
  },

  oma_config_write: {
    description: 'Write a config key-value pair (default scope: global)',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Config key (dot notation, e.g. "hud.style")' },
        value: { description: 'Value to set' },
        scope: { type: 'string', enum: ['global', 'local'], description: 'Config scope', default: 'global' }
      },
      required: ['key', 'value']
    },
    handler: ({ key, value, scope = 'global' }) => {
      // profile is global-only
      if (key === 'profile' && scope === 'local') {
        const current = getMergedConfig();
        return { ok: false, warning: `profile is global-only and cannot be overridden locally. Current profile: ${current.profile}` };
      }
      setConfigKey(key, value, scope);
      return { ok: true, key, value, scope };
    }
  },

  oma_config_reset: {
    description: 'Reset config file to defaults (scope: global or local)',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['global', 'local'], description: 'Config scope to reset', default: 'global' }
      }
    },
    handler: ({ scope = 'global' }) => {
      resetConfig(scope);
      return { ok: true, scope };
    }
  }
};

// ── MCP protocol handlers ────────────────────────────────────────────────────

function handleInitialize(id, params) {
  return {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: {
      name: 'oma-state-server',
      version: '0.1.0'
    }
  };
}

function handleToolsList() {
  return {
    tools: Object.entries(tools).map(([name, t]) => ({
      name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  };
}

function handleToolsCall(name, args) {
  const tool = tools[name];
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.handler(args ?? {});
}

// ── JSON-RPC request parser ─────────────────────────────────────────────────

let requestId = null;
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', (line) => {
  if (!line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
  } catch {
    process.stderr.write(jsonRpcError(null, -32700, 'Parse error') + '\n');
    return;
  }

  const id = request.id ?? null;

  try {
    if (request.method === 'initialize') {
      const result = handleInitialize(id, request.params);
      process.stdout.write(jsonRpcResult(id, result) + '\n');
    } else if (request.method === 'tools/list') {
      const result = handleToolsList();
      process.stdout.write(jsonRpcResult(id, result) + '\n');
    } else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params ?? {};
      const result = handleToolsCall(name, args);
      process.stdout.write(jsonRpcResult(id, result) + '\n');
    } else {
      process.stdout.write(jsonRpcError(id, -32601, `Method not found: ${request.method}`) + '\n');
    }
  } catch (err) {
    process.stderr.write(`[oma-state-server error] ${err.message}\n`);
    process.stdout.write(jsonRpcError(id, -32603, err.message) + '\n');
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});
