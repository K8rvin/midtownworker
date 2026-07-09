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
 * World-space navigation: chevron grows from the player toward the goal
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
   * @param origin player (or vehicle) world position — arrow is drawn around this point
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

    // Ring offset from character center so chevron is clearly "from me"
    const ring = 36;
    const size = 16;
    const arrowX = origin.x + cos * ring;
    const arrowY = origin.y + sin * ring;

    this.gfx.clear();

    // Soft ground disc under player (anchors the arrow to character)
    this.gfx.fillStyle(color, 0.2);
    this.gfx.fillCircle(origin.x, origin.y, 10);
    this.gfx.lineStyle(2, color, 0.55);
    this.gfx.strokeCircle(origin.x, origin.y, 10);

    // Stem from near feet toward tip
    this.gfx.lineStyle(3, color, 0.75);
    this.gfx.lineBetween(
      origin.x + cos * 16,
      origin.y + sin * 16,
      arrowX - cos * 8,
      arrowY - sin * 8
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
    this.gfx.lineStyle(2, 0xffffff, 0.85);
    this.gfx.strokeTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );

    if (target.label) {
      // Label slightly behind the player opposite to travel direction (readable)
      this.label.setText(target.label);
      this.label.setPosition(origin.x - cos * 8, origin.y - sin * 8 - 28);
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
