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
// Zebra bars must be ⊥ to vehicle travel: N/S → 'ns', E/W → 'ew'
{
  const crosswalks = roadLayer.slice(
    roadLayer.indexOf('private drawCrosswalks'),
    roadLayer.indexOf('private verticalBandHalf')
  );
  if (!crosswalks.includes("'ns'") || !crosswalks.includes("'ew'")) {
    throw new Error('Zebra approaches need both ns and ew barDir');
  }
  // N/S blocks use 'ns' first in order (North/South before West/East)
  const firstNs = crosswalks.indexOf("'ns'");
  const firstEw = crosswalks.indexOf("'ew'");
  if (firstNs < 0 || firstEw < 0 || firstNs > firstEw) {
    throw new Error("N/S zebra ('ns') should come before E/W ('ew')");
  }
}
// Must not paint sidewalk (only Road tiles)
{
  const zebraFn = roadLayer.slice(roadLayer.indexOf('private drawZebraOnRoad'));
  if (zebraFn.includes('TileType.Sidewalk')) {
    throw new Error('Zebra must not include Sidewalk tiles (e.g. 105,97)');
  }
}
if (!roadLayer.includes('TileType.Road')) {
  throw new Error('Zebra should filter TileType.Road');
}
// Width must follow major/minor bands, not a single half per junction
if (!roadLayer.includes('verticalBandHalf') || !roadLayer.includes('horizontalBandHalf')) {
  throw new Error('Zebra/stop lines need per-axis band half (major×minor widths)');
}
if (!roadLayer.includes('measureRoadSpanX') || !roadLayer.includes('measureRoadSpanY')) {
  throw new Error('Zebra must measure actual road span for full carriageway width');
}
if (!roadLayer.includes("barDir === 'ew'") && !roadLayer.includes("'ew'")) {
  throw new Error('Zebra bars should use ew/ns directions');
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