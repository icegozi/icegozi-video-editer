import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runtimeExecutable } from '../src/infrastructure/codex/runtime';
import { ensureBrowser } from '@remotion/renderer';

if (process.platform !== 'win32') throw new Error('Build this Windows package on Windows so native dependencies match.');
if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use Node 24 to package the app and match its native SQLite module.');
const root = fs.realpathSync(process.cwd());
const destination = path.join(root, 'build', 'releases', `ICEGOZI-Video-${process.platform}-${process.arch}-${Date.now()}`);
assert.ok(path.relative(root, destination).startsWith(`build${path.sep}releases${path.sep}`));
const npmCli = process.env.npm_execpath;
if (!npmCli || !fs.existsSync(npmCli)) throw new Error('Run npm run package:windows.');
const executable = await runtimeExecutable();
const packages = execFileSync(process.execPath, [npmCli, 'ls', '--omit=dev', '--all', '--parseable'],
  { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 }).trim().split(/\r?\n/);
fs.mkdirSync(destination, { recursive: true });
const copy = (relative: string) => {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) return;
  const target = path.join(destination, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, filter: (file) => path.basename(file) !== 'node_modules' });
};
for (const relative of ['dist', 'src', 'public', 'projects', 'skills/video', 'tsconfig.json', 'remotion.config.ts',
  'build/server.mjs', 'build/check-code-mode.mjs', 'ASSISTANT_INTEGRATION.md']) copy(relative);
fs.mkdirSync(path.join(destination, 'projects'), { recursive: true });
for (const source of new Set(packages.slice(1))) {
  const relative = path.relative(root, source);
  assert.ok(relative.startsWith(`node_modules${path.sep}`) && !relative.startsWith('..'));
  const target = path.join(destination, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true,
    filter: (file) => file === source || path.basename(file) !== 'node_modules' });
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(destination, 'package.json'), JSON.stringify({ name: manifest.name, version: manifest.version,
  private: true, type: 'module', scripts: { start: 'runtime/node.exe build/server.mjs' }, dependencies: manifest.dependencies }, null, 2));
fs.mkdirSync(path.join(destination, 'runtime'));
fs.copyFileSync(process.execPath, path.join(destination, 'runtime', 'node.exe'));
const browser = await ensureBrowser();
if (browser.type !== 'local-puppeteer-browser' && browser.type !== 'user-defined-path') throw new Error('No render browser available.');
fs.cpSync(path.dirname(browser.path), path.join(destination, 'runtime', 'browser'), { recursive: true });
assert.ok(fs.existsSync(path.join(destination, 'runtime', 'browser', 'chrome-headless-shell.exe')));
const nodeLicense = path.join(path.dirname(process.execPath), 'LICENSE');
if (fs.existsSync(nodeLicense)) fs.copyFileSync(nodeLicense, path.join(destination, 'runtime', 'NODE-LICENSE.txt'));
const packagedExecutable = path.join(destination, path.relative(root, executable));
assert.ok(fs.existsSync(packagedExecutable));
assert.ok(fs.existsSync(path.join(path.dirname(packagedExecutable), 'codex-code-mode-host.exe')));
execFileSync(path.join(destination, 'runtime', 'node.exe'), ['--input-type=module', '-e',
  'import { createRequire } from "node:module"; const require = createRequire(import.meta.url); const Database = require("better-sqlite3"); const db = new Database(":memory:"); db.close();'],
{ cwd: destination, windowsHide: true, stdio: 'pipe' });
assert.ok(!fs.existsSync(path.join(destination, 'node_modules', 'vite')));
fs.writeFileSync(path.join(destination, 'Start ICEGOZI.cmd'),
  '@echo off\r\ncd /d "%~dp0"\r\nset "ICEGOZI_OPEN_BROWSER=1"\r\n"%~dp0runtime\\node.exe" "%~dp0build\\server.mjs"\r\nif errorlevel 1 pause\r\n');
fs.writeFileSync(path.join(destination, 'README.txt'),
  'ICEGOZI Video for Windows\r\n\r\nRun Start ICEGOZI.cmd. Node, Codex and the render browser are included.\r\n' +
  'Open http://127.0.0.1:3200 and sign in with your own ChatGPT account.\r\n' +
  'User projects, uploads and renders are stored under %LOCALAPPDATA%\\icegozi-video\\workspace.\r\n' +
  'ChatGPT connections remain protected by your Windows account and are not bundled.\r\n' +
  'To change the port, set ICEGOZI_PORT before starting.\r\n' +
  'Native tool self-check: runtime\\node.exe build\\check-code-mode.mjs\r\n');
console.info(`Windows package ready: ${destination}`);
