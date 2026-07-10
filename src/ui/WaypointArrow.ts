import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export interface WaypointTarget {
  x: number;
  y: number;
  label?: string;
  color?: number;
  labelColor?: string;
}

export interface WaypointOrigin {
  x: number;
  y: number;
}

/**
 * Compact world-space chevron from the player; text is a fixed left-side legend.
 */
export class WaypointArrow {
  private gfx: Phaser.GameObjects.Graphics;
  private legendRoot: Phaser.GameObjects.Container;
  private legendBg: Phaser.GameObjects.Rectangle;
  private legendText: Phaser.GameObjects.Text;
  private visible = false;

  constructor(private scene: Phaser.Scene) {
    // World arrow (above player, below HUD)
    this.gfx = scene.add.graphics().setScrollFactor(1).setDepth(55);

    // Screen-space legend — left side, under top HUD bar
    this.legendRoot = scene.add.container(16, 78).setScrollFactor(0).setDepth(101);
    this.legendBg = scene.add
      .rectangle(0, 0, 280, 40, 0x0d0d14, 0.88)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xc8f542, 0.35);
    this.legendText = scene.add
      .text(10, 8, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffd600',
        wordWrap: { width: 260 },
      })
      .setOrigin(0, 0);
    this.legendRoot.add([this.legendBg, this.legendText]);
    this.hide();
  }

  /**
   * Counteract camera zoom so legend stays on the left of the screen.
   */
  setUiScale(cameraZoom: number): void {
    const z = Phaser.Math.Clamp(cameraZoom, 0.5, 2.5);
    const s = 1 / z;
    const ox = GAME_WIDTH * 0.5 * (1 - s);
    const oy = GAME_HEIGHT * 0.5 * (1 - s);
    this.legendRoot.setScale(s);
    this.legendRoot.setPosition(ox + 16 * s, oy + 78 * s);
  }

  /**
   * @param target destination in world pixels
   * @param origin player (or vehicle) world position
   */
  update(target: WaypointTarget | null, origin?: WaypointOrigin | null): void {
    if (!target || !origin) {
      this.hide();
      return;
    }

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 18) {
      this.hide();
      return;
    }

    const angle = Math.atan2(dy, dx);
    const color = target.color ?? 0xffd600;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Compact chevron at player
    const stemStart = 8;
    const ring = 16;
    const size = 9;
    const arrowX = origin.x + cos * ring;
    const arrowY = origin.y + sin * ring;

    this.gfx.clear();

    this.gfx.fillStyle(color, 0.2);
    this.gfx.fillCircle(origin.x, origin.y, 5);
    this.gfx.lineStyle(1.5, color, 0.55);
    this.gfx.strokeCircle(origin.x, origin.y, 5);

    this.gfx.lineStyle(2, color, 0.8);
    this.gfx.lineBetween(
      origin.x + cos * stemStart,
      origin.y + sin * stemStart,
      arrowX - cos * 4,
      arrowY - sin * 4
    );

    this.gfx.fillStyle(color, 0.98);
    const tipX = arrowX + cos * size;
    const tipY = arrowY + sin * size;
    const baseX = arrowX - cos * size * 0.45;
    const baseY = arrowY - sin * size * 0.45;
    const perpX = -sin * size * 0.55;
    const perpY = cos * size * 0.55;
    this.gfx.fillTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );
    this.gfx.lineStyle(1, 0xffffff, 0.85);
    this.gfx.strokeTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );

    // Left-screen legend (not world-space)
    if (target.label) {
      this.legendText.setText(target.label);
      this.legendText.setColor(target.labelColor ?? '#ffd600');
      const th = Math.max(20, this.legendText.height + 12);
      const tw = Math.min(300, Math.max(160, this.legendText.width + 20));
      this.legendBg.setSize(tw, th);
      this.legendBg.setStrokeStyle(1, color, 0.4);
      this.legendRoot.setVisible(true);
    } else {
      this.legendRoot.setVisible(false);
    }

    this.gfx.setVisible(true);
    this.visible = true;
  }

  destroy(): void {
    this.gfx.destroy();
    this.legendRoot.destroy();
  }

  private hide(): void {
    this.gfx.clear();
    this.gfx.setVisible(false);
    this.legendRoot.setVisible(false);
    this.visible = false;
  }
}
