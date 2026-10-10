import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fakeAssistantAuth, fakeAssistantRuntime } from '../fixtures/assistant-fixtures';
import { fixtureGoogle, fixtureImageProvider, fixturePng } from '../fixtures/generation-fixtures';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-scene-ui-'));
process.env.ICEGOZI_DATA_DIR = path.join(directory, 'workspace');
process.env.ICEGOZI_DB_PATH = path.join(directory, 'test.sqlite');
const { codexApiPlugin } = await import('../../src/infrastructure/server/codexApiPlugin');
const { renderApiPlugin } = await import('../../src/infrastructure/server/renderApiPlugin');
const { CoreSceneProvider } = await import('../../src/infrastructure/scene-generation/CoreSceneProvider');
const png = path.join(directory, 'fixture.png');
fixturePng(png);
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  plugins: [
    react(),
    codexApiPlugin({
      auth: fakeAssistantAuth(),
      google: fixtureGoogle(),
      generationProviders: [fixtureImageProvider(png), new CoreSceneProvider()],
      directory,
      launch: async () => (await fakeAssistantRuntime()).rpc,
    }),
    renderApiPlugin(),
  ],
  server: {
    host: '127.0.0.1',
    port: 3219,
    strictPort: true,
    hmr: false,
    watch: null,
  },
});
await server.listen();
const edge = fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
const browser = await chromium.launch({
  headless: true,
  ...(edge ? { channel: 'msedge' } : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 950 },
  });
  page.setDefaultTimeout(30000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3219', { waitUntil: 'domcontentloaded' });
  const project = {
    id: 'scene-ui-fixture',
    title: 'Scene UI Fixture',
    width: 320,
    height: 180,
    fps: 6,
    scenes: [{ id: 'before', type: 'text', title: 'Before', durationInFrames: 30 }],
  };
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'fixture.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(project)),
    });
  const panel = page.getByTestId('ai-chat-workspace');
  await panel.getByRole('button', { name: 'Google đã kết nối', exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Google đã kết nối', exact: true }).click();
  const google = page.getByRole('dialog', {
    name: 'Kết nối Google cho Gemini',
  });
  await google.getByLabel('File cấu hình OAuth Desktop').setInputFiles({
    name: 'desktop.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        installed: {
          client_id: 'fixture-client.apps.googleusercontent.com',
          client_secret: 'fixture-google-config-secret',
          project_id: 'fixture-project',
        },
      }),
    ),
  });
  await google.getByRole('button', { name: 'Lưu cấu hình Google', exact: true }).click();
  await page.waitForFunction(
    () => (document.querySelector('input[type=password]') as HTMLInputElement)?.value === '',
  );
  await google.getByRole('button', { name: 'Đăng nhập Google', exact: true }).click();
  await google.getByText(/Đã kết nối fixture@example.invalid/).waitFor();
  await google.getByLabel('Cách kết nối Gemini').selectOption('api_key');
  const apiConfigurations: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/generation/google/configure'))
      apiConfigurations.push(request.postDataJSON().config.apiKey);
  });
  const keyInput = google.getByLabel('Gemini API key', { exact: true });
  await keyInput.fill('bad key containing spaces');
  await google.getByRole('button', { name: 'Lưu Gemini API key', exact: true }).click();
  await google.getByText(/API key chứa khoảng trắng/).waitFor();
  assert.equal(apiConfigurations.length, 0);
  const authorizationKey = 'AQ.fixture_only_not_a_real_key_000001';
  await keyInput.fill(authorizationKey);
  await google.getByRole('button', { name: 'Lưu Gemini API key', exact: true }).click();
  await google.getByText(/Đã cấu hình Gemini API key/).waitFor();
  assert.deepEqual(apiConfigurations, [authorizationKey]);
  await keyInput.evaluate((input, key) => {
    const clipboard = new DataTransfer();
    clipboard.setData('text/plain', `-H 'X-goog-api-key: ${key}'`);
    input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }));
  }, authorizationKey);
  assert.equal(await keyInput.inputValue(), authorizationKey);
  await google
    .getByLabel('Gemini API key', { exact: true })
    .fill('fixture-only-gemini-key-00000001');
  await google.getByRole('button', { name: 'Lưu Gemini API key', exact: true }).click();
  await google.getByText(/Đã cấu hình Gemini API key/).waitFor();
  assert.equal(await google.getByLabel('Gemini API key', { exact: true }).inputValue(), '');
  assert.equal(
    await google.getByRole('button', { name: 'Đăng nhập Google', exact: true }).count(),
    0,
  );
  await google.getByRole('button', { name: 'Xóa Gemini API key', exact: true }).click();
  await google.getByText(/Đã cấu hình Gemini API key/).waitFor({ state: 'hidden' });
  await google
    .getByLabel('Gemini API key', { exact: true })
    .fill('fixture-only-gemini-key-00000002');
  await google.getByRole('button', { name: 'Lưu Gemini API key', exact: true }).click();
  await google.getByText(/Đã cấu hình Gemini API key/).waitFor();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 950 });
    const box = await google.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1);
    fs.mkdirSync('build/evidence/scene-generation', { recursive: true });
    await page.screenshot({ path: `build/evidence/scene-generation/gemini-api-key-${width}.png` });
  }
  await google.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 950 });
  await panel.getByRole('button', { name: 'Tạo cảnh', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Tạo tư liệu cho cảnh' });
  await dialog
    .getByLabel('Mô tả cảnh')
    .fill('Một con cáo giữa đồng cỏ. Fixture image, no API call.');
  await dialog.getByRole('button', { name: 'Lập yêu cầu tạo cảnh', exact: true }).click();
  const imageCard = panel
    .locator('[data-testid^="generation-request-"]')
    .filter({ hasText: 'Ảnh Gemini ngang' });
  await imageCard.getByRole('button', { name: 'Duyệt tạo cảnh', exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('icegozi_current_project')!).project.scenes.length,
    ),
    1,
  );
  await imageCard.getByRole('button', { name: 'Duyệt tạo cảnh', exact: true }).click();
  await imageCard.getByRole('button', { name: 'Xem cảnh đã tạo', exact: true }).waitFor();
  await imageCard.getByRole('button', { name: 'Xem cảnh đã tạo', exact: true }).click();
  await page.waitForFunction(() => {
    const image = document.querySelector<HTMLImageElement>('img[alt="Ảnh cảnh đã tạo"]');
    return image?.complete && image.naturalWidth > 0;
  });
  await imageCard.getByRole('button', { name: 'Tạo bản nháp cảnh', exact: true }).click();
  await panel.getByRole('button', { name: 'Duyệt & Áp dụng', exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('icegozi_current_project')!).project.scenes.length === 2,
  );
  await page.getByRole('button', { name: /Hoàn tác/ }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('icegozi_current_project')!).project.scenes.length === 1,
  );
  await page.getByRole('button', { name: /Làm lại/ }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('icegozi_current_project')!).project.scenes.length === 2,
  );
  await panel.getByRole('button', { name: 'Tạo cảnh', exact: true }).click();
  await dialog.getByLabel('Cách tạo cảnh').selectOption('core-video-landscape');
  await dialog.getByLabel('Mẫu core').selectOption('fox-eating-grass');
  await dialog.getByLabel('Mô tả cảnh').fill('Cáo ăn cỏ hoạt họa, 5 giây');
  await dialog.getByRole('button', { name: 'Lập yêu cầu tạo cảnh', exact: true }).click();
  const coreCard = panel
    .locator('[data-testid^="generation-request-"]')
    .filter({ hasText: 'Video core ngang' });
  await coreCard.getByRole('button', { name: 'Duyệt tạo cảnh', exact: true }).click();
  await coreCard
    .getByRole('button', { name: 'Xem cảnh đã tạo', exact: true })
    .waitFor({ timeout: 180000 });
  await coreCard.getByRole('button', { name: 'Xem cảnh đã tạo', exact: true }).click();
  await page.waitForFunction(() => {
    const video = document.querySelector<HTMLVideoElement>('video[aria-label="Cảnh core đã tạo"]');
    return video && video.readyState >= 2 && video.videoWidth > 0 && video.duration >= 4.9;
  });
  const frames = await panel
    .locator('video[aria-label="Cảnh core đã tạo"]')
    .evaluate(async (video: HTMLVideoElement) => {
      video.pause();
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const context = canvas.getContext('2d')!;
      const capture = {
        async frame(time: number) {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Frame seek timeout')), 10000);
            video.addEventListener(
              'seeked',
              () => {
                clearTimeout(timer);
                resolve();
              },
              { once: true },
            );
            video.currentTime = time;
          });
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          context.drawImage(video, 0, 0, 320, 180);
          return {
            pixels: Array.from(context.getImageData(0, 0, 320, 180).data),
            png: canvas.toDataURL('image/png'),
          };
        },
      };
      return [await capture.frame(0.02), await capture.frame(1.05)];
    });
  assert.ok(
    frames[0].pixels.filter((value, i) => value !== frames[1].pixels[i]).length > 1000,
    'The rendered fox must actually change between frames.',
  );
  fs.mkdirSync('build/evidence/scene-generation', { recursive: true });
  fs.writeFileSync(
    'build/evidence/scene-generation/fox-first.png',
    Buffer.from(frames[0].png.split(',')[1], 'base64'),
  );
  fs.writeFileSync(
    'build/evidence/scene-generation/fox-bent.png',
    Buffer.from(frames[1].png.split(',')[1], 'base64'),
  );
  await coreCard.getByRole('button', { name: 'Tạo bản nháp cảnh', exact: true }).click();
  await panel.getByRole('button', { name: 'Duyệt & Áp dụng', exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('icegozi_current_project')!).project.scenes.length === 3,
  );
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 950 });
    const box = await panel.boundingBox();
    assert.ok(box && box.x + box.width <= width + 1);
    fs.mkdirSync('build/evidence/scene-generation', { recursive: true });
    await page.screenshot({
      path: `build/evidence/scene-generation/ui-${width}.png`,
    });
  }
  assert.deepEqual(errors, []);
  console.info(
    'PASS: OAuth and API-key configuration/rotation/removal UI, fake Gemini image -> decoded preview -> draft/apply/undo/redo, real local fox animation -> preview/apply, responsive 1440/768/390. No live Google/Gemini calls.',
  );
} finally {
  await browser.close();
  await server.close();
  const { closeDatabase } = await import('../../src/infrastructure/db/client');
  closeDatabase();
  const actual = fs.realpathSync(directory);
  assert.equal(path.dirname(actual).toLowerCase(), fs.realpathSync(os.tmpdir()).toLowerCase());
  assert.ok(path.basename(actual).startsWith('icegozi-scene-ui-'));
  fs.rmSync(actual, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
}
