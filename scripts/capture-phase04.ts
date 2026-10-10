import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

async function capture() {
  const edge = process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  const browser = await chromium.launch({ headless: true, ...(edge ? { channel: 'msedge' } : {}) });

  const outDir = path.resolve('docs/ui-ux/evidence/phase-04/screenshots');
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

    // 1. AI Studio Default with Prompt Suggestions
    const aiTab = page.getByRole('tab', { name: 'AI Focus' });
    if (await aiTab.count() > 0) {
      await aiTab.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: path.join(outDir, `phase04_ai_workspace_${vp.name}.png`) });
    console.log(`Captured Phase 4 AI Workspace at ${vp.name}`);

    // 2. Select scene to showcase ContextChipsBar in AI Studio
    const timelineClip = page.locator('text=scene-1').first();
    if (await timelineClip.count() > 0) {
      await timelineClip.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: path.join(outDir, `phase04_ai_with_context_${vp.name}.png`) });
    console.log(`Captured Phase 4 AI Workspace with Context Chips at ${vp.name}`);

    await context.close();
  }

  await browser.close();
  console.log('All Phase 4 screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Failed to capture Phase 4 screenshots:', err);
  process.exit(1);
});
