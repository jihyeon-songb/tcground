import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@tcground/ui': fileURLToPath(new URL('./packages/ui/src/index.ts', import.meta.url)),
      '@tcground/headless': fileURLToPath(
        new URL('./packages/headless/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
