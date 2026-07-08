import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = join(root, 'public', 'maps', 'city.tmj');

if (!existsSync(mapPath)) {
  throw new Error('city.tmj missing — run npm run generate:map');
}

const map = JSON.parse(readFileSync(mapPath, 'utf8'));
if (map.width !== 200 || map.height !== 200) {
  throw new Error(`Expected 200x200 map, got ${map.width}x${map.height}`);
}

const layerNames = map.layers.map((l) => l.name);
for (const name of ['ground', 'roof', 'zones', 'objects']) {
  if (!layerNames.includes(name)) throw new Error(`Missing layer: ${name}`);
}

const objectsLayer = map.layers.find((l) => l.name === 'objects');
if (!objectsLayer?.objects?.length) throw new Error('objects layer is empty');

const ground = map.layers.find((l) => l.name === 'ground');
if (ground.data.length !== 200 * 200) throw new Error('Ground layer size mismatch');

console.log('Tiled map checks passed');