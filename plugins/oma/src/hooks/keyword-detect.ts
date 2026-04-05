import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveOmaDir } from '../utils.js';

// ─── Keyword definitions ───────────────────────────────────────────────────────

export interface KeywordEntry {
  keyword: string;
  command: string;
}

export const KEYWORDS: KeywordEntry[] = [
  { keyword: 'autopilot',      command: '/oma:autopilot' },
  { keyword: 'ralph',          command: '/oma:ralph' },
  { keyword: "don't stop",     command: '/oma:ralph' },
  { keyword: 'ulw',            command: '/oma:ultrawork' },
  { keyword: 'ultrawork',      command: '/oma:ultrawork' },
  { keyword: 'ccg',             command: '/oma:ccg' },
  { keyword: 'ralplan',        command: '/oma:ralplan' },
  { keyword: 'deep interview',  command: '/oma:interview' },
  { keyword: 'deslop',         command: '/oma:deslop' },
  { keyword: 'anti-slop',      command: '/oma:deslop' },
  { keyword: 'canceloma',      command: '/oma:cancel' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function main(): Promise<void> {
  const omaDir = resolveOmaDir();

  // Try to get the last user message from various sources
  let lastInput = process.env.LAST_USER_MESSAGE ?? '';

  if (!lastInput) {
    // Try messages.json
    try {
      const messagesPath = join(omaDir, 'messages.json');
      const content = readFileSync(messagesPath, 'utf8');
      // Extract the last content field using a simple approach
      const matches = content.matchAll(/"content"\s*:\s*"([^"]*)"/g);
      let lastMatch: string | null = null;
      for (const match of matches) {
        lastMatch = match[1];
      }
      if (lastMatch) lastInput = lastMatch;
    } catch {
      // File doesn't exist or can't be read
    }
  }

  // Fall back to stdin
  if (!lastInput) {
    const { readAllStdin } = await import('../utils.js');
    const rawInput = await readAllStdin();
    if (rawInput) {
      try {
        const parsed = JSON.parse(rawInput) as Record<string, unknown>;
        if (typeof parsed.content === 'string' && parsed.content) {
          lastInput = parsed.content;
        }
      } catch {
        // Non-JSON — treat raw string as content
        lastInput = rawInput.trim();
      }
    }
  }

  if (!lastInput) {
    process.exit(0);
  }

  // Lowercase for case-insensitive matching
  const lowerInput = lastInput.toLowerCase();

  for (const entry of KEYWORDS) {
    if (lowerInput.includes(entry.keyword)) {
      const result = {
        keywordDetected: entry.keyword,
        suggestedCommand: entry.command,
        systemMessage: `Keyword detected: '${entry.keyword}'. Suggesting ${entry.command}`,
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
      return;
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`[keyword-detect] unexpected error: ${err}`);
  process.exit(2);
});
