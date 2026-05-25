import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve, basename } from 'path';

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    fm[key] = value;
  }
  return fm;
}

const projectRoot = resolve(process.cwd());
const agentsDir = join(projectRoot, 'agents');
const commandsDir = join(projectRoot, 'commands');
const manifestPath = join(projectRoot, '.augment-plugin', 'plugin.json');

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).filter((file) => file.endsWith('.md') && file !== 'AGENTS.md').sort();
}

describe('plugin entry names', () => {
  it('uses plain agent file names and frontmatter names', () => {
    const files = markdownFiles(agentsDir);
    expect(files).not.toContain(expect.stringMatching(/^oma-/));

    for (const file of files) {
      const expectedName = basename(file, '.md');
      const fm = parseFrontmatter(readFileSync(join(agentsDir, file), 'utf8'));
      expect(fm.name, `${file} frontmatter name`).toBe(expectedName);
    }
  });

  it('keeps the plugin manifest in sync with plain agent names', () => {
    const files = markdownFiles(agentsDir).map((file) => basename(file, '.md'));
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { agents?: string[] };

    expect(manifest.agents?.slice().sort()).toEqual(files);
    expect(manifest.agents ?? []).not.toContain(expect.stringMatching(/^oma-/));
  });

  it('uses plain command file names inside the OMA plugin namespace', () => {
    const files = markdownFiles(commandsDir);

    expect(files.length).toBeGreaterThan(0);
    expect(files).not.toContain(expect.stringMatching(/^oma-/));
  });
});
