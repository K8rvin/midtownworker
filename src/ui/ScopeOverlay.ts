import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { Player } from '../entities/Player';

/** First-person scope view for scoped weapons (sniper rifle). */
export class ScopeOverlay {
  private active = false;
  private aimAngle = 0;
  private gfx: Phaser.GameObjects.Graphics | null = null;
  private fpsGfx: Phaser.GameObjects.Graphics | null = null;
  private hudText: Phaser.GameObjects.Text | null = null;
  private savedZoom = 1;

  constructor(private scene: Phaser.Scene) {}

  isActive(): boolean {
    return this.active;
  }

  getAimAngle(): number {
    return this.aimAngle;
  }

  enter(player: Player): void {
    if (this.active) return;
    this.active = true;
    this.aimAngle = player.facingAngle;
    this.savedZoom = this.scene.cameras.main.zoom;
    this.gfx = this.scene.add.graphics().setScrollFactor(0).setDepth(300);
    this.fpsGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(301);
    this.hudText = this.scene.add
      .text(GAME_WIDTH / 2, 28, 'ПРИЦЕЛ', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff2d55',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(302);
    player.sprite.setAlpha(0.15);
  }

  exit(player: Player): void {
    if (!this.active) return;
    this.active = false;
    this.gfx?.destroy();
    this.fpsGfx?.destroy();
    this.hudText?.destroy();
    this.gfx = null;
    this.fpsGfx = null;
    this.hudText = null;
    player.sprite.setAlpha(1);
    this.scene.cameras.main.setZoom(this.savedZoom);
  }

  updateAim(player: Player, pointer: Phaser.Input.Pointer): void {
    if (!this.active) return;
    const cam = this.scene.cameras.main;
    const world = pointer.positionToCamera(cam) as Phaser.Math.Vector2;
    this.aimAngle = Phaser.Math.RadToDeg(
      Math.atan2(world.y - player.sprite.y, world.x - player.sprite.x)
    );
    player.facingAngle = this.aimAngle;
    cam.setZoom(1.85);
    this.draw(player);
  }

  private draw(player: Player): void {
    const g = this.gfx;
    const fps = this.fpsGfx;
    if (!g || !fps) return;
    g.clear();
    fps.clear();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const scopeR = Math.min(GAME_WIDTH, GAME_HEIGHT) * 0.34;

    g.fillStyle(0x000000, 0.82);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x0a0a12, 0.15);
    g.fillCircle(cx, cy, scopeR + 6);

    g.lineStyle(3, 0x1a1a2e, 1);
    g.strokeCircle(cx, cy, scopeR);
    g.lineStyle(1, 0xc8f542, 0.35);
    g.strokeCircle(cx, cy, scopeR - 2);

    g.lineStyle(1, 0x00e676, 0.7);
    g.lineBetween(cx - scopeR, cy, cx + scopeR, cy);
    g.lineBetween(cx, cy - scopeR, cx, cy + scopeR);
    g.lineStyle(2, 0xff2d55, 0.9);
    g.strokeCircle(cx, cy, 8);
    g.fillStyle(0xff2d55, 1);
    g.fillCircle(cx, cy, 2);

    const tickStep = 24;
    for (let t = -scopeR; t <= scopeR; t += tickStep) {
      if (Math.abs(t) < 12) continue;
      g.lineStyle(1, 0x6b7280, 0.5);
      g.lineBetween(cx + t, cy - 6, cx + t, cy + 6);
      g.lineBetween(cx - 6, cy + t, cx + 6, cy + t);
    }

    const panelH = 140;
    const panelY = GAME_HEIGHT - panelH;
    fps.fillStyle(0x0d0d14, 0.92);
    fps.fillRect(0, panelY, GAME_WIDTH, panelH);
    fps.lineStyle(2, 0xc8f542, 0.4);
    fps.lineBetween(0, panelY, GAME_WIDTH, panelY);

    const gunX = GAME_WIDTH / 2;
    const gunY = panelY + panelH - 28;
    const rad = Phaser.Math.DegToRad(this.aimAngle);

    fps.fillStyle(0x2a2a40, 1);
    fps.fillRect(gunX - 70, gunY + 20, 140, 36);
    fps.fillStyle(0xc8a882, 1);
    fps.fillRect(gunX - 42, gunY + 32, 36, 22);
    fps.fillRect(gunX + 8, gunY + 32, 36, 22);

    fps.fillStyle(0x3d3d5c, 1);
    fps.fillRect(gunX - 8, gunY - 8, 120, 14);
    fps.fillStyle(0x1a1a2e, 1);
    fps.fillRect(gunX + 95, gunY - 6, 38, 10);
    fps.fillStyle(0x111122, 1);
    fps.fillCircle(gunX + 118, gunY - 1, 14);
    fps.lineStyle(2, 0x4a4a6a, 1);
    fps.strokeCircle(gunX + 118, gunY - 1, 14);
    fps.lineStyle(1, 0x00e676, 0.5);
    fps.strokeCircle(gunX + 118, gunY - 1, 6);

    fps.fillStyle(0x5a4030, 1);
    fps.fillRect(gunX - 20, gunY + 10, 50, 18);

    const shoulderX = gunX - 55 + Math.cos(rad) * 8;
    const shoulderY = gunY + 48 + Math.sin(rad) * 4;
    fps.fillStyle(0xc8f542, 0.25);
    fps.fillCircle(shoulderX, shoulderY, 22);

    if (this.hudText) {
      this.hudText.setText(
        `ПРИЦЕЛ · ${Math.round(this.aimAngle)}° · ЛКМ — выстрел · ПКМ/Esc — выйти`
      );
    }
  }
}