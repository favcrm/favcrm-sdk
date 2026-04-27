import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/__tests__/',
        // Barrel + type-only modules: re-exports and pure interfaces with
        // no runtime logic worth covering.
        'src/index.ts',
        'src/browser.ts',
        'src/types/**',
        // Vite/vitest config files
        '*.config.ts',
        '*.config.lib.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
