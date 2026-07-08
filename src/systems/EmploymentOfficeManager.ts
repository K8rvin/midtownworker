import { TILE_SIZE } from '../config';
import officesData from '../data/employment-office.json';

export interface EmploymentOfficeConfig {
  id: string;
  name: string;
  mapId: string;
  doorX: number;
  doorY: number;
  interiorX: number;
  interiorY: number;
  interiorW: number;
  interiorH: number;
  clerkX: number;
  clerkY: number;
}

export class EmploymentOfficeManager {
  public offices: EmploymentOfficeConfig[] = officesData as EmploymentOfficeConfig[];

  getOfficesForMap(mapId: string): EmploymentOfficeConfig[] {
    return this.offices.filter((o) => o.mapId === mapId);
  }

  getOfficeAtDoor(px: number, py: number, mapId: string, maxDist = 28): EmploymentOfficeConfig | null {
    let best: EmploymentOfficeConfig | null = null;
    let bestDist = maxDist;
    for (const office of this.getOfficesForMap(mapId)) {
      const dx = office.doorX * TILE_SIZE + TILE_SIZE / 2;
      const dy = office.doorY * TILE_SIZE + TILE_SIZE / 2;
      const dist = Math.hypot(px - dx, py - dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = office;
      }
    }
    return best;
  }

  isInside(office: EmploymentOfficeConfig, px: number, py: number): boolean {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);
    return (
      tx >= office.interiorX &&
      tx < office.interiorX + office.interiorW &&
      ty >= office.interiorY &&
      ty < office.interiorY + office.interiorH
    );
  }

  getOfficeAtInterior(px: number, py: number, mapId: string): EmploymentOfficeConfig | null {
    for (const office of this.getOfficesForMap(mapId)) {
      if (this.isInside(office, px, py)) return office;
    }
    return null;
  }

  isNearClerk(office: EmploymentOfficeConfig, px: number, py: number, maxDist = 40): boolean {
    const cx = office.clerkX * TILE_SIZE + TILE_SIZE / 2;
    const cy = office.clerkY * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(px - cx, py - cy) < maxDist;
  }

  getInteriorCenter(office: EmploymentOfficeConfig): { x: number; y: number } {
    return {
      x: (office.interiorX + office.interiorW / 2) * TILE_SIZE + TILE_SIZE / 2,
      y: (office.interiorY + office.interiorH / 2) * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  getExitPosition(office: EmploymentOfficeConfig): { x: number; y: number } {
    return {
      x: office.doorX * TILE_SIZE + TILE_SIZE / 2,
      y: (office.doorY + 1) * TILE_SIZE + TILE_SIZE / 2,
    };
  }
}