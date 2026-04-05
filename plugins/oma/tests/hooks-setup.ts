/**
 * This setup file stubs `process.exit` so that importing hook source files
 * (which call main() at top-level) doesn't terminate the test process.
 * It runs before each test file module is loaded.
 */
import { vi } from 'vitest';

// Stub process.exit to be a no-op during tests
process.exit = vi.fn(() => { /* noop */ });

// Re-export so test files can access the same spy
export const processExitSpy = process.exit;
