import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { DayPhase } from '../systems/TimeOfDayManager';

const PHASE_TINT: Record<DayPhase, number> = {
  night: 0x1a1040,
  dawn: 0x3a2848,
  day: 0x2a3050,
  dusk: 0x402838,
};

const PHASE_ALPHA: Record<DayPhase, number> = {
  night: 0.22,
  dawn: 0.12,
  day: 0.06,
  dusk: 0.14,
};

/** Neo-noir atmosphere with time-of-day tint. */
export class AtmosphereOverlay {
  private container: Phaser.GameObjects.Container;
  private tintRect: Phaser.GameObjects.Rectangle;
  private fogRect: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(90);

    this.tintRect = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      PHASE_TINT.night,
      PHASE_ALPHA.night
    );

    this.fogRect = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x8888aa,
      0.08
    );

    const vignette = scene.add.graphics();
    vignette.fillStyle(0x000000, 0.45);
    const pad = 80;
    vignette.fillRect(0, 0, GAME_WIDTH, pad);
    vignette.fillRect(0, GAME_HEIGHT - pad, GAME_WIDTH, pad);
    vignette.fillRect(0, 0, pad, GAME_HEIGHT);
    vignette.fillRect(GAME_WIDTH - pad, 0, pad, GAME_HEIGHT);

    const scanlines = scene.add.graphics();
    scanlines.fillStyle(0x000000, 0.04);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      scanlines.fillRect(0, y, GAME_WIDTH, 1);
    }

    this.container.add([this.tintRect, this.fogRect, vignette, scanlines]);
    this.setPhase('night', 0);
  }

  setPhase(phase: DayPhase, _blend: number): void {
    this.tintRect.setFillStyle(PHASE_TINT[phase], PHASE_ALPHA[phase]);
    this.fogRect.setAlpha(phase === 'night' ? 0.14 : phase === 'day' ? 0.03 : 0.08);
  }

  destroy(): void {
    this.container.destroy();
  }
}