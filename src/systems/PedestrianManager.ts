import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import cityLayout from '../data/city-layout.json';
import { Pedestrian } from '../entities/Pedestrian';
import type { CityMap } from '../world/CityMap';
import type { NavigationGrid } from '../world/NavigationGrid';
import type { TileCoord } from '../world/NavigationGrid';

export class PedestrianManager {
  public pedestrians: Pedestrian[] = [];
  private targetCount = 32;
  private readonly baseSpeed: number;

  constructor(
    private scene: Phaser.Scene,
    private cityMap: CityMap
  ) {
    const cfg = (cityLayout as { pedestrians?: { speed?: number } }).pedestrians;
    this.baseSpeed = cfg?.speed ?? 42;
  }

  spawn(count?: number, nearX?: number, nearY?: number): void {
    if (this.cityMap.mapId !== 'city') return;
    const cfg = (cityLayout as { pedestrians?: { count?: number } }).pedestrians;
    this.syncToTarget(count ?? cfg?.count ?? 32, nearX, nearY);
  }

  syncToTarget(count: number, nearX?: number, nearY?: number): void {
    if (this.cityMap.mapId !== 'city') return;
    this.targetCount = count;
    while (this.pedestrians.length < count) {
      if (!this.spawnOne(nearX, nearY)) break;
    }
    while (this.pedestrians.length > count) {
      this.despawnFarthest(nearX, nearY);
    }
  }

  refreshNearPlayer(nearX: number, nearY: number): void {
    if (this.cityMap.mapId !== 'city') return;
    const farPx = 55 * TILE_SIZE;
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const ped = this.pedestrians[i];
      if (Phaser.Math.Distance.Between(nearX, nearY, ped.sprite.x, ped.sprite.y) > farPx) {
        ped.destroy();
        this.pedestrians.splice(i, 1);
      }
    }
    while (this.pedestrians.length < this.targetCount) {
      if (!this.spawnOne(nearX, nearY)) break;
    }
  }

  update(dt: number, speedMul = 1, vehicles: { sprite: Phaser.Physics.Arcade.Sprite }[] = []): void {
    const nav = this.cityMap.navigation;
    const step = dt * speedMul;
    for (const ped of this.pedestrians) {
      if (ped.active) ped.update(step, nav, vehicles);
    }
    this.pedestrians = this.pedestrians.filter((p) => p.active);
  }

  destroy(): void {
    for (const ped of this.pedestrians) ped.destroy();
    this.pedestrians = [];
  }

  private spawnOne(nearX?: number, nearY?: number): boolean {
    const nav = this.cityMap.navigation;
    const spots = this.pickSpawnTiles(nav, 1, nearX, nearY);
    if (spots.length === 0) return false;
    const spot = spots[0];
    const wx = spot.tx * TILE_SIZE + TILE_SIZE / 2 + Phaser.Math.Between(-4, 4);
    const wy = spot.ty * TILE_SIZE + TILE_SIZE / 2 + Phaser.Math.Between(-4, 4);
    this.pedestrians.push(new Pedestrian(this.scene, wx, wy, this.baseSpeed));
    return true;
  }

  private despawnFarthest(nearX?: number, nearY?: number): void {
    if (this.pedestrians.length === 0) return;
    let idx = 0;
    let maxDist = -1;
    for (let i = 0; i < this.pedestrians.length; i++) {
      const ped = this.pedestrians[i];
      const dist =
        nearX !== undefined && nearY !== undefined
          ? Phaser.Math.Distance.Between(nearX, nearY, ped.sprite.x, ped.sprite.y)
          : 0;
      if (dist > maxDist) {
        maxDist = dist;
        idx = i;
      }
    }
    this.pedestrians[idx].destroy();
    this.pedestrians.splice(idx, 1);
  }

  private pickSpawnTiles(
    nav: NavigationGrid,
    count: number,
    nearX?: number,
    nearY?: number
  ): TileCoord[] {
    const near = nearX !== undefined && nearY !== undefined
      ? this.filterNearTiles(nav.listSidewalkTiles(), nearX, nearY, 28)
      : [];
    const pool = near.length > 0 ? near : nav.listSidewalkTiles();
    if (pool.length === 0) return [];

    const shuffled = Phaser.Utils.Array.Shuffle([...pool]);
    const picked: TileCoord[] = [];
    const minDistSq = 10 * 10;

    for (const tile of shuffled) {
      if (picked.length >= count) break;
      const tooClose = picked.some((p) => {
        const dx = p.tx - tile.tx;
        const dy = p.ty - tile.ty;
        return dx * dx + dy * dy < minDistSq;
      });
      const occupied = this.pedestrians.some((ped) => {
        const tx = Math.floor(ped.sprite.x / TILE_SIZE);
        const ty = Math.floor(ped.sprite.y / TILE_SIZE);
        return tx === tile.tx && ty === tile.ty;
      });
      if (!tooClose && !occupied) picked.push(tile);
    }

    return picked;
  }

  private filterNearTiles(
    tiles: TileCoord[],
    cx: number,
    cy: number,
    radiusTiles: number
  ): TileCoord[] {
    const centerTx = Math.floor(cx / TILE_SIZE);
    const centerTy = Math.floor(cy / TILE_SIZE);
    const rSq = radiusTiles * radiusTiles;
    return tiles.filter((t) => {
      const dx = t.tx - centerTx;
      const dy = t.ty - centerTy;
      return dx * dx + dy * dy <= rSq;
    });
  }
}