import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const majorCenters = [50, 100, 150];
const minorCenters = [25, 75, 125, 175];
const majorHalf = 2;
const minorHalf = 1;

function nearHorizontalRoad(doorY) {
  for (const c of majorCenters) {
    const sidewalkN = c - majorHalf - 1;
    const sidewalkS = c + majorHalf + 1;
    if (doorY === sidewalkN || doorY === sidewalkS) return true;
    if (Math.abs(doorY - c) <= majorHalf + 2) return true;
  }
  for (const c of minorCenters) {
    const sidewalkN = c - minorHalf - 1;
    const sidewalkS = c + minorHalf + 1;
    if (doorY === sidewalkN || doorY === sidewalkS) return true;
    if (Math.abs(doorY - c) <= minorHalf + 2) return true;
  }
  return false;
}

function onRoadTile(x, y) {
  // Road = on horizontal band OR vertical band (sidewalk y=97 next to major 100 is NOT road)
  for (const c of majorCenters) {
    if (Math.abs(y - c) <= majorHalf) return true;
    if (Math.abs(x - c) <= majorHalf) return true;
  }
  for (const c of minorCenters) {
    if (Math.abs(y - c) <= minorHalf) return true;
    if (Math.abs(x - c) <= minorHalf) return true;
  }
  return false;
}

const shops = JSON.parse(readFileSync(join(root, 'src/data/shops.json'), 'utf8'));
const homes = JSON.parse(readFileSync(join(root, 'src/data/homes.json'), 'utf8'));
const jobs = JSON.parse(readFileSync(join(root, 'src/data/jobs.json'), 'utf8'));
const employment = JSON.parse(readFileSync(join(root, 'src/data/employment-office.json'), 'utf8'));

const pois = [
  ...shops.map((s) => ({ id: s.id, doorX: s.doorX, doorY: s.doorY })),
  ...homes.map((h) => ({ id: h.id, doorX: h.doorX, doorY: h.doorY })),
  ...jobs.map((j) => ({ id: j.id, doorX: j.doorX, doorY: j.doorY })),
  ...employment.map((e) => ({ id: e.id, doorX: e.doorX, doorY: e.doorY })),
];

for (const p of pois) {
  if (onRoadTile(p.doorX, p.doorY)) {
    throw new Error(`POI ${p.id} door (${p.doorX},${p.doorY}) is on a road tile`);
  }
  if (!nearHorizontalRoad(p.doorY) && !nearHorizontalRoad(p.doorX)) {
    // allow if doorY is street frontage N of major/minor
    const frontageY = [47, 73, 97, 123, 147, 173, 23];
    if (!frontageY.includes(p.doorY) && !frontageY.includes(p.doorX)) {
      throw new Error(`POI ${p.id} door (${p.doorX},${p.doorY}) not on expected street frontage`);
    }
  }
}

const bank1 = shops.find((s) => s.id === 'bank_1');
const bank2 = shops.find((s) => s.id === 'bank_2');
if (!bank1 || bank1.doorY !== 97) throw new Error('bank_1 should face major street doorY=97');
if (!bank2 || bank2.doorY !== 97) throw new Error('bank_2 should face major street doorY=97');

const mapGen = readFileSync(join(root, 'src/world/MapDataGenerator.ts'), 'utf8');
if (!mapGen.includes('carveApproachFromDoor')) throw new Error('carveApproachFromDoor missing');
if (!mapGen.includes('placePoiFootprint')) throw new Error('placePoiFootprint missing');

const story = readFileSync(join(root, 'src/data/life-sim-story.json'), 'utf8');
if (story.includes('(78, 78)') || story.includes('(106, 109)') || story.includes('(118, 119)')) {
  throw new Error('life-sim-story still has old off-street coordinates');
}

console.log('POI road-front checks passed:', { pois: pois.length });
