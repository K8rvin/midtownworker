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

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  await page.evaluate(() => {
    localStorage.setItem('gta2_tutorial_seen', '1');
  });

  const newGame = canvasPoint(box, 640, 360);
  await page.mouse.click(newGame.x, newGame.y);
  await page.waitForTimeout(1500);

  const hasHook = await page.evaluate(() => typeof window.__gta2 !== 'undefined');
  if (!hasHook) throw new Error('__gta2 hook missing');

  await page.evaluate(() => window.__gta2?.dismissTutorial());

  let state = await page.evaluate(() => window.__gta2?.getState());
  if (state.currentWeapon !== 'fists') throw new Error('Default weapon should be fists');

  state = await page.evaluate(() => {
    window.__gta2.getState().ownedWeapons.push('pistol');
    window.__gta2.getState().ammo.pistol_ammo = 12;
    window.__gta2.switchWeapon(2);
    return window.__gta2.getState();
  });

  if (state.currentWeapon !== 'pistol') {
    throw new Error(`Weapon switch failed: ${state.currentWeapon}`);
  }

  await canvas.click();
  await page.keyboard.press('1');
  await page.waitForTimeout(200);

  const afterKey = await page.evaluate(() => window.__gta2?.getState()?.currentWeapon);
  if (afterKey !== 'fists') {
    throw new Error(`Key 1 should select fists, got ${afterKey}`);
  }

  console.log('Browser weapons test passed');
} finally {
  await browser.close();
}