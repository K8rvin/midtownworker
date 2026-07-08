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
  await page.evaluate(() => localStorage.setItem('gta2_tutorial_seen', '1'));
  await page.waitForSelector('canvas', { timeout: 10000 });

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  await page.mouse.click(...Object.values(canvasPoint(box, 640, 360)));
  await page.waitForTimeout(2000);

  const hasHook = await page.evaluate(() => typeof window.__gta2 !== 'undefined');
  if (!hasHook) throw new Error('__gta2 hook missing — run against dev server');

  await page.evaluate(() => {
    window.__gta2.getState().money = 4242;
  });
  await page.keyboard.press('F5');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  await page.mouse.click(...Object.values(canvasPoint(box, 640, 460)));
  await page.waitForTimeout(800);

  await page.mouse.click(...Object.values(canvasPoint(box, 640, 425)));
  await page.waitForTimeout(2000);

  const money = await page.evaluate(() => window.__gta2?.getState()?.money);
  if (money !== 4242) throw new Error(`Save not loaded, money=${money}`);

  const beforeY = await page.evaluate(() => window.__gta2?.getState()?.playerY);
  await canvas.click();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.down('w');
    await page.waitForTimeout(80);
    await page.keyboard.up('w');
  }
  await page.waitForTimeout(300);
  const afterY = await page.evaluate(() => window.__gta2?.getState()?.playerY);

  if (Math.abs(afterY - beforeY) < 1) {
    throw new Error(`Player frozen after Continue (${beforeY} -> ${afterY})`);
  }

  console.log('Browser save-continue test passed:', { money, beforeY, afterY });
} finally {
  await browser.close();
}