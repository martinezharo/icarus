import { defineConfig } from 'vitest/config';

// A lean, plugin-free config so unit tests for the pure TS modules
// (ical parsing, date helpers) run fast in a Node environment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
