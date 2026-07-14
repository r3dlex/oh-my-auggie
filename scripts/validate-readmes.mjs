#!/usr/bin/env node
// Usage: node scripts/validate-readmes.mjs (run from the repository root).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const canonicalFiles = ['README.md', 'plugins/oma/README.md'];
const localizedFiles = [
  'README.de.md',
  'README.es.md',
  'README.fr.md',
  'README.it.md',
  'README.ja.md',
  'README.ko.md',
  'README.pt.md',
  'README.ru.md',
  'README.tr.md',
  'README.vi.md',
  'README.zh.md',
];

const marketplace = JSON.parse(readFileSync(resolve(root, '.augment-plugin/marketplace.json'), 'utf8'));
const plugin = JSON.parse(readFileSync(resolve(root, 'plugins/oma/.augment-plugin/plugin.json'), 'utf8'));
const rootPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pluginPackage = JSON.parse(readFileSync(resolve(root, 'plugins/oma/package.json'), 'utf8'));
const marketplacePlugin = marketplace.plugins.find(({ name }) => name === plugin.name);

if (!marketplacePlugin) throw new Error(`Marketplace does not declare plugin ${JSON.stringify(plugin.name)}`);

const rootSections = [
  'Identity',
  'Prerequisites',
  'Quick Start',
  'Plugin or wrapper?',
  'Health check',
  'First-time setup and managed files',
  'Safety',
  'Updating',
  'Troubleshooting',
  'Documentation and advanced use',
  'Contributing and community',
  'License',
];

const packageSections = [
  'Identity',
  'Prerequisites',
  'Quick Start',
  'Plugin or wrapper?',
  'Health check',
  'Managed files and safety',
  'Updating',
  'Troubleshooting and docs',
  'Community and license',
];

const requiredCommands = [
  `auggie plugin marketplace add r3dlex/${marketplace.name}`,
  `auggie plugin install ${plugin.name}@${marketplace.name}`,
  '/oma:help',
  '/oma:version',
  '/oma:doctor',
];

const requiredIdentity = [
  `r3dlex/${marketplace.name}`,
  marketplace.name,
  plugin.name,
  `${plugin.name}@${marketplace.name}`,
  pluginPackage.name,
  plugin.minimum_auggie_version,
  `${rootPackage.engines.node.match(/\d+/)[0]} or newer`,
];

const localizedCanonicalLinks = [
  'README.md#plugin-or-wrapper',
  'README.md#prerequisites',
  'README.md#health-check',
  'README.md#first-time-setup-and-managed-files',
  'README.md#safety',
  'README.md#updating',
  'README.md#troubleshooting',
  'README.md#documentation-and-advanced-use',
  'CONTRIBUTING.md',
  'LICENSE',
];

const rejectedCommands = [
  'oma setup --scope project',
  'oma team run --task',
  'oma trace',
  'super-oma',
  '/oma:code-review',
  'auggie plugin install oh-my-auggie@oh-my-auggie',
];

const failures = [];

function read(file) {
  return readFileSync(resolve(root, file), 'utf8');
}

function requireText(file, content, expected) {
  if (!content.includes(expected)) failures.push(`${file}: missing ${JSON.stringify(expected)}`);
}

function requireSection(file, content, heading) {
  const marker = `## ${heading}`;
  const start = content.split('\n').findIndex((line) => line === marker);
  if (start === -1) {
    failures.push(`${file}: missing section ${JSON.stringify(marker)}`);
    return '';
  }
  const lines = content.split('\n');
  const endOffset = lines.slice(start + 1).findIndex((line) => line.startsWith('## '));
  const end = endOffset === -1 ? lines.length : start + 1 + endOffset;
  return lines.slice(start + 1, end).join('\n');
}

function rejectText(file, content, rejected) {
  if (content.includes(rejected)) failures.push(`${file}: contains stale ${JSON.stringify(rejected)}`);
}

function validateRelativeLinks(file, content) {
  const links = content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
  for (const [, target] of links) {
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const [rawPath, anchor] = target.split('#', 2);
    const relativePath = decodeURIComponent(rawPath);
    if (!relativePath) continue;
    const linkedPath = resolve(root, dirname(file), relativePath);
    if (!existsSync(linkedPath)) {
      failures.push(`${file}: broken relative link ${JSON.stringify(target)}`);
      continue;
    }
    if (anchor && linkedPath.endsWith('.md')) {
      const anchors = [...readFileSync(linkedPath, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)]
        .map(([, heading]) => heading.toLowerCase()
          .replace(/[`*_~]/g, '')
          .replace(/[^\p{L}\p{N}\s-]/gu, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-'));
      if (!anchors.includes(anchor)) failures.push(`${file}: missing anchor target ${JSON.stringify(target)}`);
    }
  }
}

for (const [file, sections] of [['README.md', rootSections], ['plugins/oma/README.md', packageSections]]) {
  const content = read(file);
  const quickStart = requireSection(file, content, 'Quick Start');
  for (const section of sections) requireSection(file, content, section);
  for (const command of requiredCommands) requireText(file, quickStart, command);
  for (const identity of requiredIdentity) requireText(file, content, identity);
  for (const command of rejectedCommands) rejectText(file, content, command);
  validateRelativeLinks(file, content);
}

const rootReadme = read('README.md');
const markerStart = '<!-- v3-ai-sdlc-init:start -->';
const markerEnd = '<!-- v3-ai-sdlc-init:end -->';
if (rootReadme.split(markerStart).length !== 2 || rootReadme.split(markerEnd).length !== 2) {
  failures.push('README.md: expected exactly one preserved v3-ai-sdlc-init marker pair');
} else if (rootReadme.indexOf(markerStart) > rootReadme.indexOf(markerEnd)) {
  failures.push('README.md: v3-ai-sdlc-init markers are out of order');
}

for (const file of localizedFiles) {
  const content = read(file);
  const quickStart = requireSection(file, content, 'Quick Start');
  for (const command of requiredCommands) requireText(file, quickStart, command);
  for (const command of rejectedCommands) rejectText(file, content, command);
  for (const link of localizedCanonicalLinks) requireText(file, content, link);
  validateRelativeLinks(file, content);
}

if (failures.length > 0) {
  console.error('README validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`README validation passed (${canonicalFiles.length + localizedFiles.length} files).`);
