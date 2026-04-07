import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { version } from './package.json';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    exclude: ['node_modules', 'e2e/**'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
});
