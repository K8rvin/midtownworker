import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export interface WaypointTarget {
  x: number;
  y: number;
  label?: string;
  color?: number;
  labelColor?: string;
}

/** Screen-edge arrow pointing toward an off-screen world target. */
export class WaypointArrow {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private visible = false;

  constructor(private scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(110);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffd600',
        backgroundColor: '#0d0d14cc',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(111);
    this.hide();
  }

  update(target: WaypointTarget | null, margin = 52): void {
    if (!target) {
      this.hide();
      return;
    }

    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    if (view.contains(target.x, target.y)) {
      this.hide();
      return;
    }

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const screenX = (target.x - cam.scrollX) * cam.zoom;
    const screenY = (target.y - cam.scrollY) * cam.zoom;
    const dx = screenX - cx;
    const dy = screenY - cy;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      this.hide();
      return;
    }

    const angle = Math.atan2(dy, dx);
    const halfW = cx - margin;
    const halfH = cy - margin;
    const scale = Math.min(halfW / Math.max(Math.abs(dx), 0.5), halfH / Math.max(Math.abs(dy), 0.5));
    const arrowX = cx + dx * scale;
    const arrowY = cy + dy * scale;
    const color = target.color ?? 0xffd600;
    const size = 14;

    this.gfx.clear();
    this.gfx.fillStyle(color, 0.95);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tipX = arrowX + cos * size;
    const tipY = arrowY + sin * size;
    const baseX = arrowX - cos * size * 0.55;
    const baseY = arrowY - sin * size * 0.55;
    const perpX = -sin * size * 0.5;
    const perpY = cos * size * 0.5;
    this.gfx.fillTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );
    this.gfx.lineStyle(2, 0xffffff, 0.75);
    this.gfx.strokeTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );

    if (target.label) {
      const labelOffset = 22;
      this.label.setText(target.label);
      this.label.setPosition(arrowX - sin * labelOffset, arrowY + cos * labelOffset);
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