import { TILE_SIZE } from '../config';
import { getDistrictList } from '../world/DistrictGrid';
import type { QuestGiverConfig } from './QuestManager';

export interface GiverMapPosition {
  tx: number;
  ty: number;
  wx: number;
  wy: number;
}

export function getGiverMapPosition(giver: QuestGiverConfig): GiverMapPosition {
  const tx = giver.interior?.doorX ?? giver.x;
  const ty = giver.interior?.doorY ?? giver.y;
  return {
    tx,
    ty,
    wx: tx * TILE_SIZE + TILE_SIZE / 2,
    wy: ty * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function getDistrictNameAt(tx: number, ty: number): string {
  for (const district of getDistrictList()) {
    if (tx >= district.x && tx < district.x + district.w && ty >= district.y && ty < district.y + district.h) {
      return district.name;
    }
  }
  return 'Город';
}

export function getGiverLocationHint(giver: QuestGiverConfig): string {
  const { tx, ty } = getGiverMapPosition(giver);
  const district = getDistrictNameAt(tx, ty);
  if (giver.interior) {
    return `Офис ${giver.name} — ${district}`;
  }
  return `${giver.name} (${giver.title}) — ${district}`;
}

export function requiresInPersonAccept(giver: QuestGiverConfig | undefined): boolean {
  return Boolean(giver?.interior);
}