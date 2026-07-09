import { MAP_WIDTH, MAP_HEIGHT, type GangId } from '../config';
import { TileType, type MapObject } from './CityMap';
import worldObjects from '../data/world-objects.json';
import shopsData from '../data/shops.json';
import cityLayout from '../data/city-layout.json';
import questGiversData from '../data/quest-givers.json';
import jobsData from '../data/jobs.json';
import homesData from '../data/homes.json';
import employmentOfficeData from '../data/employment-office.json';

export interface GeneratedMapData {
  tiles: TileType[][];
  gangZones: (GangId | null)[][];
  objects: MapObject[];
}

interface DistrictDef {
  id: string;
  name?: string;
  gang: GangId | null;
  x: number;
  y: number;
  w: number;
  h: number;
  style: string;
  blockSize: number;
  gap: number;
}

function paintRoads(
  tiles: TileType[][],
  centers: number[],
  width: number,
  mapW: number,
  mapH: number
): void {
  const half = Math.floor(width / 2);
  for (const center of centers) {
    for (let dy = -half; dy <= half; dy++) {
      const ry = center + dy;
      if (ry < 0 || ry >= mapH) continue;
      for (let x = 0; x < mapW; x++) tiles[ry][x] = TileType.Road;
    }
    for (let dx = -half; dx <= half; dx++) {
      const rx = center + dx;
      if (rx < 0 || rx >= mapW) continue;
      for (let y = 0; y < mapH; y++) tiles[y][rx] = TileType.Road;
    }
  }
}

function isRoadTile(tiles: TileType[][], x: number, y: number): boolean {
  const t = tiles[y]?.[x];
  return t === TileType.Road || t === TileType.Sidewalk;
}

function isBuildable(tiles: TileType[][], x: number, y: number, mapW: number, mapH: number): boolean {
  if (x < 0 || y < 0 || x >= mapW || y >= mapH) return false;
  return tiles[y][x] === TileType.Grass;
}

function blockTouchesRoad(
  tiles: TileType[][],
  bx: number,
  by: number,
  bw: number,
  bh: number,
  mapW: number,
  mapH: number
): boolean {
  for (let y = by; y < by + bh && y < mapH; y++) {
    for (let x = bx; x < bx + bw && x < mapW; x++) {
      if (
        (x > 0 && isRoadTile(tiles, x - 1, y)) ||
        (x < mapW - 1 && isRoadTile(tiles, x + 1, y)) ||
        (y > 0 && isRoadTile(tiles, x, y - 1)) ||
        (y < mapH - 1 && isRoadTile(tiles, x, y + 1))
      ) {
        return true;
      }
    }
  }
  return false;
}

function fillChance(bx: number, by: number, rate: number): boolean {
  return ((bx * 7 + by * 13) % 10) / 10 < rate;
}

function placeBlock(
  tiles: TileType[][],
  objects: MapObject[],
  bx: number,
  by: number,
  bw: number,
  bh: number,
  mapW: number,
  mapH: number,
  addRoof = true
): boolean {
  if (!blockTouchesRoad(tiles, bx, by, bw, bh, mapW, mapH)) return false;

  let placed = false;
  for (let y = by; y < by + bh && y < mapH; y++) {
    for (let x = bx; x < bx + bw && x < mapW; x++) {
      if (isBuildable(tiles, x, y, mapW, mapH)) {
        tiles[y][x] = TileType.Building;
        placed = true;
      }
    }
  }
  if (!placed || !addRoof) return placed;

  const rx = bx + 1;
  const ry = by + 1;
  if (rx < mapW && ry < mapH && tiles[ry][rx] === TileType.Building) {
    tiles[ry][rx] = TileType.Roof;
  }
  const sx = bx + Math.min(2, bw - 1);
  if (sx < mapW && ry < mapH && tiles[ry][sx] === TileType.Building) {
    tiles[ry][sx] = TileType.Stairs;
    objects.push({ type: 'stairs', x: sx, y: ry });
  }
  return placed;
}

function fillGridDistrict(
  tiles: TileType[][],
  objects: MapObject[],
  district: DistrictDef,
  mapW: number,
  mapH: number,
  fillRate = 1
): void {
  const { x, y, w, h, blockSize, gap } = district;
  const step = blockSize + gap;
  for (let by = y; by < y + h; by += step) {
    for (let bx = x; bx < x + w; bx += step) {
      if (bx + blockSize > x + w || by + blockSize > y + h) continue;
      if (fillRate < 1 && !fillChance(bx, by, fillRate)) continue;
      placeBlock(tiles, objects, bx, by, blockSize, blockSize, mapW, mapH);
    }
  }
}

function fillCampus(
  tiles: TileType[][],
  objects: MapObject[],
  district: DistrictDef,
  mapW: number,
  mapH: number
): void {
  const { x, y, w, h, blockSize } = district;
  const cluster = blockSize + 4;
  for (let cy = y + 2; cy < y + h - blockSize; cy += cluster) {
    for (let cx = x + 2; cx < x + w - blockSize; cx += cluster) {
      placeBlock(tiles, objects, cx, cy, blockSize, blockSize, mapW, mapH);
    }
  }
}

function scatterParkTrees(
  tiles: TileType[][],
  objects: MapObject[],
  district: DistrictDef,
  mapW: number,
  mapH: number
): void {
  const { x, y, w, h } = district;
  for (let py = y + 3; py < y + h - 3; py += 4) {
    for (let px = x + 3; px < x + w - 3; px += 5) {
      if (px >= mapW || py >= mapH) continue;
      if (tiles[py][px] !== TileType.Grass) continue;
      if (((px * 7 + py * 13) % 10) / 10 >= 0.45) continue;
      objects.push({ type: 'tree', x: px, y: py });
    }
  }
}

function fillPark(
  tiles: TileType[][],
  objects: MapObject[],
  district: DistrictDef,
  mapW: number,
  mapH: number
): void {
  const { x, y, w, h } = district;
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);

  for (let py = y + 2; py < y + h - 2; py++) {
    for (let px = cx - 1; px <= cx + 1; px++) {
      if (px >= 0 && px < mapW && py >= 0 && py < mapH && tiles[py][px] === TileType.Grass) {
        tiles[py][px] = TileType.Sidewalk;
      }
    }
  }
  for (let px = x + 2; px < x + w - 2; px++) {
    for (let py = cy - 1; py <= cy + 1; py++) {
      if (px >= 0 && px < mapW && py >= 0 && py < mapH && tiles[py][px] === TileType.Grass) {
        tiles[py][px] = TileType.Sidewalk;
      }
    }
  }

  const pondX = cx - 2;
  const pondY = cy + 4;
  for (let py = pondY; py < pondY + 4 && py < mapH; py++) {
    for (let px = pondX; px < pondX + 5 && px < mapW; px++) {
      if (px >= x && px < x + w && py >= y && py < y + h) {
        tiles[py][px] = TileType.Grass;
      }
    }
  }

  scatterParkTrees(tiles, objects, district, mapW, mapH);
}

function clearTileForProp(tiles: TileType[][], x: number, y: number, mapW: number, mapH: number): void {
  if (x < 0 || y < 0 || x >= mapW || y >= mapH) return;
  const t = tiles[y][x];
  if (t === TileType.Building || t === TileType.Roof || t === TileType.Stairs) {
    tiles[y][x] = TileType.Sidewalk;
  }
}

interface LandmarkDef {
  district: string;
  kind: string;
  x: number;
  y: number;
}

function placeLandmarks(
  tiles: TileType[][],
  objects: MapObject[],
  landmarks: LandmarkDef[],
  mapW: number,
  mapH: number
): void {
  for (const lm of landmarks) {
    if (lm.x < 0 || lm.y < 0 || lm.x >= mapW || lm.y >= mapH) continue;
    clearTileForProp(tiles, lm.x, lm.y, mapW, mapH);
    const type = lm.kind === 'tree' ? 'tree' : 'landmark';
    objects.push({
      type,
      x: lm.x,
      y: lm.y,
      data: { kind: lm.kind, districtId: lm.district },
    });
  }
}

function placeDistrictMarkers(objects: MapObject[], districts: DistrictDef[]): void {
  for (const d of districts) {
    objects.push({
      type: 'district_marker',
      x: d.x + Math.floor(d.w / 2),
      y: d.y + Math.floor(d.h / 2),
      data: { districtId: d.id, name: d.name },
    });
  }
}

function fillDocks(
  tiles: TileType[][],
  objects: MapObject[],
  district: DistrictDef,
  mapW: number,
  mapH: number
): void {
  const { x, y, w, h } = district;
  for (let stripY = y + 1; stripY < y + h - 3; stripY += 5) {
    for (let stripX = x + 1; stripX < x + w - 8; stripX += 9) {
      placeBlock(tiles, objects, stripX, stripY, 8, 3, mapW, mapH, stripY === y + 1);
    }
  }
}

function applyDistrict(
  tiles: TileType[][],
  gangZones: (GangId | null)[][],
  objects: MapObject[],
  district: DistrictDef,
  mapW: number,
  mapH: number
): void {
  const { x, y, w, h, gang, style } = district;

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx >= mapW || ty >= mapH) continue;
      if (gang) gangZones[ty][tx] = gang;
    }
  }

  switch (style) {
    case 'dense':
    case 'skyline':
    case 'industrial':
    case 'mixed':
      fillGridDistrict(tiles, objects, district, mapW, mapH);
      break;
    case 'sparse':
      fillGridDistrict(tiles, objects, district, mapW, mapH, 0.55);
      break;
    case 'suburban':
      fillGridDistrict(tiles, objects, district, mapW, mapH, 0.65);
      break;
    case 'campus':
      fillCampus(tiles, objects, district, mapW, mapH);
      break;
    case 'park':
      fillPark(tiles, objects, district, mapW, mapH);
      break;
    case 'docks':
      fillDocks(tiles, objects, district, mapW, mapH);
      break;
    default:
      fillGridDistrict(tiles, objects, district, mapW, mapH);
  }
}

function paintSidewalks(tiles: TileType[][], mapW: number, mapH: number): void {
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      if (tiles[y][x] !== TileType.Grass) continue;
      const nearRoad =
        (x > 0 && tiles[y][x - 1] === TileType.Road) ||
        (x < mapW - 1 && tiles[y][x + 1] === TileType.Road) ||
        (y > 0 && tiles[y - 1][x] === TileType.Road) ||
        (y < mapH - 1 && tiles[y + 1][x] === TileType.Road);
      if (nearRoad) tiles[y][x] = TileType.Sidewalk;
    }
  }
}

function placeHomeBuildings(tiles: TileType[][], mapW: number, mapH: number): void {
  for (const home of homesData as { doorX: number; doorY: number }[]) {
    const bx = home.doorX - 1;
    const by = home.doorY - 2;
    placeBlock(tiles, [], bx, by, 3, 3, mapW, mapH, false);
  }
}

function placeShopBuildings(tiles: TileType[][], mapW: number, mapH: number): void {
  for (const shop of shopsData as { doorX: number; doorY: number }[]) {
    const bx = shop.doorX - 1;
    const by = shop.doorY - 2;
    placeBlock(tiles, [], bx, by, 3, 3, mapW, mapH, false);
  }
}

function placeEmploymentBuildings(tiles: TileType[][], mapW: number, mapH: number): void {
  for (const office of employmentOfficeData as { doorX: number; doorY: number }[]) {
    const bx = office.doorX - 1;
    const by = office.doorY - 2;
    placeBlock(tiles, [], bx, by, 3, 3, mapW, mapH, false);
  }
}

/** Standalone hospital block in midtown east — off the central intersection. */
function placeHospitalBuilding(tiles: TileType[][], mapW: number, mapH: number): void {
  const bx = 128;
  const by = 112;
  const bw = 5;
  const bh = 4;
  placeBlock(tiles, [], bx, by, bw, bh, mapW, mapH, false);
  for (let x = bx + 1; x < bx + bw - 1; x++) {
    const py = by + bh;
    if (py < mapH && x >= 0 && x < mapW && tiles[py][x] === TileType.Grass) {
      tiles[py][x] = TileType.Sidewalk;
    }
  }
}

function applyBuildingInteriors(
  tiles: TileType[][],
  layouts: {
    doorX?: number;
    doorY?: number;
    interiorX?: number;
    interiorY?: number;
    interiorW?: number;
    interiorH?: number;
  }[]
): void {
  for (const layout of layouts) {
    if (layout.doorX !== undefined && layout.doorY !== undefined) {
      tiles[layout.doorY][layout.doorX] = TileType.Sidewalk;
    }
    if (layout.interiorX !== undefined && layout.interiorY !== undefined) {
      for (let iy = layout.interiorY; iy < layout.interiorY + (layout.interiorH ?? 1); iy++) {
        for (let ix = layout.interiorX; ix < layout.interiorX + (layout.interiorW ?? 1); ix++) {
          if (iy < tiles.length && ix < (tiles[0]?.length ?? 0)) tiles[iy][ix] = TileType.Sidewalk;
        }
      }
      if (layout.doorX !== undefined && layout.doorY !== undefined) {
        const aisleStart = layout.interiorY + (layout.interiorH ?? 1);
        for (let iy = aisleStart; iy < layout.doorY; iy++) {
          if (iy >= 0 && iy < tiles.length && layout.doorX < (tiles[0]?.length ?? 0)) {
            tiles[iy][layout.doorX] = TileType.Sidewalk;
          }
        }
      }
    }
  }
}

export function generateMapData(): GeneratedMapData {
  const tiles: TileType[][] = [];
  const gangZones: (GangId | null)[][] = [];
  const objects: MapObject[] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    tiles[y] = [];
    gangZones[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles[y][x] = TileType.Grass;
      gangZones[y][x] = null;
    }
  }

  paintRoads(tiles, cityLayout.majorRoads.centers, cityLayout.majorRoads.width, MAP_WIDTH, MAP_HEIGHT);
  paintRoads(tiles, cityLayout.minorRoads.centers, cityLayout.minorRoads.width, MAP_WIDTH, MAP_HEIGHT);
  paintSidewalks(tiles, MAP_WIDTH, MAP_HEIGHT);

  for (const district of cityLayout.districts as DistrictDef[]) {
    applyDistrict(tiles, gangZones, objects, district, MAP_WIDTH, MAP_HEIGHT);
  }

  const stairSpots = [
    { x: 97, y: 97 },
    { x: 103, y: 97 },
    { x: 97, y: 103 },
    { x: 103, y: 103 },
  ];
  for (const s of stairSpots) {
    if (s.y >= MAP_HEIGHT || s.x >= MAP_WIDTH) continue;
    const tile = tiles[s.y][s.x];
    if (tile === TileType.Building || tile === TileType.Grass || tile === TileType.Sidewalk) {
      tiles[s.y][s.x] = TileType.Stairs;
      if (!objects.some((o) => o.type === 'stairs' && o.x === s.x && o.y === s.y)) {
        objects.push({ type: 'stairs', x: s.x, y: s.y });
      }
    }
  }

  for (const p of worldObjects.payphones) {
    objects.push({ type: 'payphone', x: p.x, y: p.y });
  }
  for (const f of worldObjects.flags) {
    objects.push({ type: 'flag', x: f.x, y: f.y, data: { gang: f.gang as GangId } });
  }
  placeLandmarks(
    tiles,
    objects,
    (cityLayout.landmarks ?? []) as LandmarkDef[],
    MAP_WIDTH,
    MAP_HEIGHT
  );
  placeDistrictMarkers(objects, cityLayout.districts as DistrictDef[]);
  placeHospitalBuilding(tiles, MAP_WIDTH, MAP_HEIGHT);
  placeHomeBuildings(tiles, MAP_WIDTH, MAP_HEIGHT);
  placeShopBuildings(tiles, MAP_WIDTH, MAP_HEIGHT);
  placeEmploymentBuildings(tiles, MAP_WIDTH, MAP_HEIGHT);

  applyBuildingInteriors(
    tiles,
    shopsData as {
      doorX?: number;
      doorY?: number;
      interiorX?: number;
      interiorY?: number;
      interiorW?: number;
      interiorH?: number;
    }[]
  );
  applyBuildingInteriors(
    tiles,
    (questGiversData as { interior?: {
      doorX: number;
      doorY: number;
      interiorX: number;
      interiorY: number;
      interiorW: number;
      interiorH: number;
    } }[])
      .filter((g) => g.interior)
      .map((g) => g.interior!)
  );
  applyBuildingInteriors(
    tiles,
    (jobsData as {
      doorX: number;
      doorY: number;
      interiorX: number;
      interiorY: number;
      interiorW: number;
      interiorH: number;
    }[])
  );
  applyBuildingInteriors(
    tiles,
    employmentOfficeData as {
      doorX: number;
      doorY: number;
      interiorX: number;
      interiorY: number;
      interiorW: number;
      interiorH: number;
    }[]
  );
  applyBuildingInteriors(
    tiles,
    (homesData as { doorX: number; doorY: number }[]).map((h) => ({
      doorX: h.doorX,
      doorY: h.doorY,
      interiorX: h.doorX - 1,
      interiorY: h.doorY - 2,
      interiorW: 3,
      interiorH: 2,
    }))
  );

  for (const shop of shopsData as { id: string; x: number; y: number }[]) {
    objects.push({ type: 'shop', x: shop.x, y: shop.y, data: { shopId: shop.id } });
  }

  return { tiles, gangZones, objects };
}

export {
  tileTypeToGid,
  gidToTileType,
  visualGidForTile,
  TILESET_TILECOUNT,
  TILESET_COLUMNS,
} from './TileGids';

/** Zone layer GID: 7=yakuza, 8=rednecks, 9=scientists */
export function gangToZoneGid(gang: GangId | null): number {
  if (!gang) return 0;
  return gang === 'yakuza' ? 7 : gang === 'rednecks' ? 8 : 9;
}

export function zoneGidToGang(gid: number): GangId | null {
  if (gid === 7) return 'yakuza';
  if (gid === 8) return 'rednecks';
  if (gid === 9) return 'scientists';
  return null;
}