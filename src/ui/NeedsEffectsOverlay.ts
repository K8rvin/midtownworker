import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

/** Drowsiness / drunkenness screen effects — eyelids, sway, no money penalties. */
export class NeedsEffectsOverlay {
  private topLid: Phaser.GameObjects.Rectangle;
  private bottomLid: Phaser.GameObjects.Rectangle;
  private sway: Phaser.GameObjects.Rectangle;
  private blinkTimer = 0;
  private blinkDuration = 0;
  private blinkStrength = 0;
  private swayPhase = 0;

  constructor(private scene: Phaser.Scene) {
    this.sway = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH + 40, GAME_HEIGHT + 40, 0x1a1030, 0)
      .setScrollFactor(0)
      .setDepth(205);
    this.topLid = scene.add
      .rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 0, 0x000000, 0.92)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(206);
    this.bottomLid = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT, GAME_WIDTH, 0, 0x000000, 0.92)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(206);
  }

  triggerCollapseBlink(): void {
    this.blinkDuration = 1.1;
    this.blinkStrength = 1;
    this.blinkTimer = 0;
  }

  update(dt: number, sleep: number, drunk: number): void {
    const drowsy = Math.max(0, (35 - sleep) / 35);
    const drunkFx = Math.min(1, drunk / 55);
    const intensity = Phaser.Math.Clamp(drowsy * 0.75 + drunkFx * 0.95, 0, 1);

    if (intensity > 0.08) {
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0 && this.blinkDuration <= 0) {
        const baseInterval = Phaser.Math.Linear(14, 4.5, intensity);
        this.blinkTimer = baseInterval + Math.random() * baseInterval * 0.5;
        this.blinkDuration = Phaser.Math.Linear(0.22, 0.85, intensity);
        this.blinkStrength = Phaser.Math.Linear(0.35, 1, intensity);
      }
    } else {
      this.blinkTimer = 2;
      this.blinkDuration = 0;
    }

    let lid = 0;
    if (this.blinkDuration > 0) {
      this.blinkDuration -= dt;
      const t = Phaser.Math.Clamp(this.blinkDuration / 0.85, 0, 1);
      const curve = 1 - Math.abs(t * 2 - 1);
      lid = curve * this.blinkStrength * (GAME_HEIGHT * 0.42);
    } else if (drowsy > 0.45 && drunkFx < 0.3) {
      lid = drowsy * GAME_HEIGHT * 0.08;
    }

    this.topLid.setSize(GAME_WIDTH, lid);
    this.bottomLid.setSize(GAME_WIDTH, lid);

    this.swayPhase += dt * Phaser.Math.Linear(0.6, 2.4, drunkFx);
    const swayAlpha = drunkFx * 0.14;
    const swayX = Math.sin(this.swayPhase) * drunkFx * 10;
    const swayY = Math.cos(this.swayPhase * 0.7) * drunkFx * 6;
    this.sway.setAlpha(swayAlpha);
    this.sway.setPosition(GAME_WIDTH / 2 + swayX, GAME_HEIGHT / 2 + swayY);
    this.sway.setAngle(Math.sin(this.swayPhase * 0.5) * drunkFx * 2.5);
  }

  destroy(): void {
    this.topLid.destroy();
    this.bottomLid.destroy();
    this.sway.destroy();
  }
}