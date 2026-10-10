import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const dataDirectory = path.resolve(process.env.ICEGOZI_DATA_DIR ??
  path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'share'), 'icegozi-video', 'workspace'));
const port = Number(process.env.ICEGOZI_PORT ?? 3200);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid ICEGOZI_PORT.');
if (!fs.existsSync(path.join(appRoot, 'dist', 'index.html'))) throw new Error('Build the editor with npm run build:app first.');
process.chdir(appRoot);
process.env.NODE_ENV = 'production';
process.env.ICEGOZI_APP_ROOT = appRoot;
process.env.ICEGOZI_DATA_DIR = dataDirectory;
process.env.ICEGOZI_DB_PATH = path.join(dataDirectory, 'data', 'icegozi.sqlite');
const renderBrowser = path.join(appRoot, 'runtime', 'browser', 'chrome-headless-shell.exe');
if (!process.env.ICEGOZI_BROWSER_EXECUTABLE && fs.existsSync(renderBrowser)) {
  process.env.ICEGOZI_BROWSER_EXECUTABLE = renderBrowser;
}
fs.mkdirSync(dataDirectory, { recursive: true });
const publicDirectory = path.join(dataDirectory, 'public');
fs.mkdirSync(publicDirectory, { recursive: true });
const packagedAssets = path.join(appRoot, 'public', 'assets');
if (fs.existsSync(packagedAssets)) {
  fs.cpSync(packagedAssets, path.join(publicDirectory, 'assets'), { recursive: true, force: false });
}
const { createProductionServer } = await import('../src/infrastructure/server/productionServer');
const server = createProductionServer({ distDirectory: path.join(appRoot, 'dist'), publicDirectory, port });
server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Close the other app or set ICEGOZI_PORT.` : 'Unable to start the local app.');
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  const origin = `http://127.0.0.1:${port}/`;
  console.info(`ICEGOZI Video: ${origin}`);
  if (process.platform === 'win32' && process.env.ICEGOZI_OPEN_BROWSER === '1') {
    const browser = spawn('explorer.exe', [origin], { shell: false, windowsHide: true, stdio: 'ignore' });
    browser.on('error', () => console.info(`Open ${origin} in your browser.`));
  }
});
const stop = () => { server.close(); server.closeAllConnections(); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
