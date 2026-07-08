/**
 * Shared city map generator with unique districts.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const TileType = { Grass: 0, Road: 1, Sidewalk: 2, Building: 3, Roof: 4, Stairs: 5 };

export { TileType };

export function loadCityLayout(root) {
  return JSON.parse(readFileSync(join(root, 'src', 'data', 'city-layout.json'), 'utf8'));
}

function paintRoads(tiles, centers, width, mapW, mapH) {
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

function isRoadTile(tiles, x, y) {
  const t = tiles[y]?.[x];
  return t === TileType.Road || t === TileType.Sidewalk;
}

function isBuildable(tiles, x, y, mapW, mapH) {
  if (x < 0 || y < 0 || x >= mapW || y >= mapH) return false;
  return tiles[y][x] === TileType.Grass;
}

function blockTouchesRoad(tiles, bx, by, bw, bh, mapW, mapH) {
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

function fillChance(bx, by, rate) {
  return ((bx * 7 + by * 13) % 10) / 10 < rate;
}

function placeBlock(tiles, objects, bx, by, bw, bh, mapW, mapH, addRoof = true) {
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

function fillGridDistrict(tiles, objects, district, mapW, mapH, fillRate = 1) {
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

function fillCampus(tiles, objects, district, mapW, mapH) {
  const { x, y, w, h, blockSize } = district;
  const cluster = blockSize + 4;
  for (let cy = y + 2; cy < y + h - blockSize; cy += cluster) {
    for (let cx = x + 2; cx < x + w - blockSize; cx += cluster) {
      placeBlock(tiles, objects, cx, cy, blockSize, blockSize, mapW, mapH);
    }
  }
}

function scatterParkTrees(tiles, objects, district, mapW, mapH) {
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

function fillPark(tiles, objects, district, mapW, mapH) {
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

function clearTileForProp(tiles, x, y, mapW, mapH) {
  if (x < 0 || y < 0 || x >= mapW || y >= mapH) return;
  const t = tiles[y][x];
  if (t === TileType.Building || t === TileType.Roof || t === TileType.Stairs) {
    tiles[y][x] = TileType.Sidewalk;
  }
}

function placeLandmarks(tiles, objects, layout, mapW, mapH) {
  for (const lm of layout.landmarks ?? []) {
    if (lm.x < 0 || lm.y < 0 || lm.x >= mapW || lm.y >= mapH) continue;
    clearTileForProp(tiles, lm.x, lm.y, mapW, mapH);
    const type = lm.kind === 'tree' ? 'tree' : 'landmark';
    objects.push({
      type,
      x: lm.x,
      y: lm.y,
      kind: lm.kind,
      districtId: lm.district,
    });
  }
}

function placeDistrictMarkers(objects, districts) {
  for (const d of districts) {
    objects.push({
      type: 'district_marker',
      x: d.x + Math.floor(d.w / 2),
      y: d.y + Math.floor(d.h / 2),
      districtId: d.id,
      name: d.name,
    });
  }
}

function fillDocks(tiles, objects, district, mapW, mapH) {
  const { x, y, w, h } = district;
  for (let stripY = y + 1; stripY < y + h - 3; stripY += 5) {
    for (let stripX = x + 1; stripX < x + w - 8; stripX += 9) {
      placeBlock(tiles, objects, stripX, stripY, 8, 3, mapW, mapH, stripY === y + 1);
    }
  }
}

function applyDistrict(tiles, gangZones, objects, district, mapW, mapH) {
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

function paintSidewalks(tiles, mapW, mapH) {
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

export function generateCityMapData(root) {
  const layout = loadCityLayout(root);
  const MAP_WIDTH = layout.width;
  const MAP_HEIGHT = layout.height;
  const tiles = [];
  const gangZones = [];
  const objects = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    tiles[y] = [];
    gangZones[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles[y][x] = TileType.Grass;
      gangZones[y][x] = null;
    }
  }

  paintRoads(tiles, layout.majorRoads.centers, layout.majorRoads.width, MAP_WIDTH, MAP_HEIGHT);
  paintRoads(tiles, layout.minorRoads.centers, layout.minorRoads.width, MAP_WIDTH, MAP_HEIGHT);
  paintSidewalks(tiles, MAP_WIDTH, MAP_HEIGHT);

  for (const district of layout.districts) {
    applyDistrict(tiles, gangZones, objects, district, MAP_WIDTH, MAP_HEIGHT);
  }

  const worldObjects = JSON.parse(readFileSync(join(root, 'src', 'data', 'world-objects.json'), 'utf8'));
  const shops = JSON.parse(readFileSync(join(root, 'src', 'data', 'shops.json'), 'utf8'));
  const questGivers = JSON.parse(readFileSync(join(root, 'src', 'data', 'quest-givers.json'), 'utf8'));

  function placeHospitalBuilding() {
    const bx = 128;
    const by = 112;
    const bw = 5;
    const bh = 4;
    placeBlock(tiles, objects, bx, by, bw, bh, MAP_WIDTH, MAP_HEIGHT, false);
    for (let x = bx + 1; x < bx + bw - 1; x++) {
      const py = by + bh;
      if (py < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH && tiles[py][x] === TileType.Grass) {
        tiles[py][x] = TileType.Sidewalk;
      }
    }
  }

  function applyInteriors(layouts) {
    for (const layout of layouts) {
      if (layout.doorX !== undefined && layout.doorY !== undefined) {
        tiles[layout.doorY][layout.doorX] = TileType.Sidewalk;
      }
      if (layout.interiorX !== undefined) {
        for (let iy = layout.interiorY; iy < layout.interiorY + layout.interiorH; iy++) {
          for (let ix = layout.interiorX; ix < layout.interiorX + layout.interiorW; ix++) {
            if (iy < MAP_HEIGHT && ix < MAP_WIDTH) tiles[iy][ix] = TileType.Sidewalk;
          }
        }
      }
    }
  }

  placeHospitalBuilding();
  applyInteriors(shops);
  applyInteriors(questGivers.filter((g) => g.interior).map((g) => g.interior));

  for (const p of worldObjects.payphones) objects.push({ type: 'payphone', x: p.x, y: p.y });
  for (const f of worldObjects.flags) objects.push({ type: 'flag', x: f.x, y: f.y, gang: f.gang });
  for (const s of shops) objects.push({ type: 'shop', x: s.x, y: s.y, shopId: s.id });

  placeLandmarks(tiles, objects, layout, MAP_WIDTH, MAP_HEIGHT);
  placeDistrictMarkers(objects, layout.districts);

  return {
    MAP_WIDTH,
    MAP_HEIGHT,
    tiles,
    gangZones,
    objects,
    npcSpawns: layout.npcSpawns,
    blockposts: layout.blockposts,
    transitions: layout.transitions,
    districts: layout.districts,
  };
}