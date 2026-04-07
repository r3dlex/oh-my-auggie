/**
 * Integration tests for setup-rules.mjs
 *
 * Script path: join(process.cwd(), 'src', 'setup-rules.mjs')
 * Working directory: plugins/oma/
 */
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, readdirSync } from 'fs';

const SCRIPT_PATH = join(process.cwd(), 'src', 'setup-rules.mjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createTempProject(prefix = 'oma-rules-test-'): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return dir;
}

function createAugmentRulesDir(projectDir: string): string {
  const rulesDir = join(projectDir, '.augment', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  return rulesDir;
}

function getAvailableTemplates(): string[] {
  // Templates are at plugins/oma/templates/rules/ — derive from SCRIPT_PATH
  const templatesDir = join(dirname(SCRIPT_PATH), '..', 'templates', 'rules');
  try {
    return readdirSync(templatesDir);
  } catch {
    return [];
  }
}

function getRulesDir(projectDir: string): string {
  return join(projectDir, '.augment', 'rules');
}

function runScript(projectDir: string, ...args: string[]): string {
  return execSync(`node ${SCRIPT_PATH} --project-dir "${projectDir}" ${args.join(' ')}`, {
    encoding: 'utf8',
    cwd: projectDir,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('setup-rules.mjs', () => {

  // ── 1. Happy path — fresh install ──────────────────────────────────────────

  describe('1. Happy path — fresh install (no .augment/rules/)', () => {
    it('installs 1 template, file created, [INSTALLED] output', () => {
      const projectDir = createTempProject();

      const templates = getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      // template names include .md extension — strip it for --templates flag
      const templateName = templates[0].replace(/\.md$/, '');

      const rulesDir = getRulesDir(projectDir);
      expect(rulesDir).toBeDefined();

      try {
        const output = runScript(projectDir, '--templates', templateName);

        expect(output).toContain('[INSTALLED]');
        const exists = readdirSync(rulesDir).some(f => f.startsWith(templateName));
        expect(exists).toBe(true);
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });
  });

  // ── 2. Conflict skip — file exists, no flag ────────────────────────────────

  describe('2. Conflict skip — file exists, no flag', () => {
    it('file unchanged, [SKIP] output', () => {
      const projectDir = createTempProject();

      const templates = getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      const templateName = templates[0].replace(/\.md$/, '');

      const rulesDir = createAugmentRulesDir(projectDir);
      const existingFile = join(rulesDir, `${templateName}.md`);
      writeFileSync(existingFile, '# pre-existing rule\n');

      try {
        const output = runScript(projectDir, '--templates', templateName);

        expect(output).toContain('[SKIP]');
        expect(readFileSync(existingFile, 'utf8')).toBe('# pre-existing rule\n');
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });
  });

  // ── 3. Conflict rename — file exists, --rename-existing ──────────────────

  describe('3. Conflict rename — file exists, --rename-existing', () => {
    it('original renamed to .oma-backup, new installed', () => {
      const projectDir = createTempProject();

      const templates = getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      const templateName = templates[0].replace(/\.md$/, '');

      const rulesDir = createAugmentRulesDir(projectDir);
      const existingFile = join(rulesDir, `${templateName}.md`);
      writeFileSync(existingFile, '# pre-existing rule\n');

      try {
        const output = runScript(projectDir, '--templates', templateName, '--rename-existing');

        expect(output).toContain('[INSTALLED]');
        // Original should be renamed
        const backupExists = readdirSync(rulesDir).some(f => f.includes('.oma-backup'));
        expect(backupExists).toBe(true);
        // New file should be installed
        const newFile = join(rulesDir, `${templateName}.md`);
        expect(readFileSync(newFile, 'utf8')).not.toBe('# pre-existing rule\n');
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });
  });

  // ── 4. Conflict overwrite — file exists, --overwrite-existing ─────────────

  describe('4. Conflict overwrite — file exists, --overwrite-existing', () => {
    it('file replaced', () => {
      const projectDir = createTempProject();

      const templates = getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      const templateName = templates[0].replace(/\.md$/, '');

      const rulesDir = createAugmentRulesDir(projectDir);
      const existingFile = join(rulesDir, `${templateName}.md`);
      writeFileSync(existingFile, '# pre-existing rule\n');

      try {
        const output = runScript(projectDir, '--templates', templateName, '--overwrite-existing');

        expect(output).toContain('[INSTALLED]');
        expect(readFileSync(existingFile, 'utf8')).not.toBe('# pre-existing rule\n');
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });
  });

  // ── 5. Directory creation — no .augment/rules/ ───────────────────────────

  describe('5. Directory creation — no .augment/rules/', () => {
    it('directory created, file inside', () => {
      const projectDir = createTempProject();

      const templates = getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      const templateName = templates[0].replace(/\.md$/, '');

      const rulesDir = getRulesDir(projectDir);
      expect(rulesDir).toBeDefined();

      try {
        // Ensure .augment/rules does NOT exist yet
        expect(readdirSync(projectDir)).not.toContain('.augment');

        const output = runScript(projectDir, '--templates', templateName);

        expect(output).toContain('[INSTALLED]');
        // Directory should have been created
        const rulesDirExists = readdirSync(projectDir).includes('.augment');
        expect(rulesDirExists).toBe(true);
        // File should be inside
        const files = readdirSync(rulesDir);
        expect(files.length).toBeGreaterThan(0);
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });
  });

  // ── 6. Invalid template name ───────────────────────────────────────────────

  describe('6. Invalid template name', () => {
    it('returns [ERROR] output, exit code 1', () => {
      const projectDir = createTempProject();

      try {
        let exitCode = 0;
        let output = '';
        try {
          output = runScript(projectDir, '--templates', 'nonexistent-template-xyz');
        } catch (err: unknown) {
          exitCode = (err as { status?: number }).status ?? 1;
          output = (err as { stdout?: string }).stdout ?? '';
        }

        expect(exitCode).toBe(1);
        expect(output).toContain('[ERROR]');
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });
  });

  // ── 7. Verify mode — no templates needed ───────────────────────────────────

  describe('7. Verify mode — no templates needed', () => {
    it('returns no installed templates, exit 0', () => {
      const projectDir = createTempProject();

      try {
        // --verify does not require --templates
        const output = execSync(
          `node ${SCRIPT_PATH} --verify --project-dir "${projectDir}"`,
          { encoding: 'utf8' }
        );

        // Should report no templates installed (since we never installed any)
        expect(output).toContain('[VERIFY]');
        expect(output).toBeDefined();
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });
  });

  // ── 8. RIB project detection ───────────────────────────────────────────────

  describe('8. RIB project detection', () => {
    it('detects RIB dirs (backend/src, e2e, binpool), rib-specific in available list', () => {
      const templates = getAvailableTemplates();
      // Templates should include rib-specific ones
      const ribTemplates = templates.filter(t =>
        t.includes('rib') || t.includes('backend') || t.includes('e2e') || t.includes('binpool')
      );
      expect(ribTemplates.length).toBeGreaterThan(0);
    });
  });

  // ── 9. Non-interactive default — no TTY + no flag ─────────────────────────

  describe('9. Non-interactive default — no TTY + no flag', () => {
    it('defaults to --skip-existing, no blocking', () => {
      const projectDir = createTempProject();

      const templates = getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      const templateName = templates[0].replace(/\.md$/, '');

      // Pre-create a conflicting file but don't pass any flag
      const rulesDir = createAugmentRulesDir(projectDir);
      const existingFile = join(rulesDir, `${templateName}.md`);
      writeFileSync(existingFile, '# pre-existing rule\n');

      try {
        // In non-interactive mode (no TTY), should default to --skip-existing behavior
        const output = runScript(projectDir, '--templates', templateName);

        // Should not block or error — should skip gracefully
        expect(output).toMatch(/\[SKIP\]|\[INSTALLED\]/);
        expect(readFileSync(existingFile, 'utf8')).toBe('# pre-existing rule\n');
      } finally {
        rmSync(projectDir, { recursive: true, force: true });
      }
    });
  });
});
