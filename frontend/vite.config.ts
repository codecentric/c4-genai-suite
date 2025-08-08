/// <reference types="vitest" />

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const dirName = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(dirName, './src'),
    },
  },
  test: {
    include: ['src/**/*.ui-unit.spec.*', 'src/**/*.integration.spec.*'],
    environment: 'jsdom',
    setupFiles: 'vitest.setup.ts',
    maxConcurrency: 1,
    coverage: {
      provider: 'v8',
      exclude: [
        '**/generated/**',
        '**/dist/**',
        '**/languages/',
        '**/texts/',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.js',
        '**/*.cjs',
        '**/*.mjs',
        '**/*.config.ts',
        '**/*.d.ts',
      ],
      reporter: ['text', 'json', 'html', 'cobertura'],
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api-proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
});
