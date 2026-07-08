import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const mapPath = join(root, 'public', 'maps', 'city.tmj');
if (!existsSync(mapPath)) throw new Error('city.tmj missing');
const map = JSON.parse(readFileSync(mapPath, 'utf8'));

const objectsLayer = map.layers.find((l) => l.name === 'objects');
if (!objectsLayer || objectsLayer.type !== 'objectgroup') {
  throw new Error('Missing objects layer in city.tmj');
}
if (objectsLayer.objects.length < 10) {
  throw new Error(`Expected 10+ tiled objects, got ${objectsLayer.objects.length}`);
}

const quests = JSON.parse(readFileSync(join(root, 'src', 'data', 'quests.json'), 'utf8'));
const withPrereq = quests.filter((q) => q.requiresQuest);
if (withPrereq.length < 14) {
  throw new Error(`Expected quest chain, only ${withPrereq.length} have requiresQuest`);
}
if (quests[0].requiresQuest) throw new Error('First quest must not require prereq');

const worldObjects = JSON.parse(readFileSync(join(root, 'src', 'data', 'world-objects.json'), 'utf8'));
if (worldObjects.payphones.length < 4) throw new Error('world-objects payphones missing');

const fullMapSrc = readFileSync(join(root, 'src', 'ui', 'FullMapOverlay.ts'), 'utf8');
if (!fullMapSrc.includes('blockposts')) throw new Error('FullMapOverlay missing blockposts');

const parserSrc = readFileSync(join(root, 'src', 'world', 'TiledObjectParser.ts'), 'utf8');
if (!parserSrc.includes('parseTiledObjects')) throw new Error('TiledObjectParser missing');

console.log('Phase 5 checks passed:', {
  tiledObjects: objectsLayer.objects.length,
  questChain: withPrereq.length,
});