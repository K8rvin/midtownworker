import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(join(root, 'src', 'world', 'LaneNavigation.ts'))) {
  throw new Error('LaneNavigation.ts missing');
}

const lanes = readFileSync(join(root, 'src', 'world', 'LaneNavigation.ts'), 'utf8');
for (const token of ['LaneSegment', 'pickNextSegment', 'buildHorizontalLane', 'buildVerticalLane']) {
  if (!lanes.includes(token)) throw new Error(`LaneNavigation missing ${token}`);
}

const vehicle = readFileSync(join(root, 'src', 'entities', 'Vehicle.ts'), 'utf8');
if (!vehicle.includes('initLaneDriving')) throw new Error('Vehicle lane init missing');
if (!vehicle.includes('updateLaneTraffic')) throw new Error('Vehicle lane traffic missing');

const traffic = readFileSync(join(root, 'src', 'systems', 'TrafficManager.ts'), 'utf8');
if (!traffic.includes('LaneNavigation')) throw new Error('TrafficManager should use LaneNavigation');

const gameScene = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!gameScene.includes('laneNavigation')) throw new Error('GameScene should wire LaneNavigation');

console.log('Phase 12 lane navigation checks passed');