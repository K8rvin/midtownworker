/**
 * Generates public/maps/city.tmj and port.tmj with full object layers.
 * Run: npm run generate:map
 */
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { generateCityMapData, TileType } from './lib/generate-city-map.mjs';

const TILE_SIZE = 32;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'maps');

function tileToGid(tile) {
  return tile + 1;
}

function gangToZoneGid(gang) {
  if (!gang) return 0;
  return gang === 'yakuza' ? 7 : gang === 'rednecks' ? 8 : 9;
}

function pushObject(tiled, idRef, base, extra) {
  tiled.push({ ...base, id: idRef.id++, ...extra });
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

function generatePortMapData() {
  const MAP_WIDTH = 70;
  const MAP_HEIGHT = 70;
  const tiles = [];
  const gangZones = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    tiles[y] = [];
    gangZones[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles[y][x] = TileType.Grass;
      gangZones[y][x] = null;
    }
  }

  paintRoads(tiles, [14, 35, 56], 4, MAP_WIDTH, MAP_HEIGHT);

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (tiles[y][x] !== TileType.Grass) continue;
      const nearRoad =
        (x > 0 && tiles[y][x - 1] === TileType.Road) ||
        (x < MAP_WIDTH - 1 && tiles[y][x + 1] === TileType.Road) ||
        (y > 0 && tiles[y - 1][x] === TileType.Road) ||
        (y < MAP_HEIGHT - 1 && tiles[y + 1][x] === TileType.Road);
      if (nearRoad) tiles[y][x] = TileType.Sidewalk;
    }
  }

  for (let y = 0; y < 31; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (tiles[y][x] === TileType.Grass || tiles[y][x] === TileType.Sidewalk) {
        tiles[y][x] = TileType.Building;
        gangZones[y][x] = 'rednecks';
      }
    }
  }
  for (let y = 39; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (tiles[y][x] === TileType.Grass || tiles[y][x] === TileType.Sidewalk) {
        tiles[y][x] = TileType.Building;
        gangZones[y][x] = 'scientists';
      }
    }
  }

  const portData = JSON.parse(readFileSync(join(root, 'src', 'data', 'port-objects.json'), 'utf8'));
  const objects = [];
  for (const p of portData.payphones) objects.push({ type: 'payphone', x: p.x, y: p.y });
  for (const f of portData.flags) objects.push({ type: 'flag', x: f.x, y: f.y, gang: f.gang });

  return {
    MAP_WIDTH,
    MAP_HEIGHT,
    tiles,
    gangZones,
    objects,
    npcSpawns: portData.npcSpawns,
    blockposts: portData.blockposts,
    transitions: portData.transitions,
  };
}

function buildTiledMap({ MAP_WIDTH, MAP_HEIGHT, tiles, gangZones, objects, npcSpawns, blockposts, transitions }) {
  const tiledObjects = [];
  const idRef = { id: 1 };

  for (const obj of objects) {
    const base = {
      x: obj.x * TILE_SIZE,
      y: obj.y * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      rotation: 0,
      visible: true,
    };
    if (obj.type === 'payphone') pushObject(tiledObjects, idRef, base, { name: 'payphone', type: 'payphone' });
    else if (obj.type === 'flag')
      pushObject(tiledObjects, idRef, base, {
        name: 'flag',
        type: 'flag',
        properties: [{ name: 'gang', type: 'string', value: obj.gang }],
      });
    else if (obj.type === 'shop')
      pushObject(tiledObjects, idRef, base, {
        name: 'shop',
        type: 'shop',
        properties: [{ name: 'shopId', type: 'string', value: obj.shopId }],
      });
    else if (obj.type === 'stairs') pushObject(tiledObjects, idRef, base, { name: 'stairs', type: 'stairs' });
    else if (obj.type === 'landmark' || obj.type === 'tree')
      pushObject(tiledObjects, idRef, base, {
        name: obj.type,
        type: obj.type,
        properties: [{ name: 'kind', type: 'string', value: obj.kind ?? 'tree' }],
      });
    else if (obj.type === 'district_marker')
      pushObject(tiledObjects, idRef, base, {
        name: 'district_marker',
        type: 'district_marker',
        properties: [
          { name: 'districtId', type: 'string', value: obj.districtId ?? '' },
          { name: 'name', type: 'string', value: obj.name ?? '' },
        ],
      });
  }

  for (const spawn of npcSpawns) {
    pushObject(
      tiledObjects,
      idRef,
      { x: spawn.x * TILE_SIZE, y: spawn.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, visible: true },
      {
        name: 'npc_spawn',
        type: 'npc_spawn',
        properties: [
          { name: 'gang', type: 'string', value: spawn.gang ?? '' },
          { name: 'count', type: 'int', value: spawn.count },
        ],
      }
    );
  }

  for (const bp of blockposts) {
    pushObject(
      tiledObjects,
      idRef,
      { x: bp.tx * TILE_SIZE, y: bp.ty * TILE_SIZE, width: 48, height: 24, visible: true },
      {
        name: bp.id,
        type: 'blockpost',
        properties: [{ name: 'id', type: 'string', value: bp.id }],
      }
    );
  }

  for (const tr of transitions) {
    pushObject(
      tiledObjects,
      idRef,
      { x: tr.x * TILE_SIZE, y: tr.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, visible: true },
      {
        name: tr.id,
        type: 'transition',
        properties: [
          { name: 'id', type: 'string', value: tr.id },
          { name: 'targetMap', type: 'string', value: tr.targetMap },
          { name: 'targetX', type: 'int', value: tr.targetX },
          { name: 'targetY', type: 'int', value: tr.targetY },
          { name: 'label', type: 'string', value: tr.label ?? '' },
        ],
      }
    );
  }

  const groundData = [];
  const roofData = [];
  const zoneData = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const t = tiles[y][x];
      if (t === TileType.Roof) {
        groundData.push(tileToGid(TileType.Building));
        roofData.push(tileToGid(TileType.Roof));
      } else {
        groundData.push(tileToGid(t));
        roofData.push(0);
      }
      zoneData.push(gangToZoneGid(gangZones[y][x]));
    }
  }

  return {
    compressionlevel: -1,
    height: MAP_HEIGHT,
    width: MAP_WIDTH,
    infinite: false,
    layers: [
      { id: 1, name: 'ground', type: 'tilelayer', width: MAP_WIDTH, height: MAP_HEIGHT, opacity: 1, visible: true, x: 0, y: 0, data: groundData },
      { id: 2, name: 'roof', type: 'tilelayer', width: MAP_WIDTH, height: MAP_HEIGHT, opacity: 1, visible: true, x: 0, y: 0, data: roofData },
      { id: 3, name: 'zones', type: 'tilelayer', width: MAP_WIDTH, height: MAP_HEIGHT, opacity: 1, visible: false, x: 0, y: 0, data: zoneData },
      { id: 4, name: 'objects', type: 'objectgroup', opacity: 1, visible: true, x: 0, y: 0, draworder: 'topdown', objects: tiledObjects },
    ],
    nextlayerid: 5,
    nextobjectid: idRef.id,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: 32,
    tilewidth: 32,
    tilesets: [
      { columns: 9, firstgid: 1, margin: 0, name: 'city_tileset', spacing: 0, tilecount: 9, tileheight: 32, tilewidth: 32 },
    ],
    type: 'map',
    version: '1.10',
  };
}

mkdirSync(outDir, { recursive: true });

const city = buildTiledMap(generateCityMapData(root));
writeFileSync(join(outDir, 'city.tmj'), JSON.stringify(city, null, 2));
console.log(`Generated ${join(outDir, 'city.tmj')} (${city.width}x${city.height})`);

const port = buildTiledMap(generatePortMapData());
writeFileSync(join(outDir, 'port.tmj'), JSON.stringify(port, null, 2));
console.log(`Generated ${join(outDir, 'port.tmj')} (${port.width}x${port.height})`);