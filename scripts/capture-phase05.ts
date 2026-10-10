import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

async function capture() {
  const edge = process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  const browser = await chromium.launch({ headless: true, ...(edge ? { channel: 'msedge' } : {}) });

  const outDir = path.resolve('docs/ui-ux/evidence/phase-05/screenshots');
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

    // 1. Switch to Assets tab on left workspace
    const assetsTab = page.getByRole('tab', { name: /Tài nguyên|Kho tài nguyên/i });
    if (await assetsTab.count() > 0) {
      await assetsTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(outDir, `phase05_assets_panel_${vp.name}.png`) });
    console.log(`Captured Phase 5 Assets Panel at ${vp.name}`);

    // 2. Switch to Edit Focus to view Inspector and Timeline simultaneously
    const editTab = page.getByRole('tab', { name: 'Edit Focus' });
    if (await editTab.count() > 0) {
      await editTab.click();
      await page.waitForTimeout(500);
    }

    // Select scene-1 to populate Inspector
    const timelineClip = page.locator('text=scene-1').first();
    if (await timelineClip.count() > 0) {
      await timelineClip.click();
      await page.waitForTimeout(400);
    }

    await page.screenshot({ path: path.join(outDir, `phase05_inspector_edit_focus_${vp.name}.png`) });
    console.log(`Captured Phase 5 Inspector Edit Focus at ${vp.name}`);

    await context.close();
  }

  await browser.close();
  console.log('All Phase 5 screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Failed to capture Phase 5 screenshots:', err);
  process.exit(1);
});
