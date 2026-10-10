import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

async function capture() {
  const edge = process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  const browser = await chromium.launch({ headless: true, ...(edge ? { channel: 'msedge' } : {}) });

  const outDir = path.resolve('docs/ui-ux/evidence/phase-07/screenshots');
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

    // 1. Capture Brand Identity & Studio Shell Polish
    await page.screenshot({ path: path.join(outDir, `phase07_brand_polish_${vp.name}.png`) });
    console.log(`Captured Phase 7 Brand Polish at ${vp.name}`);

    // 2. Hover on CommandBar action buttons to showcase microinteraction polish
    const saveButton = page.getByRole('button', { name: /Lưu dự án/i }).first();
    if (await saveButton.count() > 0) {
      await saveButton.hover();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: path.join(outDir, `phase07_microinteractions_${vp.name}.png`) });
    console.log(`Captured Phase 7 Microinteractions at ${vp.name}`);

    await context.close();
  }

  await browser.close();
  console.log('All Phase 7 screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Failed to capture Phase 7 screenshots:', err);
  process.exit(1);
});
