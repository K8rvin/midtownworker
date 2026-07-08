import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const resolver = readFileSync(join(root, 'src', 'systems', 'InteractResolver.ts'), 'utf8');
if (!resolver.includes('pickBest')) throw new Error('InteractResolver missing pickBest');
if (!resolver.includes('shop_clerk')) throw new Error('InteractResolver missing shop_clerk priority');
if (!resolver.includes('traffic_vehicle: 90')) throw new Error('Vehicle priority should beat payphone');

const givers = JSON.parse(readFileSync(join(root, 'src', 'data', 'quest-givers.json'), 'utf8'));
const broker = givers.find((g) => g.id === 'npc_broker');
if (!broker?.interior) throw new Error('Broker missing interior office');
if (broker.interior.doorX !== 70 || broker.interior.doorY !== 72) {
  throw new Error('Broker office door should be in old town building');
}

const worldObjects = JSON.parse(readFileSync(join(root, 'src', 'data', 'world-objects.json'), 'utf8'));
const atCrossroads = worldObjects.payphones?.some((p) => p.x === 100 && p.y === 100);
if (atCrossroads) throw new Error('Payphone should not block crossroads at 100,100');

const shops = JSON.parse(readFileSync(join(root, 'src', 'data', 'shops.json'), 'utf8'));
for (const shop of shops) {
  if (!shop.clerk?.name) throw new Error(`Shop ${shop.id} missing clerk NPC`);
}
const grocery = shops.find((s) => s.type === 'grocery');
if (!grocery) throw new Error('Grocery shop missing');
if (Math.abs(grocery.x - 100) <= 4 && Math.abs(grocery.y - 100) <= 4) {
  throw new Error('Grocery should not sit on the central intersection');
}

const mapGen = readFileSync(join(root, 'src', 'world', 'MapDataGenerator.ts'), 'utf8');
if (!mapGen.includes('placeHospitalBuilding')) throw new Error('Dedicated hospital building placement missing');

const gameScene = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!gameScene.includes('spawnShopClerks')) throw new Error('GameScene missing spawnShopClerks');
if (!gameScene.includes('collectInteractCandidates')) throw new Error('GameScene missing interact resolver');
if (!gameScene.includes('clampToZone')) throw new Error('Roof bounds should clamp, not auto-descend');
if (gameScene.includes('Вы сошли с крыши')) throw new Error('Auto roof descent message should be removed');

const player = readFileSync(join(root, 'src', 'entities', 'Player.ts'), 'utf8');
if (!player.includes('insideInteriorId')) throw new Error('Player missing insideInteriorId');

const npc = readFileSync(join(root, 'src', 'entities', 'NPC.ts'), 'utf8');
if (!npc.includes('shop_clerk')) throw new Error('NPC missing shop_clerk role');

console.log('Phase 13 interaction checks passed');