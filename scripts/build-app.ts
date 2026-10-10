import { build } from 'esbuild';

await build({ entryPoints: { server: 'scripts/start-app.ts', 'check-code-mode': 'scripts/check-code-mode.ts', 'check-scene-generation': 'scripts/check-scene-generation.ts' },
  outdir: 'build', outExtension: { '.js': '.mjs' }, bundle: true,
  platform: 'node', target: 'node24', format: 'esm', packages: 'external', sourcemap: false });
console.info('Local backend and native tool check built in build/.');
