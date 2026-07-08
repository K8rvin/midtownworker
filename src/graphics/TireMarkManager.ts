import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { TileType, type CityMap } from '../world/CityMap';

interface Mark {
  gfx: Phaser.GameObjects.Graphics;
  life: number;
}

export class TireMarkManager {
  private marks: Mark[] = [];
  private spawnCooldown = 0;
  private readonly maxMarks = 120;
  private readonly markLife = 10;

  constructor(
    private scene: Phaser.Scene,
    private cityMap: CityMap
  ) {}

  tryAddMark(x: number, y: number, angleDeg: number, speed: number, steer: number, dt: number): void {
    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) return;
    if (Math.abs(speed) < 75 || Math.abs(steer) < 0.3) return;

    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    if (ty < 0 || ty >= this.cityMap.tiles.length) return;
    if (tx < 0 || tx >= this.cityMap.tiles[0].length) return;
    if (this.cityMap.tiles[ty][tx] !== TileType.Road) return;

    this.spawnCooldown = 0.06;
    const rad = Phaser.Math.DegToRad(angleDeg);
    const perp = rad + Math.PI / 2;
    const track = 9;
    const len = 10 + Math.abs(steer) * 6;
    const alpha = 0.22 + Math.min(Math.abs(speed) / 300, 0.18);

    for (const side of [-1, 1]) {
      const ox = Math.cos(perp) * track * side;
      const oy = Math.sin(perp) * track * side;
      const gfx = this.scene.add.graphics();
      gfx.setDepth(1);
      gfx.lineStyle(2.5, 0x151520, alpha);
      gfx.lineBetween(
        x + ox - Math.cos(rad) * len,
        y + oy - Math.sin(rad) * len,
        x + ox + Math.cos(rad) * len * 0.2,
        y + oy + Math.sin(rad) * len * 0.2
      );
      this.marks.push({ gfx, life: this.markLife });
    }

    while (this.marks.length > this.maxMarks) {
      const old = this.marks.shift()!;
      old.gfx.destroy();
    }
  }

  update(dt: number): void {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const mark = this.marks[i];
      mark.life -= dt;
      mark.gfx.setAlpha(Phaser.Math.Clamp((mark.life / this.markLife) * 0.4, 0, 0.4));
      if (mark.life <= 0) {
        mark.gfx.destroy();
        this.marks.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const mark of this.marks) mark.gfx.destroy();
    this.marks = [];
  }
}