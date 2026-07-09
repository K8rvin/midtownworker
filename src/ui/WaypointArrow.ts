import Phaser from 'phaser';

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
 * World-space arrow at the player, pointing toward a target.
 * Always visible while a target exists (on- or off-screen).
 */
export class WaypointArrow {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private visible = false;

  constructor(private scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setScrollFactor(1).setDepth(50);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffd600',
        backgroundColor: '#0d0d14cc',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setScrollFactor(1)
      .setDepth(51);
    this.hide();
  }

  /**
   * @param target world-space destination
   * @param origin player world position (arrow is drawn near origin)
   */
  update(target: WaypointTarget | null, origin?: WaypointOrigin | null): void {
    if (!target || !origin) {
      this.hide();
      return;
    }

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      this.hide();
      return;
    }

    const angle = Math.atan2(dy, dx);
    const color = target.color ?? 0xffd600;
    const ring = 28;
    const size = 12;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Arrow sits in a ring around the player, pointing outward
    const arrowX = origin.x + cos * ring;
    const arrowY = origin.y + sin * ring;

    this.gfx.clear();
    // stem
    this.gfx.lineStyle(2, color, 0.55);
    this.gfx.lineBetween(origin.x + cos * 14, origin.y + sin * 14, arrowX - cos * 6, arrowY - sin * 6);
    // tip
    this.gfx.fillStyle(color, 0.95);
    const tipX = arrowX + cos * size;
    const tipY = arrowY + sin * size;
    const baseX = arrowX - cos * size * 0.5;
    const baseY = arrowY - sin * size * 0.5;
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
    this.gfx.lineStyle(1.5, 0xffffff, 0.7);
    this.gfx.strokeTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );

    if (target.label) {
      this.label.setText(target.label);
      this.label.setPosition(origin.x - sin * 36, origin.y + cos * 36 - 8);
      this.label.setColor(target.labelColor ?? '#ffd600');
      this.label.setVisible(true);
    } else {
      this.label.setVisible(false);
    }

    this.gfx.setVisible(true);
    this.visible = true;
  }

  destroy(): void {
    this.gfx.destroy();
    this.label.destroy();
  }

  private hide(): void {
    if (!this.visible) return;
    this.gfx.clear();
    this.gfx.setVisible(false);
    this.label.setVisible(false);
    this.visible = false;
  }
}
