import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of [
  'src/world/RoadNetwork.ts',
  'src/world/RoadLayer.ts',
  'src/systems/TrafficLightManager.ts',
]) {
  if (!existsSync(join(root, file))) throw new Error(`Missing ${file}`);
}

const gameScene = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!gameScene.includes('RoadLayer')) throw new Error('GameScene should use RoadLayer');
if (!gameScene.includes('TrafficLightManager')) throw new Error('GameScene should use TrafficLightManager');
const playerDriveBlock = gameScene.match(/private updateVehicleDriving[\s\S]*?^  \}/m)?.[0] ?? '';
if (playerDriveBlock.includes('shouldStop')) {
  throw new Error('Player vehicle should ignore traffic lights');
}

const vehicle = readFileSync(join(root, 'src', 'entities', 'Vehicle.ts'), 'utf8');
if (!vehicle.includes('trafficLights')) throw new Error('Vehicle should respect traffic lights');

const traffic = readFileSync(join(root, 'src', 'systems', 'TrafficManager.ts'), 'utf8');
if (!traffic.includes('TrafficLightManager')) throw new Error('TrafficManager should pass traffic lights');

const roadLayer = readFileSync(join(root, 'src', 'world', 'RoadLayer.ts'), 'utf8');
if (!roadLayer.includes('drawCenterLines')) throw new Error('RoadLayer center lines missing');

const lights = readFileSync(join(root, 'src', 'systems', 'TrafficLightManager.ts'), 'utf8');
if (!lights.includes('shouldStop')) throw new Error('TrafficLightManager shouldStop missing');

const layout = JSON.parse(readFileSync(join(root, 'src', 'data', 'city-layout.json'), 'utf8'));
if (!layout.majorRoads?.centers?.length) throw new Error('city-layout majorRoads missing');

console.log('Phase 12 roads & traffic lights checks passed:', {
  majorIntersections: layout.majorRoads.centers.length ** 2,
});