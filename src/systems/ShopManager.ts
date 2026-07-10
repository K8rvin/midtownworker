import Phaser from 'phaser';
import type { GameState, GangId } from '../config';
import { GANG_IDS, TILE_SIZE } from '../config';
import shopsData from '../data/shops.json';
import weaponsData from '../data/weapons.json';
import vehiclesData from '../data/vehicles.json';
import ammoData from '../data/ammo.json';
import furnitureData from '../data/furniture.json';

export interface ShopClerkConfig {
  name: string;
  x: number;
  y: number;
}

export interface ShopConfig {
  id: string;
  type: string;
  name: string;
  killerOnly?: boolean;
  x: number;
  y: number;
  doorX: number;
  doorY: number;
  interiorX: number;
  interiorY: number;
  interiorW: number;
  interiorH: number;
  clerk?: ShopClerkConfig;
  items?: string[];
  healPrice?: number;
}

interface WeaponConfig {
  id: string;
  name: string;
  price: number;
  ammoType: string | null;
  magSize?: number;
}

interface VehicleConfig {
  id: string;
  name: string;
  price: number;
}

export function shopMarkerColor(type: string): number {
  switch (type) {
    case 'grocery':
      return 0x7ee787;
    case 'furniture':
      return 0xb8860b;
    case 'weapon':
      return 0xff6b35;
    case 'vehicle':
      return 0xffd600;
    case 'bank':
      return 0xffd700;
    case 'pharmacy':
      return 0x4ade80;
    case 'cafe':
      return 0xfbbf24;
    case 'pawn':
      return 0xa78bfa;
    case 'laundry':
      return 0x38bdf8;
    case 'hotel':
      return 0xf472b6;
    case 'post':
      return 0x94a3b8;
    case 'gym':
      return 0xfb923c;
    case 'gas':
      return 0x22d3ee;
    case 'garage':
      return 0x64748b;
    case 'insurance':
      return 0x818cf8;
    case 'casino':
      return 0xef4444;
    default:
      return 0xff2d55;
  }
}

/** Pharmacy / cafe catalog (ids referenced from shops.json items). */
export const PHARMACY_ITEMS: { id: string; name: string; price: number; heal?: number; sleep?: number }[] = [
  { id: 'bandage', name: 'Бинт', price: 25, heal: 20 },
  { id: 'medkit', name: 'Аптечка', price: 55, heal: 45 },
  { id: 'vitamins', name: 'Витамины', price: 35, sleep: 18 },
  { id: 'full_heal', name: 'Полное лечение', price: 75, heal: 999 },
];

export const CAFE_ITEMS: { id: string; name: string; price: number; hunger: number }[] = [
  { id: 'coffee_cup', name: 'Кофе', price: 18, hunger: 12 },
  { id: 'soup_bowl', name: 'Суп дня', price: 32, hunger: 28 },
  { id: 'business_lunch', name: 'Бизнес-ланч', price: 55, hunger: 50 },
  { id: 'cake', name: 'Пирожное', price: 22, hunger: 18 },
];

const PAWN_FURNITURE_RATE = 0.4;
const PAWN_VEHICLE_RATE = 0.35;

export class ShopManager {
  public shops: ShopConfig[] = shopsData as ShopConfig[];

  constructor(private state: GameState) {}

  getShopById(id: string): ShopConfig | undefined {
    return this.shops.find((s) => s.id === id);
  }

  isNearShopDoor(shop: ShopConfig, px: number, py: number, maxDist = 52): boolean {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    if (Math.abs(tx - shop.doorX) <= 1 && Math.abs(ty - shop.doorY) <= 1) return true;
    const dx = shop.doorX * TILE_SIZE + TILE_SIZE / 2;
    const dy = shop.doorY * TILE_SIZE + TILE_SIZE / 2;
    return Phaser.Math.Distance.Between(px, py, dx, dy) < maxDist;
  }

  getShopAtDoor(px: number, py: number, maxDist = 52): ShopConfig | null {
    let nearest: ShopConfig | null = null;
    let minDist = maxDist;
    for (const shop of this.shops) {
      if (!this.isNearShopDoor(shop, px, py, maxDist)) continue;
      const dx = shop.doorX * TILE_SIZE + TILE_SIZE / 2;
      const dy = shop.doorY * TILE_SIZE + TILE_SIZE / 2;
      const dist = Phaser.Math.Distance.Between(px, py, dx, dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = shop;
      }
    }
    return nearest;
  }

  isInsideShop(shop: ShopConfig, px: number, py: number): boolean {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    return (
      tx >= shop.interiorX &&
      tx < shop.interiorX + shop.interiorW &&
      ty >= shop.interiorY &&
      ty < shop.interiorY + shop.interiorH
    );
  }

  getShopAtInterior(px: number, py: number): ShopConfig | null {
    for (const shop of this.shops) {
      if (this.isInsideShop(shop, px, py)) return shop;
    }
    return null;
  }

  getShopNearClerk(px: number, py: number, maxDist = 40): ShopConfig | null {
    let nearest: ShopConfig | null = null;
    let minDist = maxDist;
    for (const shop of this.shops) {
      if (!shop.clerk) continue;
      const cx = shop.clerk.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = shop.clerk.y * TILE_SIZE + TILE_SIZE / 2;
      const dist = Phaser.Math.Distance.Between(px, py, cx, cy);
      if (dist < minDist) {
        minDist = dist;
        nearest = shop;
      }
    }
    return nearest;
  }

  isAtDoor(shop: ShopConfig, px: number, py: number, maxDist = 52): boolean {
    return this.isNearShopDoor(shop, px, py, maxDist);
  }

  getInteriorCenter(shop: ShopConfig): { x: number; y: number } {
    return {
      x: (shop.interiorX + shop.interiorW / 2) * TILE_SIZE + TILE_SIZE / 2,
      y: (shop.interiorY + shop.interiorH / 2) * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  getExitPosition(shop: ShopConfig): { x: number; y: number } {
    return {
      x: shop.doorX * TILE_SIZE + TILE_SIZE / 2,
      y: (shop.doorY + 1) * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  getAllyDiscount(): number {
    for (const gang of GANG_IDS) {
      if (this.state.respect[gang] > 35) return 0.85;
    }
    return 1;
  }

  getAllyGang(): GangId | null {
    let best: GangId | null = null;
    let bestRespect = 35;
    for (const gang of GANG_IDS) {
      if (this.state.respect[gang] > bestRespect) {
        bestRespect = this.state.respect[gang];
        best = gang;
      }
    }
    return best;
  }

  private applyDiscount(price: number): number {
    return Math.floor(price * this.getAllyDiscount());
  }

  buyWeapon(weaponId: string): string | null {
    const weapon = (weaponsData as WeaponConfig[]).find((w) => w.id === weaponId);
    if (!weapon) return 'Нет оружия';
    const price = this.applyDiscount(weapon.price);
    if (this.state.money < price) return 'Недостаточно денег';
    if (this.state.ownedWeapons.includes(weaponId)) return 'Уже куплено';

    this.state.money -= price;
    this.state.ownedWeapons.push(weaponId);
    this.state.currentWeapon = weaponId;
    if (weapon.ammoType && weapon.magSize) {
      const bonus = this.getAllyDiscount() < 1 ? 1 : 0;
      this.state.ammo[weapon.ammoType] =
        (this.state.ammo[weapon.ammoType] ?? 0) + weapon.magSize * (3 + bonus);
    }
    return null;
  }

  buyVehicle(vehicleId: string): string | null {
    const vehicle = (vehiclesData as VehicleConfig[]).find((v) => v.id === vehicleId);
    if (!vehicle) return 'Нет машины';
    const price = this.applyDiscount(vehicle.price);
    if (this.state.money < price) return 'Недостаточно денег';
    if (this.state.ownedVehicles.includes(vehicleId)) return 'Уже в гараже';
    this.state.money -= price;
    this.state.ownedVehicles.push(vehicleId);
    return null;
  }

  buyAmmo(ammoType: string): string | null {
    const pack = (ammoData as { ammoType: string; amount: number; price: number }[]).find(
      (p) => p.ammoType === ammoType
    );
    if (!pack) return 'Нет таких патронов';
    const ownsWeapon = (weaponsData as WeaponConfig[]).some(
      (w) => w.ammoType === ammoType && this.state.ownedWeapons.includes(w.id)
    );
    if (!ownsWeapon) return 'Сначала купите оружие';
    const price = this.applyDiscount(pack.price);
    if (this.state.money < price) return 'Недостаточно денег';
    this.state.money -= price;
    this.state.ammo[ammoType] = (this.state.ammo[ammoType] ?? 0) + pack.amount;
    return null;
  }

  getAmmoPacksForOwnedWeapons(): { ammoType: string; label: string; price: number }[] {
    const ownedAmmoTypes = new Set(
      (weaponsData as WeaponConfig[])
        .filter((w) => w.ammoType && this.state.ownedWeapons.includes(w.id))
        .map((w) => w.ammoType!)
    );
    return (ammoData as { ammoType: string; label: string; price: number }[]).filter((p) =>
      ownedAmmoTypes.has(p.ammoType)
    );
  }

  heal(): string | null {
    const shop = this.shops.find((s) => s.type === 'hospital' || s.type === 'pharmacy');
    const price = shop?.healPrice ?? 200;
    if (this.state.money < price) return 'Недостаточно денег';
    if (this.state.health >= this.state.maxHealth) return 'Здоровье полное';
    this.state.money -= price;
    this.state.health = this.state.maxHealth;
    return null;
  }

  /** Pharmacy catalog purchase. */
  buyPharmacy(itemId: string, shopHealPrice?: number): string | null {
    if (itemId === 'full_heal') {
      const price = shopHealPrice ?? 75;
      if (this.state.money < price) return 'Недостаточно денег';
      if (this.state.health >= this.state.maxHealth) return 'Здоровье полное';
      this.state.money -= price;
      this.state.health = this.state.maxHealth;
      return null;
    }
    const item = PHARMACY_ITEMS.find((i) => i.id === itemId);
    if (!item) return 'Нет товара';
    if (this.state.money < item.price) return 'Недостаточно денег';
    this.state.money -= item.price;
    if (item.heal) {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + item.heal);
    }
    if (item.sleep) {
      this.state.sleep = Math.min(100, this.state.sleep + item.sleep);
    }
    return null;
  }

  /** Cafe: eat on the spot (no fridge). */
  buyCafe(itemId: string): string | null {
    const item = CAFE_ITEMS.find((i) => i.id === itemId);
    if (!item) return 'Нет в меню';
    if (this.state.money < item.price) return 'Недостаточно денег';
    this.state.money -= item.price;
    this.state.hunger = Math.min(100, this.state.hunger + item.hunger);
    this.state.lifeStats.foodBought += 1;
    return null;
  }

  /** Pawn: sell unplaced furniture (40% of shop price). */
  pawnSellFurniture(furnitureId: string): string | null {
    const item = (furnitureData as { id: string; name: string; price: number }[]).find(
      (f) => f.id === furnitureId
    );
    if (!item) return 'Нет такого предмета';
    const idx = this.state.homeFurniture.indexOf(furnitureId);
    if (idx < 0) return 'Нет в запасе (нужна нерасставленная мебель)';
    // Don't sell if currently placed
    if (Object.values(this.state.furniturePlaced).includes(furnitureId)) {
      return 'Сначала уберите с слота дома';
    }
    this.state.homeFurniture.splice(idx, 1);
    const pay = Math.max(5, Math.floor(item.price * PAWN_FURNITURE_RATE));
    this.state.money += pay;
    return null;
  }

  pawnFurnitureOffer(furnitureId: string): number {
    const item = (furnitureData as { id: string; price: number }[]).find((f) => f.id === furnitureId);
    if (!item) return 0;
    return Math.max(5, Math.floor(item.price * PAWN_FURNITURE_RATE));
  }

  /** Pawn: sell owned vehicle (35%). */
  pawnSellVehicle(vehicleId: string): string | null {
    const item = (vehiclesData as VehicleConfig[]).find((v) => v.id === vehicleId);
    if (!item) return 'Нет такой машины';
    if (item.price <= 0) return 'Служебный транспорт не принимают';
    const idx = this.state.ownedVehicles.indexOf(vehicleId);
    if (idx < 0) return 'Нет в гараже';
    this.state.ownedVehicles.splice(idx, 1);
    const pay = Math.max(10, Math.floor(item.price * PAWN_VEHICLE_RATE));
    this.state.money += pay;
    return null;
  }

  pawnVehicleOffer(vehicleId: string): number {
    const item = (vehiclesData as VehicleConfig[]).find((v) => v.id === vehicleId);
    if (!item || item.price <= 0) return 0;
    return Math.max(10, Math.floor(item.price * PAWN_VEHICLE_RATE));
  }

  listPawnableFurniture(): { id: string; name: string; offer: number }[] {
    const out: { id: string; name: string; offer: number }[] = [];
    const placed = new Set(Object.values(this.state.furniturePlaced));
    for (const fid of this.state.homeFurniture) {
      if (placed.has(fid)) continue;
      const item = (furnitureData as { id: string; name: string; price: number }[]).find((f) => f.id === fid);
      if (!item) continue;
      out.push({ id: fid, name: item.name, offer: this.pawnFurnitureOffer(fid) });
    }
    return out;
  }

  listPawnableVehicles(): { id: string; name: string; offer: number }[] {
    const out: { id: string; name: string; offer: number }[] = [];
    for (const vid of this.state.ownedVehicles) {
      const item = (vehiclesData as VehicleConfig[]).find((v) => v.id === vid);
      if (!item || item.price <= 0) continue;
      out.push({ id: vid, name: item.name, offer: this.pawnVehicleOffer(vid) });
    }
    return out;
  }

  /** Laundry: wash work car cheaper than taxi depot. */
  laundryWashCar(): string | null {
    const cost = 12;
    if (this.state.money < cost) return `Нужно $${cost}`;
    this.state.money -= cost;
    this.state.taxiCarCleanliness = 100;
    return null;
  }

  laundryWashClothes(): string | null {
    const cost = 18;
    if (this.state.money < cost) return `Нужно $${cost}`;
    this.state.money -= cost;
    this.state.sleep = Math.min(100, this.state.sleep + 8);
    this.state.drunkLevel = Math.max(0, this.state.drunkLevel - 12);
    return null;
  }

  /** Hotel: pay for rest (advances hour, restores sleep). */
  hotelRest(tier: 'cheap' | 'normal'): string | null {
    const cost = tier === 'cheap' ? 35 : 65;
    const sleepGain = tier === 'cheap' ? 35 : 60;
    const hours = tier === 'cheap' ? 3 : 5;
    if (this.state.money < cost) return `Нужно $${cost}`;
    this.state.money -= cost;
    this.state.sleep = Math.min(100, this.state.sleep + sleepGain);
    this.state.hunger = Math.max(5, this.state.hunger - 8);
    this.state.health = Math.min(this.state.maxHealth, this.state.health + (tier === 'normal' ? 10 : 0));
    this.state.hour = (this.state.hour + hours) % 24;
    if (this.state.hour < hours) this.state.day += 1;
    return null;
  }

  /** Post office services. */
  postBuyStamps(): string | null {
    const cost = 8;
    if (this.state.money < cost) return `Нужно $${cost}`;
    this.state.money -= cost;
    return null;
  }

  postPayBills(): string | null {
    const owed = this.state.billsOwed ?? 0;
    if (owed > 0) {
      if (this.state.money < owed) return `ЖКХ: нужно $${owed}`;
      this.state.money -= owed;
      this.state.billsOwed = 0;
      return null;
    }
    // No debt: optional prepay (rent buffer + push next bills)
    const cost = 40;
    if (this.state.money < cost) return `Нужно $${cost}`;
    this.state.money -= cost;
    if (this.state.housing.type === 'rent' && this.state.housing.rentDueDay > 0) {
      this.state.housing.rentDueDay += 1;
    }
    this.state.billsDueDay = Math.max(this.state.billsDueDay ?? this.state.day, this.state.day) + 3;
    return null;
  }

  postSendParcel(): string | null {
    const cost = 22;
    if (this.state.money < cost) return `Нужно $${cost}`;
    this.state.money -= cost;
    return null;
  }

  /** Gym: train / sauna. */
  gymWorkout(): string | null {
    const cost = 28;
    if (this.state.money < cost) return `Нужно $${cost}`;
    if (this.state.hunger < 20) return 'Слишком голодны для тренировки';
    if (this.state.sleep < 15) return 'Слишком устали для тренировки';
    this.state.money -= cost;
    this.state.hunger = Math.max(5, this.state.hunger - 12);
    this.state.sleep = Math.max(5, this.state.sleep - 8);
    this.state.health = Math.min(this.state.maxHealth, this.state.health + 12);
    this.state.drunkLevel = Math.max(0, this.state.drunkLevel - 15);
    return null;
  }

  gymSauna(): string | null {
    const cost = 20;
    if (this.state.money < cost) return `Нужно $${cost}`;
    this.state.money -= cost;
    this.state.sleep = Math.min(100, this.state.sleep + 22);
    this.state.drunkLevel = Math.max(0, this.state.drunkLevel - 20);
    return null;
  }

  /** Gas station snack (no vehicle required). */
  gasSnack(): string | null {
    const cost = 16;
    if (this.state.money < cost) return `Нужно $${cost}`;
    this.state.money -= cost;
    this.state.hunger = Math.min(100, this.state.hunger + 20);
    this.state.lifeStats.foodBought += 1;
    return null;
  }

  /** Insurance: soft-crime fine discount until day. */
  buyInsurance(tier: 'week' | 'month'): string | null {
    const cost = tier === 'week' ? 120 : 320;
    const days = tier === 'week' ? 7 : 30;
    if (this.state.money < cost) return `Нужно $${cost}`;
    this.state.money -= cost;
    const start = Math.max(this.state.day, this.state.insuranceUntilDay || 0);
    this.state.insuranceUntilDay = start + days;
    return null;
  }

  insuranceStatus(): string {
    if (!this.state.insuranceUntilDay || this.state.day > this.state.insuranceUntilDay) {
      return 'Нет полиса';
    }
    return `Полис до дня ${this.state.insuranceUntilDay}`;
  }

  /** Soft daily casino wager cap (keeps economy stable). */
  static readonly CASINO_DAY_LIMIT = 500;

  /**
   * Casino: even-money coin flip, slight house edge (~45% win).
   * Daily wager limit CASINO_DAY_LIMIT.
   */
  casinoBet(amount: number): { err: string | null; won?: boolean; payout?: number } {
    if (amount < 10) return { err: 'Мин. ставка $10' };
    if (this.state.money < amount) return { err: 'Недостаточно денег' };
    if (this.state.casinoDay !== this.state.day) {
      this.state.casinoDay = this.state.day;
      this.state.casinoDayBet = 0;
    }
    if (this.state.casinoDayBet + amount > ShopManager.CASINO_DAY_LIMIT) {
      const left = Math.max(0, ShopManager.CASINO_DAY_LIMIT - this.state.casinoDayBet);
      return { err: left <= 0 ? 'Лимит казино на сегодня ($500)' : `Лимит дня: осталось $${left}` };
    }
    this.state.money -= amount;
    this.state.casinoDayBet += amount;
    const win = Math.random() < 0.45;
    if (win) {
      const payout = amount * 2;
      this.state.money += payout;
      return { err: null, won: true, payout };
    }
    return { err: null, won: false, payout: 0 };
  }
}