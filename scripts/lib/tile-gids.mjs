/**
 * Mirror of src/data/tile-gids.json + helpers for map generation scripts.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tileGids = JSON.parse(readFileSync(join(root, 'src', 'data', 'tile-gids.json'), 'utf8'));
const cityLayout = JSON.parse(readFileSync(join(root, 'src', 'data', 'city-layout.json'), 'utf8'));

export const TILESET_TILECOUNT = tileGids.tilecount;
export const TILESET_COLUMNS = tileGids.columns;

const BUILDING_MIN = 10;
const BUILDING_MAX = 17;
const ROOF_MIN = 18;
const ROOF_MAX = 21;

const districtStyleMap = new Map();
for (const d of cityLayout.districts) {
  districtStyleMap.set(d.id, d.style);
}

export function getDistrictStyleAt(tx, ty) {
  for (const d of cityLayout.districts) {
    if (tx >= d.x && ty >= d.y && tx < d.x + d.w && ty < d.y + d.h) {
      return d.style ?? 'mixed';
    }
  }
  return 'mixed';
}

export function tileHash(tx, ty) {
  return ((tx * 374761393 + ty * 668265263) >>> 0) % 10007;
}

export function pickBuildingGid(tx, ty, style) {
  const list = tileGids.styleBuildings[style] ?? tileGids.styleBuildings.mixed;
  return list[tileHash(tx, ty) % list.length];
}

export function pickRoofGid(tx, ty, style) {
  const list = tileGids.styleRoofs[style] ?? tileGids.styleRoofs.mixed;
  return list[tileHash(tx + 3, ty + 7) % list.length];
}

/** TileType enum values: Grass0 Road1 Sidewalk2 Building3 Roof4 Stairs5 */
export function visualGidForTile(tile, tx, ty, style) {
  if (tile === 3) return pickBuildingGid(tx, ty, style);
  if (tile === 4) return pickRoofGid(tx, ty, style);
  if (tile === 0) return tileGids.base.grass;
  if (tile === 1) return tileGids.base.road;
  if (tile === 2) return tileGids.base.sidewalk;
  if (tile === 5) return tileGids.base.stairs;
  return tile + 1;
}

export function tileToGid(tile) {
  return tile + 1;
}

export function tilesetMeta() {
  return {
    columns: TILESET_COLUMNS,
    firstgid: 1,
    margin: 0,
    name: 'city_tileset',
    spacing: 0,
    tilecount: TILESET_TILECOUNT,
    tileheight: 32,
    tilewidth: 32,
  };
}
