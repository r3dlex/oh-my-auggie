#!/usr/bin/env node
/**
 * setup-rules.ts — Standalone ESM script for rule template installation.
 *
 * Usage:
 *   node setup-rules.js --project-dir <path> --templates <list> [options]
 *   node setup-rules.js --verify --project-dir <path>
 *
 * Options:
 *   --project-dir <path>       Target project directory (required unless --verify)
 *   --templates <list>        Comma-separated template names (required unless --verify)
 *   --overwrite-existing       Overwrite if target file exists
 *   --rename-existing          Rename existing to <name>.md.oma-backup before install
 *   --skip-existing            Skip if target exists (default in non-interactive)
 *   --verify                   Report installed templates, exit 0, never block
 *   --help                     Print usage and exit 0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Self-location ───────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'rules');

// ─── Argument parsing ────────────────────────────────────────────────────────

interface ParsedArgs {
  projectDir?: string;
  templates?: string[];
  overwriteExisting?: boolean;
  renameExisting?: boolean;
  skipExisting?: boolean;
  verify?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};
  let i = 0;

  while (i < argv.length) {
    const key = argv[i];

    if (key === '--project-dir') {
      args.projectDir = argv[++i];
    } else if (key === '--templates') {
      args.templates = argv[++i].split(',').map((t) => t.trim()).filter(Boolean);
    } else if (key === '--overwrite-existing') {
      args.overwriteExisting = true;
    } else if (key === '--rename-existing') {
      args.renameExisting = true;
    } else if (key === '--skip-existing') {
      args.skipExisting = true;
    } else if (key === '--verify') {
      args.verify = true;
    } else if (key === '--help' || key === '-h') {
      args.help = true;
    }

    i++;
  }

  return args;
}

// ─── Output helpers ────────────────────────────────────────────────────────────

function print(msg: string): void {
  process.stdout.write(msg + '\n');
}

function inst(p: string | undefined): void  { print(`[INSTALLED] ${p}`); }
function skip(p: string | undefined): void  { print(`[SKIP]      ${p}`); }
function conflict(p: string | undefined): void { print(`[CONFLICT]  ${p}`); }
function error(reason: string | undefined): void { print(`[ERROR]     ${reason}`); }

function usage(): void {
  print(`Usage: node setup-rules.js --project-dir <path> --templates <list> [options]

Options:
  --project-dir <path>       Target project directory (required unless --verify)
  --templates <list>         Comma-separated template names (required unless --verify)
  --overwrite-existing       Overwrite if target file exists
  --rename-existing          Rename existing to <name>.md.oma-backup before install
  --skip-existing            Skip if target exists (default in non-interactive)
  --verify                   Report installed templates, exit 0, never block
  --help                     Print this message and exit 0

Exit codes:
  0  Success (or --verify with no fatal errors)
  1  Fatal error (missing args, I/O failure)
`);
}

// ─── Core logic ───────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

interface InstallPolicy {
  overwriteExisting: boolean;
  renameExisting: boolean;
  skipExisting: boolean;
}

interface InstallResult {
  status: 'installed' | 'skipped' | 'conflict' | 'error';
  path?: string;
  reason?: string;
}

function installTemplate(name: string, projectDir: string, policy: InstallPolicy): InstallResult {
  const src = path.join(TEMPLATES_DIR, `${name}.md`);
  const targetDir = path.join(projectDir, '.augment', 'rules');
  const target = path.join(targetDir, `${name}.md`);

  if (!fs.existsSync(src)) {
    return { status: 'error', reason: `template "${name}" not found in ${TEMPLATES_DIR}` };
  }

  ensureDir(targetDir);

  if (fs.existsSync(target)) {
    if (policy.overwriteExisting) {
      // No extra work needed — fs.copyFileSync will overwrite
    } else if (policy.renameExisting) {
      const backup = target + '.oma-backup';
      fs.renameSync(target, backup);
    } else {
      return { status: 'skipped', path: target };
    }
  }

  fs.copyFileSync(src, target);
  return { status: 'installed', path: target };
}

interface VerifyResult {
  status: 'ok';
  templates: string[];
}

function verify(projectDir: string): VerifyResult {
  const rulesDir = path.join(projectDir, '.augment', 'rules');

  if (!fs.existsSync(rulesDir)) {
    return { status: 'ok', templates: [] };
  }

  const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md') && !f.endsWith('.oma-backup'));
  return { status: 'ok', templates: files.map((f) => f.replace(/\.md$/, '')) };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(argv: string[]): void {
  const args = parseArgs(argv);

  if (args.help) {
    usage();
    process.exit(0);
  }

  if (args.verify) {
    if (!args.projectDir) {
      error('--verify requires --project-dir');
      process.exit(1);
    }
    const result = verify(args.projectDir);
    if (result.templates.length === 0) {
      print(`[VERIFY]    No rule templates installed in ${path.join(args.projectDir, '.augment', 'rules')}`);
    } else {
      for (const t of result.templates) {
        print(`[INSTALLED] ${path.join(args.projectDir ?? '', '.augment', 'rules', t + '.md')}`);
      }
    }
    process.exit(0);
  }

  if (!args.projectDir) {
    error('--project-dir is required');
    process.exit(1);
  }
  if (!args.templates || args.templates.length === 0) {
    error('--templates is required (or use --verify)');
    process.exit(1);
  }

  const policy: InstallPolicy = {
    overwriteExisting: !!args.overwriteExisting,
    renameExisting:   !!args.renameExisting,
    skipExisting:      !!args.skipExisting || (!args.overwriteExisting && !args.renameExisting),
  };

  let hasError = false;

  for (const name of args.templates) {
    const result = installTemplate(name, args.projectDir, policy);

    switch (result.status) {
      case 'installed':
        inst(result.path);
        break;
      case 'skipped':
        skip(result.path);
        break;
      case 'conflict':
        conflict(result.path);
        break;
      case 'error':
        error(result.reason);
        hasError = true;
        break;
    }
  }

  process.exit(hasError ? 1 : 0);
}

main(process.argv.slice(2));
