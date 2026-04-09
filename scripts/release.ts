#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const PKG_PATH = join(ROOT, 'plugins/oma/package.json');
const OMA_PLUGIN_PATH = join(ROOT, 'plugins/oma/.augment-plugin/plugin.json');
const MARKETPLACE_PATH = join(ROOT, '.claude-plugin/marketplace.json');
const PLUGIN_PATH = join(ROOT, '.claude-plugin/plugin.json');

const c = { reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m' };
const clr = (text: string, code: string) => `${code}${text}${c.reset}`;

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
  const v = pkg.version as string;
  if (!v) { console.error(clr('ERROR: No version field in package.json', c.red)); process.exit(1); }
  return v;
}

function parseVersion(v: string): { major: number; minor: number; patch: number; prerelease: string } {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!m) { console.error(clr(`ERROR: Invalid version: "${v}"`, c.red)); process.exit(1); }
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ?? '' };
}

function bumpVersion(current: string, arg: string): string {
  const { major, minor, patch, prerelease } = parseVersion(current);
  const pre = prerelease ? `-${prerelease}` : '';
  switch (arg) {
    case 'patch': return `${major}.${minor}.${patch + 1}${pre}`;
    case 'minor': return `${major}.${minor + 1}.0${pre}`;
    case 'major': return `${major + 1}.0.0${pre}`;
    default: {
      if (/^\d+\.\d+\.\d+$/.test(arg)) return arg + pre;
      console.error(clr(`ERROR: Invalid argument "${arg}". Use patch, minor, major, or X.Y.Z`, c.red));
      process.exit(1);
    }
  }
}

function replaceVersion(content: string, newVersion: string): string {
  return content.replace(/"version":\s*"[^"]*"/g, `"version": "${newVersion}"`);
}

interface VersionFile { path: string; exists: boolean }
function getFilesToUpdate(): VersionFile[] {
  return [
    { path: PKG_PATH, exists: existsSync(PKG_PATH) },
    { path: OMA_PLUGIN_PATH, exists: existsSync(OMA_PLUGIN_PATH) },
    { path: MARKETPLACE_PATH, exists: existsSync(MARKETPLACE_PATH) },
    { path: PLUGIN_PATH, exists: existsSync(PLUGIN_PATH) },
  ];
}

function updateVersions(newVersion: string, dryRun: boolean): void {
  const files = getFilesToUpdate();
  const missing = files.filter(f => !f.exists);
  if (missing.length > 0) {
    missing.forEach(f => console.error(clr(`ERROR: File not found: ${f.path}`, c.red)));
    process.exit(1);
  }
  for (const file of files) {
    const content = readFileSync(file.path, 'utf8');
    const updated = replaceVersion(content, newVersion);
    if (dryRun) {
      if (content !== updated) console.log(clr(`[DRY-RUN] Would update: ${file.path}`, c.yellow));
    } else {
      if (content !== updated) {
        writeFileSync(file.path, updated, 'utf8');
        console.log(clr(`[OK] Updated: ${file.path}`, c.green));
      } else {
        console.log(clr(`[SKIP] Unchanged: ${file.path}`, c.yellow));
      }
    }
  }
  if (dryRun) {
    console.log(clr('[DRY-RUN] Would regenerate: plugins/oma/package-lock.json', c.yellow));
  } else {
    try {
      execSync('npm install --package-lock-only', { cwd: join(ROOT, 'plugins/oma'), stdio: 'pipe' });
      console.log(clr('[OK] Regenerated: plugins/oma/package-lock.json', c.green));
    } catch {
      console.error(clr('ERROR: Failed to regenerate package-lock.json', c.red));
      process.exit(1);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const bumpArg = args.find(a => !a.startsWith('-'));

  if (!bumpArg) {
    console.error(clr('Usage: tsx scripts/release.ts <patch|minor|major|X.Y.Z> [--dry-run]', c.red));
    process.exit(1);
  }

  const current = getCurrentVersion();
  const newVersion = bumpVersion(current, bumpArg);

  console.log(clr('Release Version Bump', c.reset));
  console.log(`  Current:  ${clr(current, c.yellow)}`);
  console.log(`  New:     ${clr(newVersion, c.green)}`);
  console.log(`  Mode:    ${dryRun ? clr('DRY-RUN (no files will be modified)', c.yellow) : clr('LIVE (files will be updated)', c.green)}`);
  console.log('');

  updateVersions(newVersion, dryRun);
  console.log('');
  if (dryRun) {
    console.log(clr('DRY-RUN complete. Run without --dry-run to apply changes.', c.yellow));
  } else {
    console.log(clr('Version bump complete. Next: git add -A && git commit -m "chore(release): bump version"', c.green));
  }
}

main().catch((err: unknown) => {
  console.error(clr(`ERROR: ${err instanceof Error ? err.message : String(err)}`, c.red));
  process.exit(1);
});
