import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadOmaState, resolveOmaDir } from '../utils.js';
// ─── Background update check ──────────────────────────────────────────────────
const UPDATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
function getUpdateCachePath() {
    // Get the directory of the compiled mjs (same dir as the hook itself)
    const hookDir = dirname(fileURLToPath(import.meta.url));
    const omaDir = join(hookDir, '..', '..', '..', '.oma');
    return join(omaDir, 'update-check.json');
}
function shouldCheckUpdate() {
    try {
        const cachePath = getUpdateCachePath();
        if (!existsSync(cachePath))
            return true;
        const cache = JSON.parse(readFileSync(cachePath, 'utf8'));
        const elapsed = Date.now() - new Date(cache.lastChecked).getTime();
        return elapsed > UPDATE_CACHE_TTL_MS;
    }
    catch {
        return true;
    }
}
function spawnBackgroundUpdateCheck() {
    if (!shouldCheckUpdate())
        return;
    // Fork this script with --update-check flag using node --eval approach
    const hookPath = fileURLToPath(import.meta.url);
    const checkScript = `
    const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
    const { join, dirname } = require('path');
    const https = require('https');

    const pkg = JSON.parse(readFileSync('${hookPath.replace(/'/g, "'\"'\"'")}'.replace('/src/hooks/session-start.mjs', '/package.json'), 'utf8'));
    const currentVersion = pkg.version;

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
      const omaDir = join('${hookPath.replace(/'/g, "'\"'\"'")}'.replace('/src/hooks/session-start.mjs', '/.oma'));
      try { mkdirSync(omaDir, { recursive: true }); } catch {}
      writeFileSync(join(omaDir, 'update-check.json'), JSON.stringify(cache, null, 2));
    }
    main().catch(() => {});
  `;
    const { spawn } = require('child_process');
    const child = spawn('node', ['-e', checkScript], {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
    });
    child.unref();
}
// ─── Main ─────────────────────────────────────────────────────────────────────
export function main() {
    const omaDir = resolveOmaDir();
    const stateFile = join(omaDir, 'state.json');
    const notepadFile = join(omaDir, 'notepad.json');
    let sessionContext = '';
    // ── Mode Injection ──────────────────────────────────────────────────────────
    try {
        const state = loadOmaState(omaDir);
        if (state.mode !== 'none' && state.active === true) {
            const task = typeof state.task === 'string' ? state.task : '';
            sessionContext += `[OMA MODE RESTORED] Active mode: ${state.mode}. Task: ${task}. Use /oma:status to check details. Use /oma:cancel to clear mode.`;
        }
    }
    catch {
        // State file doesn't exist or is invalid — no mode to restore
    }
    // ── Notepad Injection (Priority) ───────────────────────────────────────────
    try {
        const notepadContent = readFileSync(notepadFile, 'utf8');
        const notepad = JSON.parse(notepadContent);
        const priority = notepad.priority;
        if (priority && typeof priority === 'string' && priority.trim() !== '' && priority !== 'null') {
            if (sessionContext)
                sessionContext += '\n';
            sessionContext += `[OMA NOTEPAD - PRIORITY]\n${priority.trim()}`;
        }
    }
    catch {
        // Notepad file doesn't exist or is invalid
    }
    // ── Auggie Version Check ───────────────────────────────────────────────────
    const auggieVersion = process.env.AUGGIE_VERSION ?? 'unknown';
    if (auggieVersion !== 'unknown') {
        if (sessionContext)
            sessionContext += '\n';
        sessionContext += `[OMA] Running on Auggie ${auggieVersion}.`;
    }
    // ── Output ─────────────────────────────────────────────────────────────────
    if (sessionContext) {
        console.log(sessionContext);
    }
    // Non-blocking background update check
    try {
        spawnBackgroundUpdateCheck();
    }
    catch { /* ignore */ }
    process.exit(0);
}
main();
