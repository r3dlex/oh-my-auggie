/**
 * This setup file stubs `process.exit` so that importing hook source files
 * (which call main() at top-level) doesn't terminate the test process.
 */
import { vi } from 'vitest';

// Stub process.exit to be a no-op during tests
process.exit = vi.fn(() => { /* noop */ });
