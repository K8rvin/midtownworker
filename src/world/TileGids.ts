import tileGids from '../data/tile-gids.json';
import cityLayout from '../data/city-layout.json';

/** Numeric mirror of CityMap.TileType — avoid circular import. */
export const TT = {
  Grass: 0,
  Road: 1,
  Sidewalk: 2,
  Building: 3,
  Roof: 4,
  Stairs: 5,
} as const;

export const TILESET_TILECOUNT = tileGids.tilecount as number;
export const TILESET_COLUMNS = tileGids.columns as number;

const BUILDING_MIN = 10;
const BUILDING_MAX = 17;
const ROOF_MIN = 18;
const ROOF_MAX = 21;

const styleBuildings = tileGids.styleBuildings as Record<string, number[]>;
const styleRoofs = tileGids.styleRoofs as Record<string, number[]>;
const base = tileGids.base as Record<string, number>;

const districtStyleMap = new Map<string, string>();
for (const d of cityLayout.districts as { id: string; style: string }[]) {
  districtStyleMap.set(d.id, d.style);
}

export function getDistrictStyle(districtId: string | null): string {
  if (!districtId) return 'mixed';
  return districtStyleMap.get(districtId) ?? 'mixed';
}

/** Deterministic hash for variant pick. */
export function tileHash(tx: number, ty: number): number {
  return ((tx * 374761393 + ty * 668265263) >>> 0) % 10007;
}

export function pickBuildingGid(tx: number, ty: number, style: string): number {
  const list = styleBuildings[style] ?? styleBuildings.mixed ?? [base.building];
  return list[tileHash(tx, ty) % list.length];
}

export function pickRoofGid(tx: number, ty: number, style: string): number {
  const list = styleRoofs[style] ?? styleRoofs.mixed ?? [base.roof];
  return list[tileHash(tx + 3, ty + 7) % list.length];
}

/** Logical tile type → default GID (no variants). */
export function tileTypeToGid(tile: number): number {
  return tile + 1;
}

/**
 * Visual GID for map export: buildings/roofs vary by district style.
 */
export function visualGidForTile(
  tile: number,
  tx: number,
  ty: number,
  districtStyle: string
): number {
  if (tile === TT.Building) return pickBuildingGid(tx, ty, districtStyle);
  if (tile === TT.Roof) return pickRoofGid(tx, ty, districtStyle);
  if (tile === TT.Grass) return base.grass;
  if (tile === TT.Road) return base.road;
  if (tile === TT.Sidewalk) return base.sidewalk;
  if (tile === TT.Stairs) return base.stairs;
  return tileTypeToGid(tile);
}

/** Any visual GID → collision/logic TileType numeric value. */
export function gidToTileType(gid: number): number | null {
  if (gid >= 1 && gid <= 6) return gid - 1;
  if (gid >= BUILDING_MIN && gid <= BUILDING_MAX) return TT.Building;
  if (gid >= ROOF_MIN && gid <= ROOF_MAX) return TT.Roof;
  return null;
}

export function isBuildingGid(gid: number): boolean {
  return gid === base.building || (gid >= BUILDING_MIN && gid <= BUILDING_MAX);
}

export function isRoofGid(gid: number): boolean {
  return gid === base.roof || (gid >= ROOF_MIN && gid <= ROOF_MAX);
}

export function textureKeyForGid(gid: number): string | null {
  const keys = tileGids.keysByGid as Record<string, string | null>;
  return keys[String(gid)] ?? null;
}

/** Ordered texture keys for city_tileset frames 0..tilecount-1 (null = solid zone swatch). */
export function tilesetFrameKeys(): (string | null)[] {
  const keys = tileGids.keysByGid as Record<string, string | null>;
  const out: (string | null)[] = [];
  for (let gid = 1; gid <= TILESET_TILECOUNT; gid++) {
    out.push(keys[String(gid)] ?? null);
  }
  return out;
}
