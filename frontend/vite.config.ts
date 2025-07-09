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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@mantine')) {
              return 'vendor-ui';
            }
            if (id.includes('@tabler/icons-react')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('lodash') || id.includes('date-fns') || id.includes('clsx')) {
              return 'vendor-utils';
            }
            if (id.includes('react-markdown') || id.includes('remark-') || id.includes('rehype-')) {
              return 'vendor-markdown';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            return 'vendor';
          }
          
          // App chunks
          if (id.includes('src/pages/admin')) {
            return 'admin';
          }
          if (id.includes('src/pages/chat/prompts')) {
            return 'prompts';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'esbuild'
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
