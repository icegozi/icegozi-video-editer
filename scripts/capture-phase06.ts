import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

async function capture() {
  const edge = process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  const browser = await chromium.launch({ headless: true, ...(edge ? { channel: 'msedge' } : {}) });

  const outDir = path.resolve('docs/ui-ux/evidence/phase-06/screenshots');
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

    // 1. Open Export Modal from CommandBar (Export Video button)
    const exportBtn = page.getByRole('button', { name: /Xuất video|Export/i }).first();
    if (await exportBtn.count() > 0) {
      await exportBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(outDir, `phase06_export_modal_${vp.name}.png`) });
    console.log(`Captured Phase 6 Export Modal at ${vp.name}`);

    // Close Export Modal by clicking Close button or Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 2. Capture CommandBar feedback badges and shortcut hints in normal view
    await page.screenshot({ path: path.join(outDir, `phase06_feedback_shortcuts_${vp.name}.png`) });
    console.log(`Captured Phase 6 Feedback & Shortcuts at ${vp.name}`);

    await context.close();
  }

  await browser.close();
  console.log('All Phase 6 screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Failed to capture Phase 6 screenshots:', err);
  process.exit(1);
});
