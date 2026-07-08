import { TILE_SIZE } from '../config';

export const PLAYER_SPAWN = { x: 100 * TILE_SIZE, y: 100 * TILE_SIZE };

export const VEHICLE_SPAWNS = [
  { x: 48 * TILE_SIZE, y: 48 * TILE_SIZE, type: 'sedan' },
  { x: 152 * TILE_SIZE, y: 48 * TILE_SIZE, type: 'sedan' },
  { x: 48 * TILE_SIZE, y: 100 * TILE_SIZE, type: 'truck' },
  { x: 100 * TILE_SIZE, y: 100 * TILE_SIZE, type: 'sports' },
  { x: 75 * TILE_SIZE, y: 50 * TILE_SIZE, type: 'sedan' },
  { x: 150 * TILE_SIZE, y: 100 * TILE_SIZE, type: 'sedan' },
];

export const NPC_SPAWNS = [
  { x: 33 * TILE_SIZE, y: 33 * TILE_SIZE, gang: 'yakuza' as const, count: 6 },
  { x: 168 * TILE_SIZE, y: 33 * TILE_SIZE, gang: 'rednecks' as const, count: 6 },
  { x: 33 * TILE_SIZE, y: 168 * TILE_SIZE, gang: 'scientists' as const, count: 6 },
  { x: 25 * TILE_SIZE, y: 25 * TILE_SIZE, gang: 'yakuza' as const, count: 2 },
  { x: 172 * TILE_SIZE, y: 25 * TILE_SIZE, gang: 'rednecks' as const, count: 2 },
  { x: 25 * TILE_SIZE, y: 172 * TILE_SIZE, gang: 'scientists' as const, count: 2 },
  { x: 100 * TILE_SIZE, y: 100 * TILE_SIZE, gang: null, count: 8 },
];