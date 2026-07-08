import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import type { GameState } from '../config';
import { Vehicle } from '../entities/Vehicle';

/** Автосалон: tile (42, 38) */
const GARAGE_ORIGIN = { x: 42 * TILE_SIZE, y: 38 * TILE_SIZE };

export class GarageManager {
  public parkedVehicles: Vehicle[] = [];

  constructor(
    private scene: Phaser.Scene,
    private state: GameState
  ) {}

  refresh(): void {
    for (const v of this.parkedVehicles) {
      v.sprite.destroy();
    }
    this.parkedVehicles = [];

    this.state.ownedVehicles.forEach((type, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = GARAGE_ORIGIN.x + 40 + col * 36;
      const y = GARAGE_ORIGIN.y + 50 + row * 28;
      const vehicle = new Vehicle(this.scene, x, y, type);
      vehicle.isTraffic = false;
      this.parkedVehicles.push(vehicle);
    });
  }

  findNearbyVehicle(px: number, py: number, maxDist = 45): Vehicle | null {
    let nearest: Vehicle | null = null;
    let min = maxDist;
    for (const v of this.parkedVehicles) {
      if (!v.active || v.occupied) continue;
      const d = Phaser.Math.Distance.Between(px, py, v.sprite.x, v.sprite.y);
      if (d < min) {
        min = d;
        nearest = v;
      }
    }
    return nearest;
  }

  destroy(): void {
    for (const v of this.parkedVehicles) v.sprite.destroy();
    this.parkedVehicles = [];
  }
}