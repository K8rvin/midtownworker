import { chromium } from 'playwright';

const URL = process.env.GAME_URL ?? 'http://localhost:5174/';

function canvasPoint(box, gx, gy) {
  return {
    x: box.x + (gx / 1280) * box.width,
    y: box.y + (gy / 720) * box.height,
  };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 10000 });

  await page.evaluate(() => localStorage.setItem('gta2_tutorial_seen', '1'));

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  await page.mouse.click(...Object.values(canvasPoint(box, 640, 380)));
  await page.waitForTimeout(1200);

  await page.mouse.click(...Object.values(canvasPoint(box, 640, 360)));
  await page.waitForTimeout(1200);

  const hasHook = await page.evaluate(() => typeof window.__gta2 !== 'undefined');
  if (!hasHook) throw new Error('Game scene not loaded — __gta2 missing');

  await page.evaluate(() => window.__gta2?.dismissTutorial());

  await canvas.click();
  await page.keyboard.press('j');
  await page.waitForTimeout(500);

  let questLogVisible = await page.evaluate(() => window.__gta2?.isQuestLogVisible());
  if (!questLogVisible) {
    await page.evaluate(() => window.__gta2?.openQuestLog());
    await page.waitForTimeout(300);
    questLogVisible = await page.evaluate(() => window.__gta2?.isQuestLogVisible());
  }
  if (!questLogVisible) throw new Error('Quest log did not open');

  const beforeY = await page.evaluate(() => window.__gta2?.getState()?.playerY);

  const row = canvasPoint(box, 640, 230);
  await page.mouse.click(row.x, row.y);
  await page.waitForTimeout(600);

  const activeQuest = await page.evaluate(() => window.__gta2?.getState()?.activeQuestId);
  if (!activeQuest) throw new Error('Quest row click did not start quest');

  const dialogVisible = await page.evaluate(() => window.__gta2?.isDialogVisible());
  if (!dialogVisible) throw new Error('Dialog did not appear after quest start');

  await page.mouse.click(...Object.values(canvasPoint(box, 640, 600)));
  await page.waitForTimeout(300);

  const dialogAfterClick = await page.evaluate(() => window.__gta2?.isDialogVisible());
  if (dialogAfterClick) throw new Error('Dialog still visible after click dismiss');

  await canvas.click();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.down('w');
    await page.waitForTimeout(80);
    await page.keyboard.up('w');
  }
  await page.waitForTimeout(300);

  const afterY = await page.evaluate(() => window.__gta2?.getState()?.playerY);
  if (Math.abs(afterY - beforeY) < 1) {
    throw new Error(`Controls blocked after quest — playerY unchanged (${beforeY} -> ${afterY})`);
  }

  console.log('Browser quest test passed:', { activeQuest, beforeY, afterY });
} finally {
  await browser.close();
}