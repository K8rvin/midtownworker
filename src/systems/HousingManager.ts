import { TILE_SIZE } from '../config';
import type { GameState } from '../config';
import homesData from '../data/homes.json';
import furnitureData from '../data/furniture.json';

export interface FurnitureSlotConfig {
  id: string;
  x: number;
  y: number;
  accepts: string[];
}

export interface HomeConfig {
  id: string;
  name: string;
  mapId: string;
  doorX: number;
  doorY: number;
  rentPerWeek: number;
  buyPrice: number;
  interiorW: number;
  interiorH: number;
  furnitureSlots: FurnitureSlotConfig[];
}

const RENT_PERIOD_DAYS = 7;

export class HousingManager {
  public homes: HomeConfig[] = homesData as HomeConfig[];

  constructor(private state: GameState) {}

  getHomeById(id: string): HomeConfig | undefined {
    return this.homes.find((h) => h.id === id);
  }

  getHomesForMap(mapId: string): HomeConfig[] {
    return this.homes.filter((h) => h.mapId === mapId);
  }

  isAtHomeDoor(home: HomeConfig, px: number, py: number, maxDist = 28): boolean {
    const dx = home.doorX * TILE_SIZE + TILE_SIZE / 2;
    const dy = home.doorY * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(px - dx, py - dy) < maxDist;
  }

  getHomeAtDoor(px: number, py: number, mapId: string): HomeConfig | null {
    let best: HomeConfig | null = null;
    let bestDist = 28;
    for (const home of this.getHomesForMap(mapId)) {
      const dist = Math.hypot(
        px - (home.doorX * TILE_SIZE + TILE_SIZE / 2),
        py - (home.doorY * TILE_SIZE + TILE_SIZE / 2)
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = home;
      }
    }
    return best;
  }

  rentHome(home: HomeConfig): string | null {
    if (this.state.housing.type !== 'none' && this.state.housing.homeId !== home.id) {
      return 'Сначала съезьте с текущей квартиры';
    }
    if (this.state.money < home.rentPerWeek) {
      return `Нужно $${home.rentPerWeek} за первую неделю`;
    }
    this.state.money -= home.rentPerWeek;
    this.state.housing = {
      type: 'rent',
      homeId: home.id,
      rentDueDay: this.state.day + RENT_PERIOD_DAYS,
      lastRentPaidDay: this.state.day,
    };
    this.state.lifeStats.rentPaid += 1;
    return null;
  }

  payRent(): string | null {
    const home = this.getHomeById(this.state.housing.homeId ?? '');
    if (!home || this.state.housing.type !== 'rent') return 'Вы не снимаете жильё';
    if (this.state.money < home.rentPerWeek) return `Нужно $${home.rentPerWeek}`;
    this.state.money -= home.rentPerWeek;
    this.state.housing.lastRentPaidDay = this.state.day;
    this.state.housing.rentDueDay = this.state.day + RENT_PERIOD_DAYS;
    this.state.lifeStats.rentPaid += 1;
    return null;
  }

  buyHome(home: HomeConfig): string | null {
    if (this.state.money < home.buyPrice) return `Нужно $${home.buyPrice}`;
    this.state.money -= home.buyPrice;
    this.state.housing = {
      type: 'owned',
      homeId: home.id,
      rentDueDay: 0,
      lastRentPaidDay: this.state.day,
    };
    return null;
  }

  onDayAdvanced(): string | null {
    if (this.state.housing.type !== 'rent' || !this.state.housing.homeId) return null;
    if (this.state.day < this.state.housing.rentDueDay) return null;
    const home = this.getHomeById(this.state.housing.homeId);
    if (!home) return null;
    if (this.state.money >= home.rentPerWeek) {
      this.state.money -= home.rentPerWeek;
      this.state.housing.rentDueDay = this.state.day + RENT_PERIOD_DAYS;
      this.state.housing.lastRentPaidDay = this.state.day;
      this.state.lifeStats.rentPaid += 1;
      return `Списана аренда $${home.rentPerWeek}`;
    }
    this.state.housing = { type: 'none', homeId: null, rentDueDay: 0, lastRentPaidDay: 0 };
    this.state.furniturePlaced = {};
    return 'Не хватило денег на аренду — вас выселили';
  }

  placeFurniture(furnitureId: string, slotId: string): string | null {
    const home = this.getHomeById(this.state.housing.homeId ?? '');
    if (!home) return 'Нет жилья';
    if (!this.state.homeFurniture.includes(furnitureId)) return 'Сначала купите предмет';
    const slot = home.furnitureSlots.find((s) => s.id === slotId);
    if (!slot) return 'Нет такого места';
    if (!slot.accepts.includes(furnitureId)) return 'Сюда нельзя поставить этот предмет';
    this.state.furniturePlaced[slotId] = furnitureId;
    return null;
  }

  hasBed(): boolean {
    return Object.values(this.state.furniturePlaced).some((id) => id.startsWith('bed_'));
  }

  hasDesk(): boolean {
    return Object.values(this.state.furniturePlaced).some((id) => id.startsWith('desk_'));
  }

  getSleepBonus(): number {
    for (const fid of Object.values(this.state.furniturePlaced)) {
      if (!fid.startsWith('bed_')) continue;
      const bed = (furnitureData as { id: string; sleepBonus?: number }[]).find((f) => f.id === fid);
      if (bed?.sleepBonus) return bed.sleepBonus;
    }
    return 50;
  }

  getUnplacedForSlot(slotId: string): string[] {
    const home = this.getHomeById(this.state.housing.homeId ?? '');
    if (!home) return [];
    const slot = home.furnitureSlots.find((s) => s.id === slotId);
    if (!slot) return [];
    const placed = new Set(Object.values(this.state.furniturePlaced));
    return this.state.homeFurniture.filter((id) => !placed.has(id) && slot.accepts.includes(id));
  }

  getFurnitureName(furnitureId: string): string {
    const item = (furnitureData as { id: string; name: string }[]).find((f) => f.id === furnitureId);
    return item?.name ?? furnitureId;
  }
}