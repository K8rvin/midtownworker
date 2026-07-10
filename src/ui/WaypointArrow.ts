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
 * World-space navigation: chevron grows from the player icon toward the goal
 * (not pinned to screen edges).
 */
export class WaypointArrow {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private visible = false;

  constructor(private scene: Phaser.Scene) {
    // Above entities (player ~4, roof 10), below HUD (100)
    this.gfx = scene.add.graphics().setScrollFactor(1).setDepth(55);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffd600',
        backgroundColor: '#0d0d14ee',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setScrollFactor(1)
      .setDepth(56);
    this.hide();
  }

  /**
   * @param target destination in world pixels
   * @param origin player (or vehicle) world position — arrow is drawn from this icon
   */
  update(target: WaypointTarget | null, origin?: WaypointOrigin | null): void {
    if (!target || !origin) {
      this.hide();
      return;
    }

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dist = Math.hypot(dx, dy);
    // Hide only when essentially on top of target
    if (dist < 18) {
      this.hide();
      return;
    }

    const angle = Math.atan2(dy, dx);
    const color = target.color ?? 0xffd600;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Tight attach to player/vehicle icon center
    const stemStart = 12;
    const ring = 24;
    const size = 14;
    const arrowX = origin.x + cos * ring;
    const arrowY = origin.y + sin * ring;

    this.gfx.clear();

    // Soft ground disc under player (anchors the arrow to character icon)
    this.gfx.fillStyle(color, 0.22);
    this.gfx.fillCircle(origin.x, origin.y, 9);
    this.gfx.lineStyle(2, color, 0.65);
    this.gfx.strokeCircle(origin.x, origin.y, 9);

    // Stem from icon edge toward tip
    this.gfx.lineStyle(3, color, 0.85);
    this.gfx.lineBetween(
      origin.x + cos * stemStart,
      origin.y + sin * stemStart,
      arrowX - cos * 6,
      arrowY - sin * 6
    );

    // Chevron tip
    this.gfx.fillStyle(color, 0.98);
    const tipX = arrowX + cos * size;
    const tipY = arrowY + sin * size;
    const baseX = arrowX - cos * size * 0.45;
    const baseY = arrowY - sin * size * 0.45;
    const perpX = -sin * size * 0.6;
    const perpY = cos * size * 0.6;
    this.gfx.fillTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );
    this.gfx.lineStyle(2, 0xffffff, 0.9);
    this.gfx.strokeTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );

    if (target.label) {
      // Label near the player, slightly opposite travel direction
      this.label.setText(target.label);
      this.label.setPosition(origin.x - cos * 6, origin.y - sin * 6 - 26);
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
