#!/usr/bin/env node
// cli/oma.mjs — Shim that forwards to plugins/oma/dist/cli/oma.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, '..', 'plugins', 'oma', 'dist', 'cli', 'oma.js'));
