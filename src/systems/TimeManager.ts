import type { GameState } from '../config';

/** ~7.5 real seconds per game hour — visible on the minute clock. */
const MINUTES_PER_REAL_SECOND = 8;
const HOURS_PER_DAY = 24;

export class TimeManager {
  private minuteAccumulator = 0;

  update(dt: number, state: GameState): { dayAdvanced: boolean; hourChanged: boolean } {
    this.minuteAccumulator += dt * MINUTES_PER_REAL_SECOND;
    let dayAdvanced = false;
    let hourChanged = false;

    while (this.minuteAccumulator >= 60) {
      this.minuteAccumulator -= 60;
      const prevHour = state.hour;
      state.hour += 1;
      hourChanged = true;
      if (state.hour >= HOURS_PER_DAY) {
        state.hour = 0;
        state.day += 1;
        dayAdvanced = true;
        if (state.job) state.job.workedToday = false;
      }
      if (prevHour !== state.hour) hourChanged = true;
    }

    return { dayAdvanced, hourChanged };
  }

  /** Fractional hour 0–24 for lighting and city activity. */
  getClockFraction(state: GameState): number {
    return (state.hour + this.minuteAccumulator / 60) % 24;
  }

  formatClock(state: GameState): string {
    const h = String(state.hour).padStart(2, '0');
    const m = String(Math.floor(this.minuteAccumulator)).padStart(2, '0');
    return `День ${state.day} · ${h}:${m}`;
  }

  isWithinShift(state: GameState): boolean {
    if (!state.job) return false;
    const { shiftStart, shiftEnd } = state.job;
    if (shiftStart <= shiftEnd) {
      return state.hour >= shiftStart && state.hour < shiftEnd;
    }
    return state.hour >= shiftStart || state.hour < shiftEnd;
  }
}