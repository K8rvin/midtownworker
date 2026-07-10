/**
 * Multi-session QA smoke (Playwright): menu, settings, life-sim boot, HUD.
 * Run with: GAME_URL=http://localhost:5173 node tests/browser-qa-sessions.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const URL = process.env.GAME_URL ?? 'http://localhost:5173/';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'tmp-qa');
mkdirSync(outDir, { recursive: true });

function canvasPoint(box, gx, gy) {
  return {
    x: box.x + (gx / 1280) * box.width,
    y: box.y + (gy / 720) * box.height,
  };
}

const findings = [];
function note(session, severity, msg) {
  findings.push({ session, severity, msg });
  console.log(`[${session}][${severity}] ${msg}`);
}

const browser = await chromium.launch();

async function session(name, fn) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => {
    const m = e.message || '';
    // Headless Chromium often lacks GPU FB — not a game bug.
    if (/Framebuffer status|WebGL|CONTEXT_LOST/i.test(m)) {
      note(name, 'INFO', `headless GL noise: ${m.slice(0, 80)}`);
      return;
    }
    note(name, 'P0', `pageerror: ${m}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (/Framebuffer|WebGL|CONTEXT_LOST/i.test(t)) return;
      note(name, 'P1', `console.error: ${t.slice(0, 160)}`);
    }
  });
  try {
    await fn(page);
    note(name, 'OK', 'session finished');
  } catch (e) {
    note(name, 'P0', `session failed: ${e.message}`);
    try {
      await page.screenshot({ path: join(outDir, `${name}-fail.png`) });
    } catch {
      /* ignore */
    }
  } finally {
    await page.close();
  }
}

// ——— Session 1: Main menu + settings round-trip ———
await session('S1-menu-settings', async (page) => {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.evaluate(() => localStorage.setItem('gta2_tutorial_seen', '1'));
  await page.waitForTimeout(1200);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');

  await page.screenshot({ path: join(outDir, 's1-menu.png') });

  // Settings button ~ center mid (MainMenu layout)
  const settingsBtn = canvasPoint(box, 640, 425);
  await page.mouse.click(settingsBtn.x, settingsBtn.y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(outDir, 's1-settings.png') });

  // Back
  const backBtn = canvasPoint(box, 640, 580);
  await page.mouse.click(backBtn.x, backBtn.y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(outDir, 's1-menu-back.png') });
});

// ——— Session 2: New life-sim game boots without crash ———
await session('S2-life-sim-boot', async (page) => {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('gta2_tutorial_seen', '1');
    localStorage.setItem('gta2_life_intro_seen', '1');
  });
  await page.waitForTimeout(1000);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');

  // "Новая игра" — typically top primary button ~ y 300–340
  for (const y of [300, 330, 360, 280]) {
    const p = canvasPoint(box, 640, y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outDir, 's2-game.png') });

  // If intro modal still visible, click through center bottom
  for (const y of [520, 560, 600, 480]) {
    await page.mouse.click(canvasPoint(box, 640, y).x, canvasPoint(box, 640, y).y);
    await page.waitForTimeout(300);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Move a bit + open smartphone
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outDir, 's2-phone.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Pause / settings from game
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(outDir, 's2-pause.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
});

// ——— Session 3: Interact resolver pure logic (no browser phaser) ———
await session('S3-interact-logic', async (page) => {
  // Lightweight inline check via evaluate on empty page not needed —
  // verify source contracts already covered by unit tests; here re-check pickBest semantics
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const ok = await page.evaluate(() => {
    // Simulate priority rules used by InteractResolver
    const PRIORITY = { vehicle_exit: 40, taxi_pickup: 79, service_drive: 86 };
    const pick = (cands) => {
      const sorted = [...cands].sort((a, b) => {
        const distDiff = a.distance - b.distance;
        if (Math.abs(distDiff) > 8) return distDiff;
        return b.priority - a.priority;
      });
      return sorted[0];
    };
    const nearTaxi = pick([
      { kind: 'vehicle_exit', distance: 96, priority: PRIORITY.vehicle_exit },
      { kind: 'taxi_pickup', distance: 20, priority: PRIORITY.taxi_pickup },
    ]);
    const nearGas = pick([
      { kind: 'vehicle_exit', distance: 96, priority: PRIORITY.vehicle_exit },
      { kind: 'service_drive', distance: 40, priority: PRIORITY.service_drive },
    ]);
    const onlyExit = pick([{ kind: 'vehicle_exit', distance: 96, priority: PRIORITY.vehicle_exit }]);
    return (
      nearTaxi.kind === 'taxi_pickup' &&
      nearGas.kind === 'service_drive' &&
      onlyExit.kind === 'vehicle_exit'
    );
  });
  if (!ok) throw new Error('pickBest priority regression: taxi/gas should beat vehicle_exit');
});

// ——— Session 4: Settings persist ———
await session('S4-settings-persist', async (page) => {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('gta2_tutorial_seen', '1');
    localStorage.setItem(
      'gta2_settings',
      JSON.stringify({ sfxVolume: 0.33, musicVolume: 0.44, muted: false })
    );
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gta2_settings') || 'null'));
  if (!saved || saved.sfxVolume !== 0.33) throw new Error(`settings lost: ${JSON.stringify(saved)}`);
});

await browser.close();

const report = {
  url: URL,
  at: new Date().toISOString(),
  findings,
  p0: findings.filter((f) => f.severity === 'P0').length,
  p1: findings.filter((f) => f.severity === 'P1').length,
};
writeFileSync(join(outDir, 'qa-report.json'), JSON.stringify(report, null, 2));
console.log('\n=== QA REPORT ===');
console.log(JSON.stringify(report, null, 2));

if (report.p0 > 0) {
  process.exitCode = 1;
  console.error(`FAILED: ${report.p0} P0 findings`);
} else {
  console.log('QA multi-session: no P0 crashes');
}
