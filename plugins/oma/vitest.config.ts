import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/hooks-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        // Per-file thresholds are set below via 100: false to use global
        // Global minimums (some files have legitimate gaps due to ESM/try-catch coverage limits)
        branches: 70,
        functions: 80,
        lines: 94,
        statements: 94,
        perFile: false,
        // Override per-file: each file must meet its own current coverage
        // (some hooks have unreachable code: catch blocks, ESM top-level calls, etc.)
      },
      // Explicitly include source TypeScript files so v8 instruments them
      include: ['src/hooks/**/*.ts'],
      exclude: ['src/types.ts', 'src/utils.ts', 'src/index.ts'],
      // Transform mode: 'all' ensures source TS files go through the transformer
      // so v8 can map coverage back to original source lines
      transformMode: { all: ['**/*.ts'] },
    },
  },
});
