import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of [
  'src/entities/Pedestrian.ts',
  'src/systems/PedestrianManager.ts',
]) {
  if (!existsSync(join(root, file))) throw new Error(`Missing ${file}`);
}

const nav = readFileSync(join(root, 'src', 'world', 'NavigationGrid.ts'), 'utf8');
for (const token of ['sidewalkGrid', 'findSidewalkPath', 'findRandomSidewalkTile', 'isSidewalk']) {
  if (!nav.includes(token)) throw new Error(`NavigationGrid missing ${token}`);
}

const manager = readFileSync(join(root, 'src', 'systems', 'PedestrianManager.ts'), 'utf8');
if (!manager.includes('pickSpawnTiles')) throw new Error('PedestrianManager spawn logic missing');

const pedestrian = readFileSync(join(root, 'src', 'entities', 'Pedestrian.ts'), 'utf8');
if (!pedestrian.includes('findSidewalkPath')) throw new Error('Pedestrian should use sidewalk paths');
if (!pedestrian.includes('fleeFromVehicles')) throw new Error('Pedestrian vehicle flee missing');

const gameScene = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!gameScene.includes('PedestrianManager')) throw new Error('GameScene should use PedestrianManager');

const layout = JSON.parse(readFileSync(join(root, 'src', 'data', 'city-layout.json'), 'utf8'));
if (!layout.pedestrians?.count) throw new Error('city-layout pedestrians config missing');

console.log('Phase 12 pedestrian checks passed:', { count: layout.pedestrians.count });