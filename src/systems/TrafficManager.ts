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

  constructor(
    private scene: Phaser.Scene,
    private cityMap: CityMap,
    private trafficLights?: TrafficLightManager,
    private laneNav?: LaneNavigation
  ) {}

  spawnInitial(): void {
    for (const spawn of VEHICLE_SPAWNS) {
      const tx = Math.floor(spawn.x / TILE_SIZE);
      const ty = Math.floor(spawn.y / TILE_SIZE);
      if (tx >= this.cityMap.mapWidth || ty >= this.cityMap.mapHeight) continue;
      const v = new Vehicle(this.scene, spawn.x, spawn.y, spawn.type, false);
      this.parkedVehicles.push(v);
    }

    for (let i = 0; i < 6; i++) {
      const roadTiles = this.findRoadTiles();
      if (roadTiles.length === 0) break;
      const tile = Phaser.Utils.Array.GetRandom(roadTiles);
      const pos = this.cityMap.tileToWorld(tile.tx, tile.ty);
      const types = ['sedan', 'sedan', 'truck', 'sports'];
      const type = Phaser.Utils.Array.GetRandom(types);
      const v = new Vehicle(this.scene, pos.x, pos.y, type, true);
      if (this.laneNav) {
        const nearest = this.laneNav.findNearestSegment(pos.x, pos.y);
        if (nearest) {
          v.initLaneDriving(nearest.segment, this.laneNav, pos.x, pos.y);
        } else {
          v.state.angle = Phaser.Math.Between(0, 3) * 90;
        }
      } else {
        v.state.angle = Phaser.Math.Between(0, 3) * 90;
      }
      this.vehicles.push(v);
    }
  }

  update(dt: number): void {
    const nav = this.cityMap.navigation;
    for (const v of this.vehicles) {
      if (v.active && !v.occupied) v.updateTraffic(dt, nav, this.trafficLights, this.laneNav);
    }
    this.vehicles = this.vehicles.filter((v) => v.active);
    this.parkedVehicles = this.parkedVehicles.filter((v) => v.active);
  }

  getAllVehicles(): Vehicle[] {
    return [...this.parkedVehicles, ...this.vehicles];
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