import type { GameState } from '../config';
import weaponsData from '../data/weapons.json';

export const WEAPON_SLOTS = ['fists', 'pistol', 'shotgun', 'uzi', 'sniper'] as const;

interface WeaponConfig {
  id: string;
  ammoType: string | null;
  scoped?: boolean;
}

export function isScopedWeapon(weaponId: string): boolean {
  const w = weapons.find((x) => x.id === weaponId);
  return w?.scoped === true;
}

const weapons = weaponsData as WeaponConfig[];

export class WeaponManager {
  constructor(private state: GameState) {}

  switchSlot(slot: number): boolean {
    const idx = slot - 1;
    if (idx < 0 || idx >= WEAPON_SLOTS.length) return false;
    const weaponId = WEAPON_SLOTS[idx];
    if (!this.state.ownedWeapons.includes(weaponId)) return false;
    if (this.state.currentWeapon === weaponId) return false;
    this.state.currentWeapon = weaponId;
    return true;
  }

  getAmmoText(weaponId: string): string {
    const weapon = weapons.find((w) => w.id === weaponId);
    if (!weapon?.ammoType) return '';
    const ammo = this.state.ammo[weapon.ammoType] ?? 0;
    return ` (${ammo})`;
  }
}