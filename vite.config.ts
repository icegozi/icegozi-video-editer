import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { renderApiPlugin } from './src/infrastructure/server/renderApiPlugin';

export default defineConfig({
  plugins: [react(), renderApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3200,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
});
