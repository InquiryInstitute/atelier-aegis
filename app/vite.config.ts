import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/atelier-aegis/',
  resolve: {
    alias: {
      '@aegis/feature-stream': resolve(__dirname, '../packages/feature-stream/src/index.ts'),
      '@aegis/inference': resolve(__dirname, '../packages/inference/src/index.ts'),
      '@aegis/inference/types': resolve(__dirname, '../packages/inference/src/types.ts'),
      '@aegis/policy': resolve(__dirname, '../packages/policy/src/index.ts'),
      '@aegis/policy/types': resolve(__dirname, '../packages/policy/src/types.ts'),
    },
  },
  server: {
    port: 3333,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
