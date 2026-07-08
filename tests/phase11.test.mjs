import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const layoutPath = join(root, 'src', 'data', 'city-layout.json');
if (!existsSync(layoutPath)) throw new Error('city-layout.json missing');

const layout = JSON.parse(readFileSync(layoutPath, 'utf8'));
if (layout.width !== 200 || layout.height !== 200) {
  throw new Error(`Expected 200x200 layout, got ${layout.width}x${layout.height}`);
}
if (!Array.isArray(layout.districts) || layout.districts.length < 8) {
  throw new Error('Expected at least 8 unique districts');
}

const styles = new Set(layout.districts.map((d) => d.style));
for (const required of ['dense', 'industrial', 'campus', 'suburban', 'skyline', 'park', 'docks']) {
  if (!styles.has(required)) throw new Error(`Missing district style: ${required}`);
}

const gen = readFileSync(join(root, 'scripts', 'lib', 'generate-city-map.mjs'), 'utf8');
if (!gen.includes('applyDistrict')) throw new Error('District generator missing');

const mapGen = readFileSync(join(root, 'src', 'world', 'MapDataGenerator.ts'), 'utf8');
if (!mapGen.includes('city-layout.json')) throw new Error('MapDataGenerator should use city-layout');

const config = readFileSync(join(root, 'src', 'config.ts'), 'utf8');
if (!config.includes('MAP_WIDTH = 200')) throw new Error('MAP_WIDTH should be 200');

const vehicle = readFileSync(join(root, 'src', 'entities', 'Vehicle.ts'), 'utf8');
if (!vehicle.includes('steerSmoothed')) throw new Error('Vehicle steer smoothing missing');

const physics = readFileSync(join(root, 'src', 'systems', 'VehiclePhysics.ts'), 'utf8');
if (!physics.includes('steerSmoothed')) throw new Error('VehiclePhysics steer smoothing missing');

const cityPath = join(root, 'public', 'maps', 'city.tmj');
if (!existsSync(cityPath)) throw new Error('city.tmj missing — run npm run generate:map');
const city = JSON.parse(readFileSync(cityPath, 'utf8'));
if (city.width !== 200) throw new Error(`Generated city map width ${city.width}, expected 200`);

console.log('Phase 11 district map checks passed:', {
  districts: layout.districts.length,
  styles: [...styles],
});