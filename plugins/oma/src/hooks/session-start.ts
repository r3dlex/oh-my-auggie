import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { getMergedConfig, loadOmaState, resolveOmaDir, resolveProjectDir } from '../utils.js';
import { emitHookEvent } from '../super-oma-events.js';

// ─── Background update check ──────────────────────────────────────────────────

const UPDATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface UpdateCache {
  latestVersion: string;
  lastChecked: string; // ISO
  updateAvailable: boolean;
}

function shouldCheckUpdate(cacheDir: string): boolean {
  try {
    const cacheFile = join(cacheDir, 'update-check.json');
    if (!existsSync(cacheFile)) return true;
    const cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
    const lastChecked = new Date(cache.lastChecked);
    const hoursSince = (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60);
    return hoursSince >= 1;
  } catch { return true; }
}

function spawnBackgroundUpdateCheck(checkScript: string): void {
  const { spawn } = require('child_process');
  const child = spawn('node', ['-e', checkScript], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function main(): void {
  const cacheDir = resolveOmaDir();
  const pluginRoot = process.env.AUGMENT_PLUGIN_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const pkgJsonPath = join(pluginRoot, 'package.json');

  const omaDir = cacheDir;
  const notepadFile = join(omaDir, 'notepad.json');

  let sessionContext = '';

  // ── Mode Injection ──────────────────────────────────────────────────────────

  let state: ReturnType<typeof loadOmaState>;
  try {
    state = loadOmaState(omaDir);
    if (state.mode !== 'none' && state.active === true) {
      const task = typeof state.task === 'string' ? state.task : '';
      sessionContext += `[OMA MODE RESTORED] Active mode: ${state.mode}. Task: ${task}. Use /oma:status to check details. Use /oma:cancel to clear mode.`;
    }
  } catch {
    // State file doesn't exist or is invalid — no mode to restore
    state = { mode: 'none', active: false };
  }

  // ── Notepad Injection (Priority) ───────────────────────────────────────────

  try {
    const notepadContent = readFileSync(notepadFile, 'utf8');
    const notepad = JSON.parse(notepadContent) as Record<string, unknown>;
    const priority = notepad.priority;
    if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
      if (sessionContext) sessionContext += '\n';
      sessionContext += `[OMA NOTEPAD - PRIORITY]\n${priority.trim()}`;
    }
  } catch {
    // Notepad file doesn't exist or is invalid
  }

  // ── Auggie Version Check ───────────────────────────────────────────────────

  const auggieVersion = process.env.AUGGIE_VERSION ?? 'unknown';
  if (auggieVersion !== 'unknown') {
    if (sessionContext) sessionContext += '\n';
    sessionContext += `[OMA] Running on Auggie ${auggieVersion}.`;
  }

  // ── Graph Provider Injection ───────────────────────────────────────────────

  try {
    const config = getMergedConfig();
    const provider = (config.graph?.provider as string) ?? 'graphwiki';
    if (provider !== 'none') {
      const projectDir = resolveProjectDir();
      if (provider === 'graphwiki') {
        const reportPath = join(projectDir, 'graphwiki-out', 'GRAPH_REPORT.md');
        if (existsSync(reportPath)) {
          if (sessionContext) sessionContext += '\n';
          sessionContext += '[OMA Graph] graphwiki active.\n1. Read graphwiki-out/GRAPH_REPORT.md for project overview\n2. Read graphwiki-out/wiki/index.md for page directory\n3. Use `graphwiki query "<question>"` for targeted lookups\n4. Use `graphwiki path <nodeA> <nodeB>` for structural queries\n5. Max 3 wiki pages per query. Avoid reading raw source files.';
        } else {
          if (sessionContext) sessionContext += '\n';
          sessionContext += '[OMA Graph] graphwiki: building knowledge graph for first time. This runs in the background.';
          try {
            const child = spawn('graphwiki', ['build', '.'], {
              cwd: projectDir,
              detached: true,
              stdio: 'ignore',
            });
            child.unref();
          } catch {
            sessionContext += '\ngraphwiki not found. Install: npm install -g graphwiki';
          }
        }
      } else if (provider === 'graphify') {
        const reportPath = join(projectDir, 'graphify-out', 'GRAPH_REPORT.md');
        if (existsSync(reportPath)) {
          if (sessionContext) sessionContext += '\n';
          sessionContext += '[OMA Graph] graphify active.\n1. Read graphify-out/GRAPH_REPORT.md for project overview\n2. Use `/graphify query "<question>"` for targeted lookups (BFS)\n3. Use `/graphify query "<question>" --dfs` to trace specific paths\n4. Use `/graphify path "<nodeA>" "<nodeB>"` for shortest-path queries\n5. Avoid reading raw source files unless graph data is insufficient.';
        } else {
          if (sessionContext) sessionContext += '\n';
          sessionContext += '[OMA Graph] graphify configured but no output found. Run: /graphify .';
        }
      }
    }
  } catch {
    // Config not available or invalid -- skip graph injection
  }

  // ── HUD auto-display ───────────────────────────────────────────────────────
  try {
    if (state['hud-active'] === true) {
      const hud = {
        type: 'hud',
        display: true,
        mode: state.mode ?? 'none',
        active: state.active ?? false,
        task: state.task ?? '',
        position: state['hud-position'] ?? 'top-right',
        opacity: state['hud-opacity'] ?? 0.8,
        elements: state['hud-elements'] ?? {
          mode: true, iteration: true, tokens: false,
          time: true, agents: true, progress: true,
        },
      };
      console.log('\n[OMA HUD]' + JSON.stringify(hud));
    }
  } catch { /* ignore */ }

  // ── Output ─────────────────────────────────────────────────────────────────

  if (sessionContext) {
    console.log(sessionContext);
  }

  emitHookEvent({
    kind: 'session_started',
    mode: state.mode,
    status: state.active ? 'active' : 'idle',
    message: 'SessionStart hook initialized',
  });

  // Non-blocking background update check
  try {
    if (!shouldCheckUpdate(cacheDir)) return;
    const checkScript = `
      const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
      const { join } = require('path');
      const https = require('https');
      const pkg = JSON.parse(readFileSync(${JSON.stringify(pkgJsonPath)}, 'utf8'));
      const currentVersion = pkg.version;
      const cacheDir = ${JSON.stringify(cacheDir)};

      function fetchLatestVersion() {
        return new Promise((resolve) => {
          https.get('https://api.github.com/repos/r3dlex/oh-my-auggie/releases/latest', {
            headers: { 'User-Agent': 'oma-update-check' }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const release = JSON.parse(data);
                resolve(release.tag_name?.replace(/^v/, '') || currentVersion);
              } catch { resolve(currentVersion); }
            });
          }).on('error', () => resolve(currentVersion));
        });
      }

      async function main() {
        const latestVersion = await fetchLatestVersion();
        const cache = {
          currentVersion,
          latestVersion,
          lastChecked: new Date().toISOString(),
          updateAvailable: latestVersion !== currentVersion
        };
        try { mkdirSync(cacheDir, { recursive: true }); } catch {}
        writeFileSync(join(cacheDir, 'update-check.json'), JSON.stringify(cache, null, 2));
      }
      main().catch(() => {});
    `;
    spawnBackgroundUpdateCheck(checkScript);
  } catch { /* ignore */ }

  process.exit(0);
}

main();
