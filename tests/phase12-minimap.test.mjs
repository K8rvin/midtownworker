import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const minimap = readFileSync(join(root, 'src', 'ui', 'Minimap.ts'), 'utf8');
if (!minimap.includes('MINIMAP_VIEWPORT_TILES = 40')) {
  throw new Error('Minimap viewport should be 40 tiles');
}
if (!minimap.includes('redrawViewport')) throw new Error('Minimap should redraw viewport');
if (!minimap.includes('drawEdgeArrow')) throw new Error('Minimap edge arrows missing');
if (!minimap.includes('getAllMinimapMarkers')) throw new Error('Minimap should use getAllMinimapMarkers');

const quests = readFileSync(join(root, 'src', 'systems', 'QuestManager.ts'), 'utf8');
if (!quests.includes('getMinimapGiverMarkers')) throw new Error('QuestManager giver markers missing');
if (!quests.includes('getAllMinimapMarkers')) throw new Error('QuestManager getAllMinimapMarkers missing');

console.log('Phase 12 minimap viewport checks passed');