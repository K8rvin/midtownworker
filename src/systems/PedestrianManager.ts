import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import cityLayout from '../data/city-layout.json';
import { Pedestrian } from '../entities/Pedestrian';
import type { CityMap } from '../world/CityMap';
import type { NavigationGrid } from '../world/NavigationGrid';
import type { TileCoord } from '../world/NavigationGrid';

export class PedestrianManager {
  public pedestrians: Pedestrian[] = [];

  constructor(
    private scene: Phaser.Scene,
    private cityMap: CityMap
  ) {}

  spawn(): void {
    if (this.cityMap.mapId !== 'city') return;

    const nav = this.cityMap.navigation;
    const cfg = (cityLayout as { pedestrians?: { count?: number; speed?: number } }).pedestrians;
    const count = cfg?.count ?? 32;
    const speed = cfg?.speed ?? 42;
    const spots = this.pickSpawnTiles(nav, count);

    for (const spot of spots) {
      const wx = spot.tx * TILE_SIZE + TILE_SIZE / 2 + Phaser.Math.Between(-4, 4);
      const wy = spot.ty * TILE_SIZE + TILE_SIZE / 2 + Phaser.Math.Between(-4, 4);
      this.pedestrians.push(new Pedestrian(this.scene, wx, wy, speed));
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

  private pickSpawnTiles(nav: NavigationGrid, count: number): TileCoord[] {
    const all = nav.listSidewalkTiles();
    if (all.length === 0) return [];

    const shuffled = Phaser.Utils.Array.Shuffle([...all]);
    const picked: TileCoord[] = [];
    const minDistSq = 12 * 12;

    for (const tile of shuffled) {
      if (picked.length >= count) break;
      const tooClose = picked.some((p) => {
        const dx = p.tx - tile.tx;
        const dy = p.ty - tile.ty;
        return dx * dx + dy * dy < minDistSq;
      });
      if (!tooClose) picked.push(tile);
    }

    while (picked.length < count && picked.length < shuffled.length) {
      const tile = shuffled[picked.length];
      if (!picked.some((p) => p.tx === tile.tx && p.ty === tile.ty)) picked.push(tile);
    }

    return picked;
  }
}