import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const themesPath = join(root, 'src', 'data', 'district-themes.json');
if (!existsSync(themesPath)) throw new Error('district-themes.json missing');
const themes = JSON.parse(readFileSync(themesPath, 'utf8'));
const districtIds = [
  'yakuza_quarter',
  'rednecks_yard',
  'scientists_campus',
  'residential_hills',
  'downtown',
  'central_park',
  'old_town',
  'industrial_mid',
  'waterfront',
  'midtown_east',
];
for (const id of districtIds) {
  if (!themes[id]?.minimap) throw new Error(`Missing minimap theme for ${id}`);
}
if (!themes.default) throw new Error('Missing default district theme');

const layout = JSON.parse(readFileSync(join(root, 'src', 'data', 'city-layout.json'), 'utf8'));
if (!Array.isArray(layout.landmarks) || layout.landmarks.length < 10) {
  throw new Error('Expected at least 10 landmarks in city-layout.json');
}

const cityMap = readFileSync(join(root, 'src', 'world', 'CityMap.ts'), 'utf8');
if (!cityMap.includes('buildDistrictGrid')) throw new Error('CityMap should use DistrictGrid');
if (!cityMap.includes('applyDistrictTints')) throw new Error('CityMap district tints missing');

const minimap = readFileSync(join(root, 'src', 'ui', 'Minimap.ts'), 'utf8');
if (!minimap.includes('getDistrictTheme')) throw new Error('Minimap should use district themes');

const sprites = readFileSync(join(root, 'src', 'graphics', 'SpriteGenerator.ts'), 'utf8');
if (!sprites.includes('genLandmarks')) throw new Error('SpriteGenerator landmark sprites missing');

const mapPath = join(root, 'public', 'maps', 'city.tmj');
if (!existsSync(mapPath)) throw new Error('city.tmj missing — run npm run generate:map');
const city = JSON.parse(readFileSync(mapPath, 'utf8'));
const objects = city.layers.find((l) => l.name === 'objects')?.objects ?? [];
const landmarks = objects.filter((o) => o.type === 'landmark' || o.type === 'tree');
const markers = objects.filter((o) => o.type === 'district_marker');
if (landmarks.length < 10) throw new Error(`Expected 10+ landmarks in city.tmj, got ${landmarks.length}`);
if (markers.length < 10) throw new Error(`Expected 10 district markers, got ${markers.length}`);

console.log('Phase 12 district visuals checks passed:', {
  themes: districtIds.length,
  landmarks: landmarks.length,
  markers: markers.length,
});