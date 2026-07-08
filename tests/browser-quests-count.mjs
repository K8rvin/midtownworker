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
  await page.waitForTimeout(1500);

  const counts = await page.evaluate(() => ({
    total: window.__gta2?.getQuestCount?.(),
    available: window.__gta2?.getAvailableQuestCount?.(),
  }));

  if (counts.total < 32) throw new Error(`Expected 32+ quests, got ${counts.total}`);
  if (counts.available < 15) throw new Error(`Expected 15+ available quests, got ${counts.available}`);

  console.log('Browser quest count test passed:', counts);
} finally {
  await browser.close();
}