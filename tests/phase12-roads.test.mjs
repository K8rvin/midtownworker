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
if (!roadLayer.includes('drawRoadMarkings') && !roadLayer.includes('drawCenterLines')) {
  throw new Error('RoadLayer road markings missing');
}
if (!roadLayer.includes('0xffd54a') && !roadLayer.includes('YELLOW')) {
  throw new Error('Double yellow center line missing');
}
if (!roadLayer.includes('drawEqualDashes') && !roadLayer.includes('northH')) {
  throw new Error('Equal pixel-based dashed lane dividers missing');
}
if (!roadLayer.includes('drawZebraOnRoad') && !roadLayer.includes('drawCrosswalks')) {
  throw new Error('Crosswalk / zebra drawing missing');
}
// Zebra bars must be ⊥ to vehicle travel: N/S approaches use 'ns', E/W use 'ew'
{
  const northCall = roadLayer.indexOf('// North approach');
  const westCall = roadLayer.indexOf('// West approach');
  if (northCall < 0 || westCall < 0) throw new Error('Zebra approach comments missing');
  const northBlock = roadLayer.slice(northCall, westCall);
  const westBlock = roadLayer.slice(westCall, roadLayer.indexOf('private drawZebraOnRoad'));
  if (!northBlock.includes("'ns'") || northBlock.includes("'ew'")) {
    throw new Error("N/S road zebra must use barDir 'ns' (stripes ⊥ to N/S traffic)");
  }
  if (!westBlock.includes("'ew'")) {
    throw new Error("E/W road zebra must use barDir 'ew' (stripes ⊥ to E/W traffic)");
  }
}
// Must not paint sidewalk (only Road tiles)
if (roadLayer.includes('TileType.Sidewalk') && roadLayer.includes('drawZebra')) {
  const zebraFn = roadLayer.slice(roadLayer.indexOf('private drawZebraOnRoad'));
  if (zebraFn.includes('TileType.Sidewalk')) {
    throw new Error('Zebra must not include Sidewalk tiles (e.g. 105,97)');
  }
}
if (!roadLayer.includes('TileType.Road')) {
  throw new Error('Zebra should filter TileType.Road');
}
if (!roadLayer.includes('Sidewalk') && !roadLayer.includes('curb')) {
  throw new Error('Zebra should reach sidewalk / curb');
}
if (!roadLayer.includes("barDir === 'ew'") && !roadLayer.includes("'ew'")) {
  throw new Error('Zebra bars should run curb-to-curb (ew/ns)');
}

const spriteGen = readFileSync(join(root, 'src', 'graphics', 'SpriteGenerator.ts'), 'utf8');
const roadTileBlock = spriteGen.match(/forceTile\('tile_road'[\s\S]*?\}\);/)?.[0] ?? '';
if (roadTileBlock.includes('0xc8b86a') || roadTileBlock.includes('center dashed')) {
  throw new Error('tile_road must not bake directional yellow dashes (use RoadLayer)');
}

const lights = readFileSync(join(root, 'src', 'systems', 'TrafficLightManager.ts'), 'utf8');
if (!lights.includes('shouldStop')) throw new Error('TrafficLightManager shouldStop missing');

const layout = JSON.parse(readFileSync(join(root, 'src', 'data', 'city-layout.json'), 'utf8'));
if (!layout.majorRoads?.centers?.length) throw new Error('city-layout majorRoads missing');

console.log('Phase 12 roads & traffic lights checks passed:', {
  majorIntersections: layout.majorRoads.centers.length ** 2,
});