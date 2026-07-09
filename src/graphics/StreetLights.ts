import Phaser from 'phaser';
import type { DayPhase } from '../systems/TimeOfDayManager';
import { TILE_SIZE } from '../config';

/**
 * Soft additive street-light glows near the player at night/dusk.
 * Cheap: few circles, updated every frame from player position.
 */
export class StreetLights {
  private gfx: Phaser.GameObjects.Graphics;
  private lastPhase: DayPhase = 'day';

  constructor(private scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(1.5);
    this.gfx.setBlendMode(Phaser.BlendModes.ADD);
  }

  update(playerX: number, playerY: number, phase: DayPhase): void {
    this.lastPhase = phase;
    this.gfx.clear();
    if (phase !== 'night' && phase !== 'dusk') return;

    const intensity = phase === 'night' ? 1 : 0.45;
    const spacing = TILE_SIZE * 4;
    const radius = 12 * TILE_SIZE;
    const baseTx = Math.floor(playerX / TILE_SIZE);
    const baseTy = Math.floor(playerY / TILE_SIZE);

    // Grid of lamp posts along road-ish grid near player
    for (let dy = -12; dy <= 12; dy += 4) {
      for (let dx = -12; dx <= 12; dx += 4) {
        const tx = baseTx + dx;
        const ty = baseTy + dy;
        // Stagger lamps on even road intersections feel
        if ((tx + ty) % 2 !== 0) continue;
        const wx = tx * TILE_SIZE + TILE_SIZE / 2;
        const wy = ty * TILE_SIZE + TILE_SIZE / 2;
        const dist = Phaser.Math.Distance.Between(playerX, playerY, wx, wy);
        if (dist > radius) continue;
        const falloff = 1 - dist / radius;
        const a = 0.07 * intensity * falloff * falloff;
        this.gfx.fillStyle(0xffe8a0, a);
        this.gfx.fillCircle(wx, wy, 48 + falloff * 20);
        this.gfx.fillStyle(0xfff6d0, a * 1.4);
        this.gfx.fillCircle(wx, wy, 18);
      }
    }

    // Headlight cone on player vehicle is handled elsewhere; boost near player a bit
    void spacing;
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
