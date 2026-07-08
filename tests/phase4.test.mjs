import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

const gangs = readJson('src/data/gangs.json');
const ammo = readJson('src/data/ammo.json');

if (gangs.length !== 3) throw new Error(`Expected 3 gangs, got ${gangs.length}`);
for (const g of gangs) {
  if (!g.homeDistrict) throw new Error(`Gang ${g.id} missing homeDistrict`);
}

if (ammo.length < 3) throw new Error('Ammo packs missing');

const shopSrc = readFileSync(join(root, 'src/systems/ShopManager.ts'), 'utf8');
if (!shopSrc.includes('buyAmmo')) throw new Error('ShopManager.buyAmmo missing');

const policeSrc = readFileSync(join(root, 'src/systems/PoliceManager.ts'), 'utf8');
if (!policeSrc.includes('policeVehicles')) throw new Error('Police vehicles missing');

const questSrc = readFileSync(join(root, 'src/systems/QuestManager.ts'), 'utf8');
if (!questSrc.includes('captureSnapshot')) throw new Error('Quest snapshot missing');

const victoryExists = readFileSync(join(root, 'src/main.ts'), 'utf8').includes('VictoryScene');
if (!victoryExists) throw new Error('VictoryScene not registered');

console.log('Phase 4 unit checks passed');