import type { GangId } from '../config';

export interface NpcSpawnConfig {
  x: number;
  y: number;
  gang: GangId | null;
  count: number;
  role?: 'civilian' | 'gang' | 'police';
}

export interface BlockpostConfig {
  id: string;
  tx: number;
  ty: number;
}

export interface MapTransitionConfig {
  id: string;
  x: number;
  y: number;
  targetMap: string;
  targetX: number;
  targetY: number;
  label?: string;
}