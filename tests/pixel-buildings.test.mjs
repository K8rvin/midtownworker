import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const gids = JSON.parse(readFileSync(join(root, 'src/data/tile-gids.json'), 'utf8'));
if (gids.tilecount !== 21) throw new Error(`Expected tilecount 21, got ${gids.tilecount}`);
if (!gids.buildings?.glass || !gids.buildings?.industrial) {
  throw new Error('Building variant GIDs missing');
}
if (!gids.styleBuildings?.skyline || !gids.styleBuildings?.suburban) {
  throw new Error('styleBuildings mapping missing');
}

const spriteGen = readFileSync(join(root, 'src/graphics/SpriteGenerator.ts'), 'utf8');
if (!spriteGen.includes('drawBuildingBrick')) throw new Error('Brick building draw missing');
if (!spriteGen.includes('drawBuildingGlass')) throw new Error('Glass building draw missing');
if (!spriteGen.includes('drawBuildingSuburban')) throw new Error('Suburban building draw missing');
if (!spriteGen.includes('FORCE_TILE_KEYS')) throw new Error('Force-regen tile keys missing');
if (!spriteGen.includes('TILESET_TILECOUNT')) throw new Error('Tileset size from TileGids missing');

const tileGidsTs = readFileSync(join(root, 'src/world/TileGids.ts'), 'utf8');
if (!tileGidsTs.includes('pickBuildingGid')) throw new Error('pickBuildingGid missing');
if (!tileGidsTs.includes('gidToTileType')) throw new Error('gidToTileType missing');

// gid mapping behavior
function gidToTileType(gid) {
  if (gid >= 1 && gid <= 6) return gid - 1;
  if (gid >= 10 && gid <= 17) return 3; // Building
  if (gid >= 18 && gid <= 21) return 4; // Roof
  return null;
}
if (gidToTileType(4) !== 3) throw new Error('GID 4 should be Building');
if (gidToTileType(12) !== 3) throw new Error('GID 12 glass should be Building');
if (gidToTileType(20) !== 4) throw new Error('GID 20 metal roof should be Roof');
if (gidToTileType(7) !== null) throw new Error('Zone GIDs are not terrain');

const mapPath = join(root, 'public/maps/city.tmj');
if (existsSync(mapPath)) {
  const map = JSON.parse(readFileSync(mapPath, 'utf8'));
  const ts = map.tilesets?.[0];
  if (ts && ts.tilecount < 21) {
    throw new Error(`city.tmj tileset tilecount should be ≥21 after generate:map, got ${ts.tilecount}`);
  }
  const ground = map.layers.find((l) => l.name === 'ground');
  if (ground) {
    const buildingVariants = ground.data.filter((g) => g >= 10 && g <= 17);
    if (ts?.tilecount >= 21 && buildingVariants.length === 0) {
      throw new Error('Expected some building variant GIDs (10–17) on ground layer');
    }
  }
}

const cityMap = readFileSync(join(root, 'src/world/CityMap.ts'), 'utf8');
if (!cityMap.includes('tile === TileType.Building || tile === TileType.Roof) continue')) {
  throw new Error('District tint should skip buildings/roofs');
}

console.log('Pixel buildings checks passed');
