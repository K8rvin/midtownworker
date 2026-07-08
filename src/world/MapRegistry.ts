import { TILE_SIZE } from '../config';

export interface MapConfig {
  id: string;
  name: string;
  cacheKey: string;
  file: string;
  width: number;
  height: number;
  defaultSpawn: { tx: number; ty: number };
}

export const MAP_REGISTRY: Record<string, MapConfig> = {
  city: {
    id: 'city',
    name: 'Центр',
    cacheKey: 'city_map',
    file: './maps/city.tmj',
    width: 200,
    height: 200,
    defaultSpawn: { tx: 100, ty: 100 },
  },
  port: {
    id: 'port',
    name: 'Порт',
    cacheKey: 'port_map',
    file: './maps/port.tmj',
    width: 70,
    height: 70,
    defaultSpawn: { tx: 35, ty: 35 },
  },
};

export const DEFAULT_MAP_ID = 'city';

export function getMapConfig(mapId: string): MapConfig {
  return MAP_REGISTRY[mapId] ?? MAP_REGISTRY.city;
}

export function spawnToWorld(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}