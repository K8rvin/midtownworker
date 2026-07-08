import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const weapons = JSON.parse(readFileSync(join(root, 'src/data/weapons.json'), 'utf8'));

const names = Object.fromEntries(weapons.map((w) => [w.id, w.name]));

if (names.fists !== 'Кулаки') {
  throw new Error(`Expected fists -> Кулаки, got ${names.fists}`);
}

const hudLine = `Оружие: ${names.fists}`;
if (hudLine.length > 24) {
  console.warn(`HUD weapon line is ${hudLine.length} chars: ${hudLine}`);
}

console.log('UI logic checks passed');