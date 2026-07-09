import Phaser from 'phaser';

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

const PHASE_ORDER: DayPhase[] = ['night', 'dawn', 'day', 'dusk'];
const PHASE_DURATION = 150;

/** Fractional hour 0–24 → phase and progress within that phase (for atmosphere). */
export function hourToPhase(hour: number): { phase: DayPhase; blend: number } {
  const h = ((hour % 24) + 24) % 24;
  if (h < 5) return { phase: 'night', blend: h / 5 };
  if (h < 7) return { phase: 'dawn', blend: (h - 5) / 2 };
  if (h < 18) return { phase: 'day', blend: (h - 7) / 11 };
  if (h < 22) return { phase: 'dusk', blend: (h - 18) / 4 };
  return { phase: 'night', blend: (h - 22) / 2 };
}

/** Moving traffic vehicles — more at rush hour, fewer deep at night. */
export function getTrafficCountForHour(hour: number): number {
  const h = Math.floor(((hour % 24) + 24) % 24);
  if (h < 6) return 4;
  if (h < 9) return 16;
  if (h < 16) return 12;
  if (h < 20) return 18;
  if (h < 23) return 8;
  return 5;
}

/** Pedestrians on sidewalks — busiest daytime and evening. */
export function getPedestrianCountForHour(hour: number): number {
  const h = Math.floor(((hour % 24) + 24) % 24);
  if (h < 6) return 12;
  if (h < 9) return 48;
  if (h < 17) return 36;
  if (h < 21) return 44;
  return 18;
}

export class TimeOfDayManager {
  private elapsed = 0;
  /** Start at day so night FX (street lights) don't flash before first sync. */
  private phaseIndex = 2; // 'day' in PHASE_ORDER
  private useGameClock = false;

  constructor(private atmosphere?: { setPhase: (phase: DayPhase, blend: number) => void }) {}

  /** Life-sim: tie visuals and NPC pace to the game clock instead of a fixed cycle. */
  enableGameClock(): void {
    this.useGameClock = true;
  }

  update(dt: number): DayPhase {
    if (this.useGameClock) return this.getPhase();
    this.elapsed += dt;
    if (this.elapsed >= PHASE_DURATION) {
      this.elapsed -= PHASE_DURATION;
      this.phaseIndex = (this.phaseIndex + 1) % PHASE_ORDER.length;
    }
    const phase = PHASE_ORDER[this.phaseIndex];
    const blend = this.elapsed / PHASE_DURATION;
    this.atmosphere?.setPhase(phase, blend);
    return phase;
  }

  syncFromHour(hour: number): DayPhase {
    const { phase, blend } = hourToPhase(hour);
    this.phaseIndex = PHASE_ORDER.indexOf(phase);
    this.elapsed = blend * PHASE_DURATION;
    this.atmosphere?.setPhase(phase, blend);
    return phase;
  }

  getPhase(): DayPhase {
    return PHASE_ORDER[this.phaseIndex];
  }

  getNpcSpeedMultiplier(): number {
    const phase = this.getPhase();
    if (phase === 'night') return 0.8;
    if (phase === 'dawn' || phase === 'dusk') return 0.92;
    return 1;
  }

  getVisibilityAlpha(): number {
    const phase = this.getPhase();
    if (phase === 'night') return 0.7;
    if (phase === 'dawn' || phase === 'dusk') return 0.85;
    return 0.98;
  }
}