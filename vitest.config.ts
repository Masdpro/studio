import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Each test file gets its own throwaway SQLite database (see tests/setup.ts).
    pool: 'forks',
    testTimeout: 20000,
    // Emails and notifications print to the console in tests; set TEST_LOGS=1 to see them.
    onConsoleLog: () => (process.env.TEST_LOGS ? undefined : false),
  },
});
