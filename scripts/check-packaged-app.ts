import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from '@playwright/test';

const release = path.resolve(process.argv[2] ?? '');
assert.ok(process.argv[2] && fs.existsSync(path.join(release, 'Start ICEGOZI.cmd')), 'Pass a completed Windows package folder.');
assert.ok(!fs.existsSync(path.join(release, 'node_modules', 'vite')));
assert.ok(fs.existsSync(path.join(release, 'skills', 'video', 'icegozi-text-motion', 'SKILL.md')));
const node = path.join(release, 'runtime', 'node.exe');
execFileSync(node, [path.join(release, 'build', 'check-code-mode.mjs')],
  { cwd: release, windowsHide: true, stdio: 'inherit', timeout: 45000 });
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-packaged-check-'));
const workspace = path.join(directory, 'workspace');
const origin = 'http://127.0.0.1:3218';
let log = '';
const child = spawn(node, [path.join(release, 'build', 'server.mjs')], {
  cwd: os.tmpdir(), shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, LOCALAPPDATA: path.join(directory, 'local'), ICEGOZI_DATA_DIR: workspace,
    ICEGOZI_PORT: '3218', ICEGOZI_OPEN_BROWSER: '0' },
});
const exited = once(child, 'close');
child.stdout.on('data', (chunk: Buffer) => { log = (log + chunk.toString()).slice(-16000); });
child.stderr.on('data', (chunk: Buffer) => { log = (log + chunk.toString()).slice(-16000); });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
try {
  let ready = false;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (child.exitCode !== null) throw new Error(`Packaged backend exited: ${log}`);
    try { ready = (await fetch(origin)).ok; } catch { /* The owned server is still starting. */ }
    if (ready) break;
    await wait(50);
  }
  assert.ok(ready, 'The packaged backend must start independently of the current directory.');
  const html = await (await fetch(origin)).text();
  const capability = /name="icegozi-capability" content="([^"]+)"/.exec(html)![1];
  const status = await (await fetch(origin + '/api/codex/status', { headers: { 'X-Icegozi-Capability': capability } })).json();
  assert.equal(status.runtime.available, true);
  assert.equal(status.auth.status, 'disconnected');
  assert.equal((await (await fetch(origin + '/api/projects')).json()).success, true);
  const edge = fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  browser = await chromium.launch({ headless: true, ...(edge ? { channel: 'msedge' } : {}) });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.getElementById('root')?.textContent?.includes('AI Studio'));
  assert.deepEqual(errors, []);
  console.info('Packaged UI: React loaded, protected bridge available, no page errors. No real account used.');
  const project = { id: 'packaged-smoke', title: 'Packaged A', width: 320, height: 180, fps: 6,
    scenes: [{ id: 'text-a', type: 'text', title: 'A', durationInFrames: 30, backgroundColor: '#000000',
      textColor: '#FFFFFF', animationType: 'scale', fontSize: 72, startScale: 0.25, endScale: 1.5 }],
    audioTracks: [], subtitles: [] };
  const created = await (await fetch(origin + '/api/render', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, profile: 'preview' }) })).json();
  assert.equal(created.success, true);
  let completed = false;
  for (let attempt = 0; attempt < 480; attempt++) {
    const result = await (await fetch(origin + `/api/render/status/${created.job.id}`)).json();
    assert.notEqual(result.job.status, 'failed', `Packaged render failed: ${result.job.error}\n${log}`);
    if (result.job.status === 'completed') {
      assert.ok(path.relative(workspace, result.job.outputPath).startsWith(`generated${path.sep}previews${path.sep}`));
      const download = await fetch(origin + result.job.downloadUrl);
      assert.equal(download.status, 200);
      assert.ok((await download.arrayBuffer()).byteLength > 1000);
      const dimensions = await page.evaluate((src) => new Promise<number[]>((resolve, reject) => {
        const video = document.createElement('video');
        video.onloadedmetadata = () => { resolve([video.videoWidth, video.videoHeight]); video.remove(); };
        video.onerror = () => { video.remove(); reject(new Error('Packaged MP4 could not be decoded')); };
        video.src = src;
        document.body.appendChild(video);
      }), origin + result.job.downloadUrl);
      assert.deepEqual(dimensions, [160, 90]);
      const growth = await page.evaluate((src) => new Promise<number[]>((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.onerror = () => reject(new Error('Scale preview could not be decoded'));
        const canvas = document.createElement('canvas');
        const countPixels = () => {
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          const context = canvas.getContext('2d')!;
          context.drawImage(video, 0, 0);
          const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let white = 0;
          for (let index = 0; index < rgba.length; index += 4) {
            if (rgba[index] > 180 && rgba[index + 1] > 180 && rgba[index + 2] > 180) white++;
          }
          return white;
        };
        video.onloadeddata = () => {
          const first = countPixels();
          video.onseeked = () => { resolve([first, countPixels()]); video.remove(); };
          video.currentTime = video.duration - 1 / 6;
        };
        video.src = src;
        document.body.appendChild(video);
      }), origin + result.job.downloadUrl);
      assert.ok(growth[0] > 0 && growth[1] > growth[0] * 4, `The A must visibly grow: ${growth}`);
      console.info(`Packaged scale preview: white pixels ${growth[0]} -> ${growth[1]}.`);
      completed = true;
      break;
    }
    await wait(250);
  }
  assert.ok(completed, 'The packaged Remotion CLI must produce a real MP4.');
  assert.ok(fs.existsSync(path.join(workspace, 'data', 'icegozi.sqlite')));
  console.info('PASS: packaged Node + bundled skills + native toolbox + production UI/API + writable SQLite + real growing-A MP4. Vite absent.');
} finally {
  await browser?.close();
  if (child.exitCode === null) child.kill();
  await exited;
  const resolved = fs.realpathSync(directory);
  assert.equal(path.dirname(resolved).toLowerCase(), fs.realpathSync(os.tmpdir()).toLowerCase());
  assert.ok(path.basename(resolved).startsWith('icegozi-packaged-check-'));
  fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
