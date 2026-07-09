import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { DayPhase } from '../systems/TimeOfDayManager';

const PHASE_ORDER: DayPhase[] = ['night', 'dawn', 'day', 'dusk'];

const PHASE_TINT: Record<DayPhase, number> = {
  night: 0x0c0828,
  dawn: 0x4a3048,
  day: 0x1a2840,
  dusk: 0x3a1838,
};

const PHASE_ALPHA: Record<DayPhase, number> = {
  night: 0.26,
  dawn: 0.12,
  day: 0.04,
  dusk: 0.16,
};

const PHASE_FOG: Record<DayPhase, number> = {
  night: 0.1,
  dawn: 0.06,
  day: 0.02,
  dusk: 0.07,
};

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  return (lerpChannel(r1, r2, t) << 16) | (lerpChannel(g1, g2, t) << 8) | lerpChannel(b1, b2, t);
}

/** Neo-noir atmosphere with smooth time-of-day blending and radial vignette. */
export class AtmosphereOverlay {
  private container: Phaser.GameObjects.Container;
  private tintRect: Phaser.GameObjects.Rectangle;
  private fogRect: Phaser.GameObjects.Rectangle;
  private currentPhase: DayPhase = 'day';

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(90);

    this.tintRect = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      PHASE_TINT.day,
      PHASE_ALPHA.day
    );

    this.fogRect = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x8899bb,
      0.04
    );

    // Radial vignette as generated texture (soft edges)
    const vigKey = '__atm_vignette';
    if (!scene.textures.exists(vigKey)) {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.08)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      scene.textures.addCanvas(vigKey, canvas);
    }
    const vignette = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, vigKey);
    vignette.setDisplaySize(GAME_WIDTH * 1.15, GAME_HEIGHT * 1.15);
    vignette.setAlpha(0.85);

    const scanlines = scene.add.graphics();
    scanlines.fillStyle(0x000000, 0.035);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      scanlines.fillRect(0, y, GAME_WIDTH, 1);
    }

    this.container.add([this.tintRect, this.fogRect, vignette, scanlines]);
    this.setPhase('day', 0);
  }

  setPhase(phase: DayPhase, blend: number): void {
    this.currentPhase = phase;
    const idx = PHASE_ORDER.indexOf(phase);
    const next = PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
    // Smooth crossfade near end of phase window
    const t = Phaser.Math.Clamp((blend - 0.72) / 0.28, 0, 1);

    const color = lerpColor(PHASE_TINT[phase], PHASE_TINT[next], t);
    const alpha = Phaser.Math.Linear(PHASE_ALPHA[phase], PHASE_ALPHA[next], t);
    const fog = Phaser.Math.Linear(PHASE_FOG[phase], PHASE_FOG[next], t);

    this.tintRect.setFillStyle(color, alpha);
    this.fogRect.setAlpha(fog);
  }

  getPhase(): DayPhase {
    return this.currentPhase;
  }

  destroy(): void {
    this.container.destroy();
  }
}
