import { defineConfig } from 'vitest/config';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@workalaya/shared-kernel': path.join(root, 'libs/shared-kernel/src/index.ts'),
      '@workalaya/config': path.join(root, 'libs/config/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    root: path.resolve(__dirname),
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
