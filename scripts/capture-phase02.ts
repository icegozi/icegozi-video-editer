import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

async function capture() {
  const edge = process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  const browser = await chromium.launch({ headless: true, ...(edge ? { channel: 'msedge' } : {}) });

  const outDir = path.resolve('docs/ui-ux/evidence/phase-02/screenshots');
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
    const aiTab = page.getByRole('tab', { name: 'AI Focus' });
    if (await aiTab.count() > 0) {
      await aiTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(outDir, `phase02_ai_focus_${vp.name}.png`) });
    console.log(`Captured Phase 2 AI Focus at ${vp.name}`);

    // 2. Edit Focus
    const editTab = page.getByRole('tab', { name: 'Edit Focus' });
    if (await editTab.count() > 0) {
      await editTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, `phase02_edit_focus_${vp.name}.png`) });
      console.log(`Captured Phase 2 Edit Focus at ${vp.name}`);
    }

    // 3. Preview Focus
    const previewTab = page.getByRole('tab', { name: 'Preview Focus' });
    if (await previewTab.count() > 0) {
      await previewTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, `phase02_preview_focus_${vp.name}.png`) });
      console.log(`Captured Phase 2 Preview Focus at ${vp.name}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('All Phase 2 screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Failed to capture Phase 2 screenshots:', err);
  process.exit(1);
});
