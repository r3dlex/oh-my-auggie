#!/usr/bin/env node
/**
 * setup-rules.mjs — Standalone ESM script for rule template installation.
 *
 * Usage:
 *   node setup-rules.mjs --project-dir <path> --templates <list> [options]
 *   node setup-rules.mjs --verify --project-dir <path>
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

/**
 * @param {string[]} argv
 * @returns {Record<string, string | string[] | boolean>}
 */
function parseArgs(argv) {
  const args = {};
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

function print(msg) {
  process.stdout.write(msg + '\n');
}

function inst(p)  { print(`[INSTALLED] ${p}`); }
function skip(p)  { print(`[SKIP]      ${p}`); }
function conflict(p) { print(`[CONFLICT]  ${p}`); }
function error(reason) { print(`[ERROR]     ${reason}`); }

function usage() {
  print(`Usage: node setup-rules.mjs --project-dir <path> --templates <list> [options]

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

/**
 * Ensure directory exists (recursive).
 * @param {string} dir
 */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Install a single rule template.
 * @param {string} name
 * @param {string} projectDir
 * @param {{ overwriteExisting?: boolean, renameExisting?: boolean, skipExisting?: boolean }} policy
 * @returns {{ status: 'installed'|'skipped'|'conflict'|'error', path?: string, reason?: string }}
 */
function installTemplate(name, projectDir, policy) {
  const src = path.join(TEMPLATES_DIR, `${name}.md`);
  const targetDir = path.join(projectDir, '.augment', 'rules');
  const target = path.join(targetDir, `${name}.md`);

  // Check source exists
  if (!fs.existsSync(src)) {
    return { status: 'error', reason: `template "${name}" not found in ${TEMPLATES_DIR}` };
  }

  // Ensure target directory
  ensureDir(targetDir);

  // Handle existing target
  if (fs.existsSync(target)) {
    if (policy.overwriteExisting) {
      // No extra work needed — fs.copyFileSync will overwrite
    } else if (policy.renameExisting) {
      const backup = target + '.oma-backup';
      fs.renameSync(target, backup);
    } else {
      // skipExisting (default in non-interactive)
      return { status: 'skipped', path: target };
    }
  }

  fs.copyFileSync(src, target);
  return { status: 'installed', path: target };
}

/**
 * Verify installed rule templates in a project.
 * @param {string} projectDir
 * @returns {{ status: 'ok', templates: string[] }}
 */
function verify(projectDir) {
  const rulesDir = path.join(projectDir, '.augment', 'rules');

  if (!fs.existsSync(rulesDir)) {
    return { status: 'ok', templates: [] };
  }

  const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md') && !f.endsWith('.oma-backup'));
  return { status: 'ok', templates: files.map((f) => f.replace(/\.md$/, '')) };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(argv) {
  const args = parseArgs(argv);

  if (args.help) {
    usage();
    process.exit(0);
  }

  if (args.verify) {
    // --verify: report installed templates, exit 0, never block
    if (!args.projectDir) {
      error('--verify requires --project-dir');
      process.exit(1);
    }
    const result = verify(args.projectDir);
    if (result.templates.length === 0) {
      print(`[VERIFY]    No rule templates installed in ${path.join(args.projectDir, '.augment', 'rules')}`);
    } else {
      for (const t of result.templates) {
        print(`[INSTALLED] ${path.join(args.projectDir, '.augment', 'rules', t + '.md')}`);
      }
    }
    process.exit(0);
  }

  // Normal install mode
  if (!args.projectDir) {
    error('--project-dir is required');
    process.exit(1);
  }
  if (!args.templates || args.templates.length === 0) {
    error('--templates is required (or use --verify)');
    process.exit(1);
  }

  const policy = {
    overwriteExisting: !!args.overwriteExisting,
    renameExisting:   !!args.renameExisting,
    skipExisting:      !!args.skipExisting || (!args.overwriteExisting && !args.renameExisting), // non-interactive default
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
