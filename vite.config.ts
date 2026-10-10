import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { DEV_PROJECT_META, devProjectId } from './scripts/dev';

export default defineConfig(async ({ command }) => {
  const serverPlugins =
    command === 'serve'
      ? await Promise.all([
          import('./src/infrastructure/server/codexApiPlugin').then(({ codexApiPlugin }) =>
            codexApiPlugin(),
          ),
          import('./src/infrastructure/server/renderApiPlugin').then(({ renderApiPlugin }) =>
            renderApiPlugin(),
          ),
        ])
      : [];

  return {
    plugins: [
      react(),
      ...serverPlugins,
      {
        name: 'icegozi-dev-instance',
        apply: 'serve',
        transformIndexHtml() {
          return [
            {
              tag: 'meta',
              attrs: { name: DEV_PROJECT_META, content: devProjectId(__dirname) },
              injectTo: 'head',
            },
          ];
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
  };
});
