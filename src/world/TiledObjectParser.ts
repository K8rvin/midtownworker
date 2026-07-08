import { TILE_SIZE, type GangId } from '../config';
import type { MapObject } from './CityMap';
import type { BlockpostConfig, MapTransitionConfig, NpcSpawnConfig } from './MapTypes';

export interface TiledMapObject {
  id?: number;
  name?: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: { name: string; type?: string; value: string | number | boolean }[];
}

export interface ParsedMapEntities {
  objects: MapObject[];
  npcSpawns: NpcSpawnConfig[];
  blockposts: BlockpostConfig[];
  transitions: MapTransitionConfig[];
}

export function parseTiledObjects(raw: TiledMapObject[]): ParsedMapEntities {
  const objects: MapObject[] = [];
  const npcSpawns: NpcSpawnConfig[] = [];
  const blockposts: BlockpostConfig[] = [];
  const transitions: MapTransitionConfig[] = [];

  for (const obj of raw) {
    const kind = (obj.type || obj.name || '').toLowerCase();
    if (!kind) continue;

    const tx = Math.floor(obj.x / TILE_SIZE);
    const ty = Math.floor(obj.y / TILE_SIZE);
    const props = Object.fromEntries((obj.properties ?? []).map((p) => [p.name, p.value]));

    if (kind === 'payphone') {
      objects.push({ type: 'payphone', x: tx, y: ty });
    } else if (kind === 'flag') {
      const gang = String(props.gang ?? '') as GangId;
      objects.push({ type: 'flag', x: tx, y: ty, data: { gang } });
    } else if (kind === 'shop') {
      objects.push({
        type: 'shop',
        x: tx,
        y: ty,
        data: { shopId: String(props.shopId ?? '') },
      });
    } else if (kind === 'stairs') {
      objects.push({ type: 'stairs', x: tx, y: ty });
    } else if (kind === 'landmark' || kind === 'tree') {
      objects.push({
        type: kind === 'tree' ? 'tree' : 'landmark',
        x: tx,
        y: ty,
        data: { kind: String(props.kind ?? (kind === 'tree' ? 'tree' : 'fountain')) },
      });
    } else if (kind === 'district_marker') {
      objects.push({
        type: 'district_marker',
        x: tx,
        y: ty,
        data: {
          districtId: String(props.districtId ?? ''),
          name: props.name ? String(props.name) : undefined,
        },
      });
    } else if (kind === 'npc_spawn' || kind === 'npc') {
      const gangRaw = props.gang;
      const gang =
        gangRaw === 'yakuza' || gangRaw === 'rednecks' || gangRaw === 'scientists'
          ? (gangRaw as GangId)
          : null;
      npcSpawns.push({
        x: tx,
        y: ty,
        gang,
        count: Number(props.count ?? 3),
      });
    } else if (kind === 'blockpost') {
      blockposts.push({
        id: String(props.id ?? obj.name ?? `bp_${tx}_${ty}`),
        tx,
        ty,
      });
    } else if (kind === 'transition' || kind === 'portal') {
      transitions.push({
        id: String(props.id ?? obj.name ?? `tr_${tx}_${ty}`),
        x: tx,
        y: ty,
        targetMap: String(props.targetMap ?? 'city'),
        targetX: Number(props.targetX ?? 40),
        targetY: Number(props.targetY ?? 40),
        label: props.label ? String(props.label) : undefined,
      });
    }
  }

  return { objects, npcSpawns, blockposts, transitions };
}

export function worldObjectsToTiled(
  objects: MapObject[],
  startId = 1
): { objects: TiledMapObject[]; nextId: number } {
  const tiled: TiledMapObject[] = [];
  let id = startId;

  for (const obj of objects) {
    const base = {
      id: id++,
      x: obj.x * TILE_SIZE,
      y: obj.y * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
    };

    if (obj.type === 'payphone') {
      tiled.push({ ...base, name: 'payphone', type: 'payphone' });
    } else if (obj.type === 'flag') {
      tiled.push({
        ...base,
        name: 'flag',
        type: 'flag',
        properties: [{ name: 'gang', type: 'string', value: String(obj.data?.gang ?? '') }],
      });
    } else if (obj.type === 'shop') {
      tiled.push({
        ...base,
        name: 'shop',
        type: 'shop',
        properties: [{ name: 'shopId', type: 'string', value: String(obj.data?.shopId ?? '') }],
      });
    } else if (obj.type === 'stairs') {
      tiled.push({ ...base, name: 'stairs', type: 'stairs' });
    } else if (obj.type === 'landmark' || obj.type === 'tree') {
      tiled.push({
        ...base,
        name: obj.type,
        type: obj.type,
        properties: [{ name: 'kind', type: 'string', value: String(obj.data?.kind ?? 'tree') }],
      });
    } else if (obj.type === 'district_marker') {
      tiled.push({
        ...base,
        name: 'district_marker',
        type: 'district_marker',
        properties: [
          { name: 'districtId', type: 'string', value: String(obj.data?.districtId ?? '') },
          { name: 'name', type: 'string', value: String(obj.data?.name ?? '') },
        ],
      });
    }
  }

  return { objects: tiled, nextId: id };
}