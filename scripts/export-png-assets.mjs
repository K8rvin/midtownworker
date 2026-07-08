/**
 * Exports procedural textures to public/assets/*.png
 * Requires dev server: npm run dev (in another terminal) OR set GAME_URL
 * Run: npm run export:assets
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.GAME_URL ?? 'http://localhost:5174/';

const ASSET_PATHS = {
  tile_grass: 'tiles/tile_grass.png',
  tile_road: 'tiles/tile_road.png',
  tile_sidewalk: 'tiles/tile_sidewalk.png',
  tile_building: 'tiles/tile_building.png',
  tile_roof: 'tiles/tile_roof.png',
  tile_stairs: 'tiles/tile_stairs.png',
  city_tileset: 'tilesets/city_tileset.png',
  player: 'sprites/player.png',
  player2: 'sprites/player2.png',
  npc_civilian: 'npcs/npc_civilian.png',
  npc_yakuza: 'npcs/npc_yakuza.png',
  npc_rednecks: 'npcs/npc_rednecks.png',
  npc_scientists: 'npcs/npc_scientists.png',
  npc_police: 'npcs/npc_police.png',
  npc_target: 'npcs/npc_target.png',
  vehicle_sedan: 'vehicles/vehicle_sedan.png',
  vehicle_sports: 'vehicles/vehicle_sports.png',
  vehicle_truck: 'vehicles/vehicle_truck.png',
  vehicle_police: 'vehicles/vehicle_police.png',
  payphone: 'objects/payphone.png',
  package: 'objects/package.png',
  flag: 'objects/flag.png',
  blockpost: 'objects/blockpost.png',
  shop_weapon: 'objects/shop_weapon.png',
  shop_vehicle: 'objects/shop_vehicle.png',
  shop_hospital: 'objects/shop_hospital.png',
  bullet: 'objects/bullet.png',
};

function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  return Buffer.from(base64, 'base64');
}

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => typeof window.__gta2ExportAssets === 'function', { timeout: 20000 });

  const textures = await page.evaluate(() => window.__gta2ExportAssets());
  let written = 0;

  for (const [key, relPath] of Object.entries(ASSET_PATHS)) {
    const dataUrl = textures[key];
    if (!dataUrl) {
      console.warn(`Skip missing texture: ${key}`);
      continue;
    }
    const outPath = join(root, 'public', 'assets', relPath);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, dataUrlToBuffer(dataUrl));
    written++;
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: written,
    keys: Object.keys(textures),
  };
  writeFileSync(join(root, 'public', 'assets', 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Exported ${written} PNG assets to public/assets/`);
} finally {
  await browser.close();
}