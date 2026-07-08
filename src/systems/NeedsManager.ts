import type { GameState } from '../config';

const HUNGER_DECAY_PER_HOUR = 4;
const SLEEP_DECAY_PER_HOUR = 3;
const FAINT_PENALTY = 50;

export interface NeedsUpdateResult {
  fainted: boolean;
  message?: string;
}

export class NeedsManager {
  onHourPassed(state: GameState): NeedsUpdateResult {
    state.hunger = Math.max(0, state.hunger - HUNGER_DECAY_PER_HOUR);
    state.sleep = Math.max(0, state.sleep - SLEEP_DECAY_PER_HOUR);

    if (state.hunger <= 0 || state.sleep <= 0) {
      state.money = Math.max(0, state.money - FAINT_PENALTY);
      state.hunger = 40;
      state.sleep = 40;
      state.health = Math.max(20, state.health - 10);
      const reason = state.hunger <= 0 ? 'голод' : 'усталость';
      return {
        fainted: true,
        message: `Обморок от ${reason}. Штраф $${FAINT_PENALTY}. Поешьте и отдохните.`,
      };
    }
    return { fainted: false };
  }

  eat(state: GameState, hungerRestore: number): void {
    state.hunger = Math.min(100, state.hunger + hungerRestore);
  }

  sleep(state: GameState, amount = 85): void {
    state.sleep = Math.min(100, state.sleep + amount);
  }

  hungerStatus(hunger: number): string {
    if (hunger > 60) return 'сыт';
    if (hunger > 30) return 'голоден';
    return 'истощён';
  }

  sleepStatus(sleep: number): string {
    if (sleep > 60) return 'бодр';
    if (sleep > 30) return 'устал';
    return 'измотан';
  }
}