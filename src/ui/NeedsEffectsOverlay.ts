import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

/**
 * Drowsiness: double eyelid blink + longer hold when very tired.
 */
export class NeedsEffectsOverlay {
  private topLid: Phaser.GameObjects.Rectangle;
  private bottomLid: Phaser.GameObjects.Rectangle;
  private sway: Phaser.GameObjects.Rectangle;
  private blinkTimer = 0;
  private blinkDuration = 0;
  private blinkStrength = 0;
  private swayPhase = 0;
  /** Double-blink: 0 idle, 1 first blink running, 2 gap, 3 second blink */
  private doublePhase: 0 | 1 | 2 | 3 = 0;
  private doubleGap = 0;
  private secondBlinkQueued = false;

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
    this.blinkDuration = 1.3;
    this.blinkStrength = 1;
    this.blinkTimer = 0;
    this.doublePhase = 0;
    this.secondBlinkQueued = false;
  }

  private startBlink(intensity: number, longHold: boolean): void {
    const hold = longHold
      ? Phaser.Math.Linear(0.9, 1.35, intensity)
      : Phaser.Math.Linear(0.28, 0.55, intensity);
    this.blinkDuration = hold;
    this.blinkStrength = Phaser.Math.Linear(0.4, 1, intensity);
  }

  update(dt: number, sleep: number, drunk: number): void {
    const drowsy = Math.max(0, (35 - sleep) / 35);
    const drunkFx = Math.min(1, drunk / 55);
    const intensity = Phaser.Math.Clamp(drowsy * 0.75 + drunkFx * 0.95, 0, 1);
    const heavyDrowsy = drowsy > 0.35;

    if (intensity > 0.08) {
      this.blinkTimer -= dt;

      if (this.doublePhase === 2) {
        this.doubleGap -= dt;
        if (this.doubleGap <= 0) {
          this.doublePhase = 3;
          this.startBlink(intensity, heavyDrowsy);
        }
      }

      if (this.blinkTimer <= 0 && this.blinkDuration <= 0 && this.doublePhase === 0) {
        // Slower interval, heavier blinks
        const baseInterval = Phaser.Math.Linear(18, 6, intensity);
        this.blinkTimer = baseInterval + Math.random() * baseInterval * 0.4;
        this.doublePhase = 1;
        this.secondBlinkQueued = heavyDrowsy || Math.random() < 0.55 + intensity * 0.35;
        this.startBlink(intensity, heavyDrowsy);
      }
    } else {
      this.blinkTimer = 3;
      this.blinkDuration = 0;
      this.doublePhase = 0;
      this.secondBlinkQueued = false;
    }

    let lid = 0;
    if (this.blinkDuration > 0) {
      this.blinkDuration -= dt;
      const total = heavyDrowsy ? 1.35 : 0.85;
      const t = Phaser.Math.Clamp(this.blinkDuration / total, 0, 1);
      // Hold closed longer: flatter top of curve
      const u = t < 0.35 ? t / 0.35 : t > 0.65 ? (1 - t) / 0.35 : 1;
      lid = u * this.blinkStrength * (GAME_HEIGHT * 0.44);

      if (this.blinkDuration <= 0) {
        if (this.doublePhase === 1 && this.secondBlinkQueued) {
          this.doublePhase = 2;
          this.doubleGap = 0.14 + Math.random() * 0.08;
          this.secondBlinkQueued = false;
        } else {
          this.doublePhase = 0;
        }
      }
    } else if (drowsy > 0.45 && drunkFx < 0.3) {
      lid = drowsy * GAME_HEIGHT * 0.1;
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
