import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import { codexApiPlugin } from '../../src/infrastructure/server/codexApiPlugin';
import { renderApiPlugin } from '../../src/infrastructure/server/renderApiPlugin';
import { fakeAssistantAuth, fakeAssistantRuntime } from '../fixtures/assistant-fixtures';

const directory = await mkdtemp(path.join(os.tmpdir(), 'icegozi-ui-'));
let runtime: Awaited<ReturnType<typeof fakeAssistantRuntime>> | undefined;
let candidate: unknown;
const auth = fakeAssistantAuth();
await auth.disconnect();
const server = await createServer({ configFile: false, root: process.cwd(),
  plugins: [react(), codexApiPlugin({ auth, directory, launch: async () => {
    runtime = await fakeAssistantRuntime();
    runtime.process.stdin.on('data', (chunk: Buffer) => {
      const message = JSON.parse(chunk.toString()) as { method?: string; id?: number; result?: unknown };
      if (message.method === 'turn/start') {
        setTimeout(() => {
          runtime!.notify({ method: 'item/agentMessage/delta', params: { threadId: 'fixture-thread', turnId: 'fixture-turn-1', itemId: 'ui-message', delta: 'Đây là đề xuất kiểm thử fixtures.' } });
          runtime!.notify({ id: 500, method: 'item/tool/call', params: { threadId: 'fixture-thread', turnId: 'fixture-turn-1', callId: 'ui-proposal', namespace: 'video_editor', tool: 'propose_project_change', arguments: { summary: 'Đổi tiêu đề để kiểm tra apply/undo', candidate } } });
        }, 50);
      } else if (message.id === 500 && message.result) {
        runtime!.notify({ method: 'turn/completed', params: { threadId: 'fixture-thread', turn: { id: 'fixture-turn-1', status: 'completed' } } });
      }
    });
    return runtime.rpc;
  } }), renderApiPlugin()],
  resolve: { alias: { '@': path.resolve('src') } }, server: { host: '127.0.0.1', port: 3217, strictPort: true, hmr: false, watch: null },
});
await server.listen();
const edge = process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
const browser = await chromium.launch({ headless: true, ...(edge ? { channel: 'msedge' } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const project = { id: 'ui-fixture', title: 'UI Fixture', fps: 30, width: 320, height: 240,
    scenes: [{ id: 'ui-scene', type: 'text', durationInFrames: 15, title: 'Local preview' }] };
  candidate = { ...project, title: 'AI fixture proposal' };
  await page.goto('http://127.0.0.1:3217', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const capability = await page.locator('meta[name="icegozi-capability"]').getAttribute('content');
  assert.ok(capability);
  assert.equal((await context.request.get('http://127.0.0.1:3217/api/codex/status')).status(), 403);
  assert.equal((await context.request.get('http://127.0.0.1:3217/api/codex/status', { headers: { 'X-Icegozi-Capability': capability, Origin: 'https://outside.invalid' } })).status(), 403);
  assert.equal((await context.request.get('http://127.0.0.1:3217/api/codex/status', { headers: { 'X-Icegozi-Capability': capability, Host: 'outside.invalid' } })).status(), 403);
  assert.equal((await context.request.get('http://127.0.0.1:3217/api/codex/rpc', { headers: { 'X-Icegozi-Capability': capability } })).status(), 404);
  const safeStatus = await context.request.get('http://127.0.0.1:3217/api/codex/status', { headers: { 'X-Icegozi-Capability': capability } });
  assert.equal((await safeStatus.text()).includes('synthetic-fixture-token'), false);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.getByRole('button', { name: 'Trợ lý AI', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Trợ lý AI' });
  await panel.getByText('Chưa kết nối ChatGPT', { exact: true }).waitFor();
  assert.equal(await panel.getByRole('button', { name: 'Gửi', exact: true }).isDisabled(), true);
  await panel.getByRole('button', { name: 'Continue with ChatGPT', exact: true }).click();
  await panel.getByText('Đã kết nối · Đã cấp quyền dùng gói', { exact: true }).waitFor();
  await panel.getByLabel('Model của phiên ChatGPT').selectOption('fixture-model');
  await panel.getByLabel('Yêu cầu chỉnh sửa').fill('Đổi tiêu đề');
  await panel.getByRole('button', { name: 'Gửi', exact: true }).click();
  await panel.getByText('Đổi tiêu đề để kiểm tra apply/undo', { exact: true }).waitFor();
  console.info('UI: fixture chat and proposal visible');
  await panel.getByRole('button', { name: 'Áp dụng', exact: true }).click();
  await page.locator('header').first().getByText('AI fixture proposal', { exact: true }).waitFor();
  console.info('UI: proposal applied');
  await page.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click();
  await page.locator('header').first().getByText('UI Fixture', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true }).click();
  await page.locator('header').first().getByText('AI fixture proposal', { exact: true }).waitFor();
  await page.locator('header').first().getByText('Saved', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Trợ lý AI', exact: true }).click();
  await panel.getByText('Đây là đề xuất kiểm thử fixtures.', { exact: true }).waitFor();
  await page.locator('header').first().getByText('AI fixture proposal', { exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Render snapshot hiện tại', exact: true }).click();
  await panel.getByRole('button', { name: 'Xem MP4', exact: true }).waitFor({ timeout: 120_000 });
  console.info('UI: real MP4 ready');
  await panel.getByRole('button', { name: 'Xem MP4', exact: true }).click();
  await panel.locator('video').waitFor();
  await panel.locator('video').evaluate((video: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
    setTimeout(() => reject(new Error(`Video metadata timeout; readyState=${video.readyState}, src=${video.currentSrc}, mediaError=${video.error?.code}`)), 10_000);
    if (video.readyState >= 1) resolve();
    else { video.addEventListener('loadedmetadata', () => resolve(), { once: true }); video.addEventListener('error', () => reject(new Error('Preview failed')), { once: true }); }
  }));
  console.info('UI: MP4 metadata loaded');
  await panel.locator('video').evaluate((video: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview frame could not be decoded')), 10000);
    video.addEventListener('seeked', () => { clearTimeout(timeout); resolve(); }, { once: true });
    video.currentTime = Math.min(0.25, video.duration / 2);
  }));
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const box = await panel.boundingBox();
    assert.ok(box && box.width <= width && box.x >= 0 && box.x + box.width <= width + 1);
    await page.screenshot({ path: path.resolve(`generated/temp/assistant-ui-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await panel.getByRole('button', { name: 'Đóng trợ lý AI' }).click();
  assert.equal(await panel.isVisible(), false);
  await page.getByRole('button', { name: 'Trợ lý AI', exact: true }).click();
  await panel.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await panel.getByText('Chưa kết nối ChatGPT', { exact: true }).waitFor();
  assert.equal(await panel.getByText('Đổi tiêu đề để kiểm tra apply/undo', { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.info('PASS: fixture login/catalog/chat/proposal apply/undo/redo, real local MP4 preview, logout, 1440/768/390px, no page errors. No real ChatGPT inference performed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'UI verification failed');
  throw error;
} finally {
  await browser.close(); await server.close();
  const resolved = await realpath(directory);
  assert.equal(path.dirname(resolved).toLowerCase(), (await realpath(os.tmpdir())).toLowerCase());
  assert.ok(path.basename(resolved).startsWith('icegozi-ui-'));
  await rm(resolved, { recursive: true, force: true });
}
