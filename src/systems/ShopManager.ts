import Phaser from 'phaser';
import type { GameState, GangId } from '../config';
import { GANG_IDS, TILE_SIZE } from '../config';
import shopsData from '../data/shops.json';
import weaponsData from '../data/weapons.json';
import vehiclesData from '../data/vehicles.json';
import ammoData from '../data/ammo.json';

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
    default:
      return 0xff2d55;
  }
}

export class ShopManager {
  public shops: ShopConfig[] = shopsData as ShopConfig[];

  constructor(private state: GameState) {}

  getShopById(id: string): ShopConfig | undefined {
    return this.shops.find((s) => s.id === id);
  }

  getShopAtDoor(px: number, py: number, maxDist = 40): ShopConfig | null {
    let nearest: ShopConfig | null = null;
    let minDist = maxDist;
    for (const shop of this.shops) {
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

  isAtDoor(shop: ShopConfig, px: number, py: number, maxDist = 40): boolean {
    const dx = shop.doorX * TILE_SIZE + TILE_SIZE / 2;
    const dy = shop.doorY * TILE_SIZE + TILE_SIZE / 2;
    return Phaser.Math.Distance.Between(px, py, dx, dy) < maxDist;
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
    const shop = this.shops.find((s) => s.type === 'hospital');
    const price = shop?.healPrice ?? 200;
    if (this.state.money < price) return 'Недостаточно денег';
    if (this.state.health >= this.state.maxHealth) return 'Здоровье полное';
    this.state.money -= price;
    this.state.health = this.state.maxHealth;
    return null;
  }
}