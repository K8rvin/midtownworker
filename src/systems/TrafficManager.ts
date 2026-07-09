import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { Vehicle } from '../entities/Vehicle';
import { VEHICLE_SPAWNS } from '../world/SpawnPoints';
import type { CityMap } from '../world/CityMap';
import type { TrafficLightManager } from './TrafficLightManager';
import type { LaneNavigation } from '../world/LaneNavigation';

export class TrafficManager {
  public vehicles: Vehicle[] = [];
  public parkedVehicles: Vehicle[] = [];
  private targetMovingCount = 6;

  constructor(
    private scene: Phaser.Scene,
    private cityMap: CityMap,
    private trafficLights?: TrafficLightManager,
    private laneNav?: LaneNavigation
  ) {}

  spawnInitial(movingCount = 6, nearX?: number, nearY?: number): void {
    for (const spawn of VEHICLE_SPAWNS) {
      const tx = Math.floor(spawn.x / TILE_SIZE);
      const ty = Math.floor(spawn.y / TILE_SIZE);
      if (tx >= this.cityMap.mapWidth || ty >= this.cityMap.mapHeight) continue;
      const v = new Vehicle(this.scene, spawn.x, spawn.y, spawn.type, false);
      this.parkedVehicles.push(v);
    }
    this.syncMovingCount(movingCount, nearX, nearY);
  }

  syncMovingCount(count: number, nearX?: number, nearY?: number): void {
    this.targetMovingCount = count;
    while (this.vehicles.length < count) {
      if (!this.spawnMovingVehicle(nearX, nearY)) break;
    }
    while (this.vehicles.length > count) {
      this.despawnFarthestMoving(nearX, nearY);
    }
  }

  /** Drop vehicles far from the player and spawn replacements nearby. */
  refreshNearPlayer(nearX: number, nearY: number): void {
    const farPx = 70 * TILE_SIZE;
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if (Phaser.Math.Distance.Between(nearX, nearY, v.sprite.x, v.sprite.y) > farPx) {
        v.destroyExtras();
        v.sprite.destroy();
        this.vehicles.splice(i, 1);
      }
    }
    while (this.vehicles.length < this.targetMovingCount) {
      if (!this.spawnMovingVehicle(nearX, nearY)) break;
    }
  }

  update(dt: number, extraBlockers: Vehicle[] = []): void {
    const nav = this.cityMap.navigation;
    const moving = this.vehicles;
    // Include parked + any player/chase cars so traffic queues behind them too
    const blockers = [
      ...moving,
      ...this.parkedVehicles.filter((v) => v.active && !v.occupied),
      ...extraBlockers.filter((v) => v.active),
    ];
    for (const v of moving) {
      if (v.active && !v.occupied) {
        v.updateTraffic(dt, nav, this.trafficLights, this.laneNav, blockers);
      }
    }
    // Soft separation so cars never stack on the same pixel
    for (let i = 0; i < moving.length; i++) {
      const a = moving[i];
      if (!a.active || a.occupied) continue;
      for (let j = i + 1; j < moving.length; j++) {
        const b = moving[j];
        if (!b.active || b.occupied) continue;
        a.separateFrom(b, 38);
        b.separateFrom(a, 38);
      }
    }
    this.vehicles = this.vehicles.filter((v) => v.active);
    this.parkedVehicles = this.parkedVehicles.filter((v) => v.active);
  }

  getAllVehicles(): Vehicle[] {
    return [...this.parkedVehicles, ...this.vehicles];
  }

  private spawnMovingVehicle(nearX?: number, nearY?: number): boolean {
    const roadTiles =
      this.findRoadTilesNear(nearX, nearY, 30) ??
      this.findRoadTilesNear(nearX, nearY, 55) ??
      this.findRoadTiles();
    if (roadTiles.length === 0) return false;

    const minSpacing = 70;
    // Try several tiles so we don't spawn on top of another car
    for (let attempt = 0; attempt < 12; attempt++) {
      const tile = Phaser.Utils.Array.GetRandom(roadTiles);
      const pos = this.cityMap.tileToWorld(tile.tx, tile.ty);
      let blocked = false;
      for (const other of this.vehicles) {
        if (!other.active) continue;
        if (Phaser.Math.Distance.Between(pos.x, pos.y, other.sprite.x, other.sprite.y) < minSpacing) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const types = [
        'sedan',
        'sedan',
        'sedan',
        'truck',
        'van',
        'sports',
        'moped',
        'motorcycle',
        'bicycle',
      ];
      const type = Phaser.Utils.Array.GetRandom(types);
      const v = new Vehicle(this.scene, pos.x, pos.y, type, true);
      if (this.laneNav) {
        const nearest = this.laneNav.findNearestSegment(pos.x, pos.y);
        if (nearest) {
          v.initLaneDriving(nearest.segment, this.laneNav, pos.x, pos.y);
        } else {
          v.state.angle = Phaser.Math.Between(0, 3) * 90;
          v.state.speed = v.config.maxSpeed * 0.35;
        }
      } else {
        v.state.angle = Phaser.Math.Between(0, 3) * 90;
      }
      this.vehicles.push(v);
      return true;
    }
    return false;
  }

  private despawnFarthestMoving(nearX?: number, nearY?: number): void {
    if (this.vehicles.length === 0) return;
    let idx = 0;
    let maxDist = -1;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const dist =
        nearX !== undefined && nearY !== undefined
          ? Phaser.Math.Distance.Between(nearX, nearY, v.sprite.x, v.sprite.y)
          : 0;
      if (dist > maxDist) {
        maxDist = dist;
        idx = i;
      }
    }
    this.vehicles[idx].destroyExtras();
    this.vehicles[idx].sprite.destroy();
    this.vehicles.splice(idx, 1);
  }

  private findRoadTilesNear(cx?: number, cy?: number, radiusTiles = 30): { tx: number; ty: number }[] | null {
    if (cx === undefined || cy === undefined) return null;
    const centerTx = Math.floor(cx / TILE_SIZE);
    const centerTy = Math.floor(cy / TILE_SIZE);
    const tiles: { tx: number; ty: number }[] = [];
    const r = radiusTiles;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const tx = centerTx + dx;
        const ty = centerTy + dy;
        if (tx < 0 || ty < 0 || tx >= this.cityMap.mapWidth || ty >= this.cityMap.mapHeight) continue;
        if (this.cityMap.isRoad(tx, ty)) tiles.push({ tx, ty });
      }
    }
    return tiles.length > 0 ? tiles : null;
  }

  private findRoadTiles(): { tx: number; ty: number }[] {
    const tiles: { tx: number; ty: number }[] = [];
    for (let y = 0; y < this.cityMap.mapHeight; y++) {
      for (let x = 0; x < this.cityMap.mapWidth; x++) {
        if (this.cityMap.isRoad(x, y)) tiles.push({ tx: x, ty: y });
      }
    }
    return tiles;
  }
}