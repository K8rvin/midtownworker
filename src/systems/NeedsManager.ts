import type { GameState } from '../config';

const HUNGER_DECAY_PER_HOUR = 4;
const SLEEP_DECAY_PER_HOUR = 3;
const DRUNK_DECAY_PER_HOUR = 12;
const SPRINT_HUNGER_MIN = 22;
const DRUNK_SPRINT_MAX = 48;

export interface NeedsUpdateResult {
  fainted: boolean;
  message?: string;
}

export class NeedsManager {
  onHourPassed(state: GameState): NeedsUpdateResult {
    state.hunger = Math.max(0, state.hunger - HUNGER_DECAY_PER_HOUR);
    state.sleep = Math.max(0, state.sleep - SLEEP_DECAY_PER_HOUR);
    state.drunkLevel = Math.max(0, state.drunkLevel - DRUNK_DECAY_PER_HOUR);

    if (state.hunger <= 0 || state.sleep <= 0) {
      const fromHunger = state.hunger <= 0;
      state.hunger = Math.max(35, state.hunger);
      state.sleep = Math.max(35, state.sleep);
      state.health = Math.max(15, state.health - 5);
      const reason = fromHunger ? 'голода' : 'усталости';
      return {
        fainted: true,
        message: `Вы отключились от ${reason}. Отдохните и поешьте — деньги не списаны.`,
      };
    }
    return { fainted: false };
  }

  canSprint(state: GameState): boolean {
    if (state.hunger <= SPRINT_HUNGER_MIN) return false;
    if (state.drunkLevel >= DRUNK_SPRINT_MAX) return false;
    return true;
  }

  sprintBlockedReason(state: GameState): string | null {
    if (state.hunger <= SPRINT_HUNGER_MIN) return 'Слишком голодны — бег недоступен';
    if (state.drunkLevel >= DRUNK_SPRINT_MAX) return 'Слишком пьяны — бег недоступен';
    return null;
  }

  eat(state: GameState, hungerRestore: number): void {
    state.hunger = Math.min(100, state.hunger + hungerRestore);
  }

  drink(state: GameState, alcohol: number, hungerRestore = 0): void {
    state.hunger = Math.min(100, state.hunger + hungerRestore);
    state.drunkLevel = Math.min(100, state.drunkLevel + alcohol);
  }

  sleep(state: GameState, amount = 85): void {
    state.sleep = Math.min(100, state.sleep + amount);
    state.drunkLevel = Math.max(0, state.drunkLevel - 15);
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