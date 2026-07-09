import Phaser from 'phaser';
import type { DayPhase } from '../systems/TimeOfDayManager';
import { TILE_SIZE } from '../config';
import { TileType, type CityMap } from '../world/CityMap';

/**
 * Very soft night ambience: a few dim glows on real road tiles only.
 * (Previous grid of ADD-blend circles looked like 9 yellow bug markers.)
 */
export class StreetLights {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(
    private scene: Phaser.Scene,
    private cityMap?: CityMap | null
  ) {
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(1.5);
    // Normal blend — ADD made tiny alpha look like solid yellow blobs
  }

  setCityMap(map: CityMap): void {
    this.cityMap = map;
  }

  update(playerX: number, playerY: number, phase: DayPhase): void {
    this.gfx.clear();
    if (phase !== 'night' && phase !== 'dusk') return;
    if (!this.cityMap) return;

    const intensity = phase === 'night' ? 1 : 0.4;
    const baseTx = Math.floor(playerX / TILE_SIZE);
    const baseTy = Math.floor(playerY / TILE_SIZE);
    const maxLights = 5;
    let drawn = 0;

    // Sparse scan: every 6 tiles, only on roads, max 5 glows
    for (let dy = -15; dy <= 15 && drawn < maxLights; dy += 6) {
      for (let dx = -15; dx <= 15 && drawn < maxLights; dx += 6) {
        if (dx === 0 && dy === 0) continue;
        const tx = baseTx + dx;
        const ty = baseTy + dy;
        if (ty < 0 || ty >= this.cityMap.mapHeight) continue;
        if (tx < 0 || tx >= this.cityMap.mapWidth) continue;
        if (this.cityMap.tiles[ty][tx] !== TileType.Road) continue;

        const wx = tx * TILE_SIZE + TILE_SIZE / 2;
        const wy = ty * TILE_SIZE + TILE_SIZE / 2;
        const dist = Phaser.Math.Distance.Between(playerX, playerY, wx, wy);
        if (dist > 14 * TILE_SIZE) continue;

        const falloff = 1 - dist / (14 * TILE_SIZE);
        const a = 0.028 * intensity * falloff * falloff;
        if (a < 0.006) continue;

        this.gfx.fillStyle(0xffd080, a);
        this.gfx.fillCircle(wx, wy, 36 + falloff * 12);
        drawn++;
      }
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
