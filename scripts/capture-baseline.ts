import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

async function capture() {
  const edge = process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  const browser = await chromium.launch({ headless: true, ...(edge ? { channel: 'msedge' } : {}) });

  const outDir = path.resolve('docs/ui-ux/evidence/phase-00/screenshots');
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const viewports = [
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1920, height: 1080, name: '1920x1080' },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3200/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1000);

    // 1. AI Focus (default)
    await page.screenshot({ path: path.join(outDir, `baseline_ai_focus_${vp.name}.png`) });
    console.log(`Captured AI Focus at ${vp.name}`);

    // 2. Edit Focus
    const editBtn = page.getByRole('button', { name: 'Edit Focus' });
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, `baseline_edit_focus_${vp.name}.png`) });
      console.log(`Captured Edit Focus at ${vp.name}`);
    }

    // 3. Preview Focus
    const previewBtn = page.getByRole('button', { name: 'Preview Focus' });
    if (await previewBtn.count() > 0) {
      await previewBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, `baseline_preview_focus_${vp.name}.png`) });
      console.log(`Captured Preview Focus at ${vp.name}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('All baseline screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Failed to capture baseline screenshots:', err);
  process.exit(1);
});
