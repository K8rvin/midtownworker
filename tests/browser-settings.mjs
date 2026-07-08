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

  await page.evaluate(() => localStorage.setItem('gta2_settings', JSON.stringify({
    sfxVolume: 0.25,
    musicVolume: 0.75,
    muted: false,
  })));

  const settingsBtn = canvasPoint(box, 640, 425);
  await page.mouse.click(settingsBtn.x, settingsBtn.y);
  await page.waitForTimeout(800);

  const testBtn = canvasPoint(box, 640, 480);
  await page.mouse.click(testBtn.x, testBtn.y);
  await page.waitForTimeout(200);

  const backBtn = canvasPoint(box, 640, 580);
  await page.mouse.click(backBtn.x, backBtn.y);
  await page.waitForTimeout(600);

  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('gta2_settings');
    return raw ? JSON.parse(raw) : null;
  });
  if (!saved || saved.sfxVolume !== 0.25) {
    throw new Error(`Settings not persisted: ${JSON.stringify(saved)}`);
  }

  console.log('Browser settings test passed');
} finally {
  await browser.close();
}