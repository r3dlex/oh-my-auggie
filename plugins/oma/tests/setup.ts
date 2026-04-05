import { Readable } from 'stream';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';

/**
 * Creates a temporary directory for test isolation.
 * Cleaned up automatically when the test process exits.
 */
export function createTempDir(prefix = 'oma-test-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/**
 * Mock stdin helper — returns a Readable stream that yields the given string.
 */
export function mockStdin(input: string): Readable {
  return Readable.from([input]);
}
