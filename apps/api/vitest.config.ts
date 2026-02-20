import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Workspace root — two levels up from apps/api/
const root = path.resolve(__dirname, '../..');

export default defineConfig({
  // Replicate tsconfig.base.json path aliases for Vitest's Vite module resolver
  resolve: {
    alias: {
      '@workalaya/shared-kernel': path.join(root, 'libs/shared-kernel/src/index.ts'),
      '@workalaya/api-contracts': path.join(root, 'libs/api-contracts/src/index.ts'),
      '@workalaya/testing': path.join(root, 'libs/testing/src/index.ts'),
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
      exclude: ['src/**/*.test.ts', 'src/main.ts'],
    },
  },
});