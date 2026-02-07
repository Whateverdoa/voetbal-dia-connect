import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'convex/_generated'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['convex/_generated/**', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      // Order matters: more specific aliases first
      '@/convex/_generated/api': path.resolve(__dirname, './src/test/__mocks__/convex-api.ts'),
      '@/convex': path.resolve(__dirname, './convex'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
