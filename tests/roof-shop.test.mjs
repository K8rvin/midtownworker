import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const cityMap = readFileSync(join(root, 'src', 'world', 'CityMap.ts'), 'utf8');
if (!cityMap.includes('roofZones')) throw new Error('CityMap missing roofZones');
if (!cityMap.includes('shopPassableTiles')) throw new Error('CityMap missing shop interiors');

const roofZone = readFileSync(join(root, 'src', 'world', 'RoofZone.ts'), 'utf8');
if (!roofZone.includes('buildRoofZones')) throw new Error('RoofZone builder missing');
if (!roofZone.includes('clampToZone')) throw new Error('RoofZone clampToZone missing');

const shops = JSON.parse(readFileSync(join(root, 'src', 'data', 'shops.json'), 'utf8'));
for (const s of shops) {
  if (s.doorX === undefined || s.interiorX === undefined) {
    throw new Error(`Shop ${s.id} missing interior layout`);
  }
}

const shopMgr = readFileSync(join(root, 'src', 'systems', 'ShopManager.ts'), 'utf8');
if (!shopMgr.includes('getShopAtDoor')) throw new Error('Shop door entry missing');
if (!shopMgr.includes('isInsideShop')) throw new Error('Shop interior check missing');
if (!shopMgr.includes('getShopNearClerk')) throw new Error('Shop clerk proximity missing');
if (!shopMgr.includes('maxDist = 40')) throw new Error('Shop door radius should allow south sidewalk tile');

const TILE_SIZE = 32;
const DOOR_RADIUS = 40;
const grocery = shops.find((s) => s.id === 'grocery_1');
if (!grocery) throw new Error('Grocery shop missing');
const doorCx = grocery.doorX * TILE_SIZE + TILE_SIZE / 2;
const doorCy = grocery.doorY * TILE_SIZE + TILE_SIZE / 2;
const southCx = grocery.doorX * TILE_SIZE + TILE_SIZE / 2;
const southCy = (grocery.doorY + 1) * TILE_SIZE + TILE_SIZE / 2;
const southDist = Math.hypot(southCx - doorCx, southCy - doorCy);
if (southDist >= DOOR_RADIUS) {
  throw new Error(`Grocery door unreachable from south tile (${grocery.doorX}, ${grocery.doorY + 1})`);
}

const jobs = JSON.parse(readFileSync(join(root, 'src', 'data', 'jobs.json'), 'utf8'));
const cashier = jobs.find((j) => j.id === 'cashier');
if (!cashier || cashier.doorX !== grocery.doorX || cashier.doorY !== grocery.doorY) {
  throw new Error('Cashier job door must match grocery shop door');
}

const player = readFileSync(join(root, 'src', 'entities', 'Player.ts'), 'utf8');
if (!player.includes('WALK_ROW_H_LEFT')) throw new Error('Horizontal left walk row missing');

console.log('Roof and shop checks passed');