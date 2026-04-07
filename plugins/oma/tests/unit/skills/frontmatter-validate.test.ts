import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, unknown> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    fm[key] = value;
  }
  return fm;
}

describe('frontmatter validation', () => {
  const skillsDir = resolve('skills');
  const skillDirs = readdirSync(skillsDir).filter(d =>
    readdirSync(join(skillsDir, d)).includes('SKILL.md')
  );

  it.each(skillDirs)('skill %s has valid frontmatter', (skillDir) => {
    const skillPath = join(skillsDir, skillDir, 'SKILL.md');
    const content = readFileSync(skillPath, 'utf8');
    const fm = parseFrontmatter(content);
    expect(typeof fm['name'], `skill ${skillDir} missing 'name'`).toBe('string');
    expect((fm['name'] as string).length, `skill ${skillDir} has empty 'name'`).toBeGreaterThan(0);
    expect(typeof fm['description'], `skill ${skillDir} missing 'description'`).toBe('string');
    expect((fm['description'] as string).length, `skill ${skillDir} has empty 'description'`).toBeGreaterThan(0);
  });
});
