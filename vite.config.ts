import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { renderApiPlugin } from './src/infrastructure/server/renderApiPlugin';
import { codexApiPlugin } from './src/infrastructure/server/codexApiPlugin';

export default defineConfig({
  plugins: [react(), codexApiPlugin(), renderApiPlugin()],
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
