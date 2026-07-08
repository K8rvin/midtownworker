import Phaser from 'phaser';

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

const PHASE_ORDER: DayPhase[] = ['night', 'dawn', 'day', 'dusk'];
const PHASE_DURATION = 150;

export class TimeOfDayManager {
  private elapsed = 0;
  private phaseIndex = 0;

  constructor(private atmosphere?: { setPhase: (phase: DayPhase, blend: number) => void }) {}

  update(dt: number): DayPhase {
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

  getPhase(): DayPhase {
    return PHASE_ORDER[this.phaseIndex];
  }

  getNpcSpeedMultiplier(): number {
    const phase = this.getPhase();
    if (phase === 'night') return 0.75;
    if (phase === 'dawn' || phase === 'dusk') return 0.9;
    return 1;
  }

  getVisibilityAlpha(): number {
    const phase = this.getPhase();
    if (phase === 'night') return 0.55;
    if (phase === 'dawn' || phase === 'dusk') return 0.75;
    return 0.95;
  }
}