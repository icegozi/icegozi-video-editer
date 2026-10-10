import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { renderApiPlugin } from './src/infrastructure/server/renderApiPlugin';
import { codexApiPlugin } from './src/infrastructure/server/codexApiPlugin';
import { DEV_PROJECT_META, devProjectId } from './scripts/dev';

export default defineConfig({
  plugins: [
    react(),
    codexApiPlugin(),
    renderApiPlugin(),
    {
      name: 'icegozi-dev-instance',
      apply: 'serve',
      transformIndexHtml() {
        return [{
          tag: 'meta',
          attrs: { name: DEV_PROJECT_META, content: devProjectId(__dirname) },
          injectTo: 'head',
        }];
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    strictPort: true,
    port: 3200,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
});
