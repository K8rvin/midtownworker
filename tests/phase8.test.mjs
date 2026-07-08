import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of [
  'src/world/MapRegistry.ts',
  'src/world/MapTypes.ts',
  'src/systems/DynamicEventManager.ts',
  'src/systems/TimeOfDayManager.ts',
  'src/data/port-objects.json',
]) {
  if (!existsSync(join(root, file))) throw new Error(`${file} missing`);
}

const registry = readFileSync(join(root, 'src', 'world', 'MapRegistry.ts'), 'utf8');
if (!registry.includes('port')) throw new Error('Port map not in registry');

const config = readFileSync(join(root, 'src', 'config.ts'), 'utf8');
if (!config.includes('currentMapId')) throw new Error('currentMapId missing from GameState');

const save = readFileSync(join(root, 'src', 'systems', 'SaveManager.ts'), 'utf8');
if (!save.includes('currentMapId')) throw new Error('SaveManager missing currentMapId');

const preload = readFileSync(join(root, 'src', 'scenes', 'PreloadScene.ts'), 'utf8');
if (!preload.includes('port_map')) throw new Error('PreloadScene missing port_map');

const game = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!game.includes('DynamicEventManager')) throw new Error('GameScene missing DynamicEventManager');
if (!game.includes('TimeOfDayManager')) throw new Error('GameScene missing TimeOfDayManager');
if (!game.includes('performTransition')) throw new Error('GameScene missing map transitions');
if (!game.includes('npcSpawns')) throw new Error('GameScene should spawn NPCs from map');

const nav = readFileSync(join(root, 'src', 'world', 'NavigationGrid.ts'), 'utf8');
if (nav.includes('MAP_WIDTH') || nav.includes('MAP_HEIGHT')) {
  throw new Error('NavigationGrid should use dynamic map size');
}

const blockpost = readFileSync(join(root, 'src', 'systems', 'BlockpostManager.ts'), 'utf8');
if (blockpost.includes('BLOCKPOST_LOCATIONS')) throw new Error('BlockpostManager should not hardcode locations');

const portPath = join(root, 'public', 'maps', 'port.tmj');
if (!existsSync(portPath)) throw new Error('port.tmj missing — run npm run generate:map');
const port = JSON.parse(readFileSync(portPath, 'utf8'));
if (port.width !== 70 || port.height !== 70) throw new Error(`Expected 70x70 port, got ${port.width}x${port.height}`);

const portObjects = port.layers.find((l) => l.name === 'objects');
const hasTransition = portObjects?.objects?.some((o) => o.type === 'transition');
if (!hasTransition) throw new Error('port.tmj missing transition to city');

const cityPath = join(root, 'public', 'maps', 'city.tmj');
const city = JSON.parse(readFileSync(cityPath, 'utf8'));
const cityObjects = city.layers.find((l) => l.name === 'objects');
const hasNpcSpawn = cityObjects?.objects?.some((o) => o.type === 'npc_spawn');
const hasBlockpost = cityObjects?.objects?.some((o) => o.type === 'blockpost');
if (!hasNpcSpawn) throw new Error('city.tmj missing npc_spawn objects');
if (!hasBlockpost) throw new Error('city.tmj missing blockpost objects');

console.log('Phase 8 world checks passed:', {
  port: `${port.width}x${port.height}`,
  cityObjects: cityObjects?.objects?.length,
});