import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { TileType, type CityMap } from '../world/CityMap';

interface Mark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  life: number;
}

/** Single Graphics batch for skid marks — avoids 120 separate GameObjects. */
export class TireMarkManager {
  private marks: Mark[] = [];
  private spawnCooldown = 0;
  private readonly maxMarks = 160;
  private readonly markLife = 10;
  private gfx: Phaser.GameObjects.Graphics;
  private dirty = true;

  constructor(
    private scene: Phaser.Scene,
    private cityMap: CityMap
  ) {
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(1);
  }

  tryAddMark(x: number, y: number, angleDeg: number, speed: number, steer: number, dt: number): void {
    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) return;
    if (Math.abs(speed) < 75 || Math.abs(steer) < 0.3) return;

    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    if (ty < 0 || ty >= this.cityMap.tiles.length) return;
    if (tx < 0 || tx >= this.cityMap.tiles[0].length) return;
    if (this.cityMap.tiles[ty][tx] !== TileType.Road) return;

    this.spawnCooldown = 0.05;
    const rad = Phaser.Math.DegToRad(angleDeg);
    const perp = rad + Math.PI / 2;
    const track = 9;
    const len = 10 + Math.abs(steer) * 6;
    const alpha = 0.22 + Math.min(Math.abs(speed) / 300, 0.18);

    for (const side of [-1, 1] as const) {
      const ox = Math.cos(perp) * track * side;
      const oy = Math.sin(perp) * track * side;
      this.marks.push({
        x1: x + ox - Math.cos(rad) * len,
        y1: y + oy - Math.sin(rad) * len,
        x2: x + ox + Math.cos(rad) * len * 0.2,
        y2: y + oy + Math.sin(rad) * len * 0.2,
        alpha,
        life: this.markLife,
      });
    }

    while (this.marks.length > this.maxMarks) {
      this.marks.shift();
    }
    this.dirty = true;
  }

  update(dt: number): void {
    let changed = false;
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const mark = this.marks[i];
      mark.life -= dt;
      if (mark.life <= 0) {
        this.marks.splice(i, 1);
        changed = true;
      }
    }
    if (changed || this.dirty) {
      this.redraw();
      this.dirty = false;
    }
  }

  private redraw(): void {
    this.gfx.clear();
    for (const mark of this.marks) {
      const a = Phaser.Math.Clamp((mark.life / this.markLife) * mark.alpha, 0, 0.45);
      this.gfx.lineStyle(2.5, 0x151520, a);
      this.gfx.lineBetween(mark.x1, mark.y1, mark.x2, mark.y2);
    }
  }

  clear(): void {
    this.marks = [];
    this.gfx.clear();
  }
}
