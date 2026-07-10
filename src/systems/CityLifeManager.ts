import type { GameState } from '../config';

/** Weekly utilities + soft random city flavor events + shift report helpers. */
export class CityLifeManager {
  static readonly BILL_PERIOD_DAYS = 7;
  static readonly BILL_BASE = 45;

  /** Call when a new day starts. Returns toast messages. */
  onDayAdvanced(state: GameState): string[] {
    const msgs: string[] = [];
    if (!state.billsDueDay || state.billsDueDay < 1) {
      state.billsDueDay = state.day + CityLifeManager.BILL_PERIOD_DAYS;
    }
    if (state.day >= state.billsDueDay) {
      const amount = CityLifeManager.BILL_BASE + Math.floor(Math.random() * 25);
      state.billsOwed = (state.billsOwed ?? 0) + amount;
      state.billsDueDay = state.day + CityLifeManager.BILL_PERIOD_DAYS;
      msgs.push(`🧾 Счета ЖКХ +$${amount} (итого долг $${state.billsOwed}). Почта — оплатить`);
    } else if (state.billsDueDay - state.day === 1) {
      msgs.push('✉ Завтра спишут коммуналку — загляните на почту');
    }
    return msgs;
  }

  /** Soft random events ~ every few game hours while playing. */
  tryRandomEvent(state: GameState, hourChanged: boolean): string | null {
    if (!hourChanged) return null;
    if (state.hour < 8 || state.hour > 22) return null;
    // At most one flavor event per day
    if (state.lastCityEventDay === state.day) return null;
    if (Math.random() > 0.28) return null;
    state.lastCityEventDay = state.day;

    const roll = Math.random();
    if (roll < 0.22) {
      const tip = 8 + Math.floor(Math.random() * 18);
      state.money += tip;
      return `📬 Нашли конверт у подъезда: +$${tip}`;
    }
    if (roll < 0.4) {
      state.hunger = Math.min(100, state.hunger + 8);
      return '☕ Сосед угостил кофе (+голод)';
    }
    if (roll < 0.55 && state.billsOwed > 0) {
      return `⚠ Неоплаченные счета: $${state.billsOwed} — почта на главной`;
    }
    if (roll < 0.7) {
      return '🎉 В кафе «Уголок» сегодня бизнес-ланч со скидкой (зайдите пешком)';
    }
    if (roll < 0.85) {
      state.sleep = Math.max(5, state.sleep - 6);
      return '🔊 Шумные соседи… (−сон). Хостел или дом помогут';
    }
    const find = 5 + Math.floor(Math.random() * 12);
    state.money += find;
    return `🪙 Мелочь в кармане куртки: +$${find}`;
  }

  onShiftOpen(state: GameState): void {
    state.shiftMoneyAtOpen = state.money;
    state.shiftJobsDone = 0;
  }

  onShiftJobDone(state: GameState): void {
    state.shiftJobsDone = (state.shiftJobsDone ?? 0) + 1;
  }

  /** Build end-of-shift report after closeShift succeeds. */
  shiftReport(state: GameState): string {
    const earned = state.money - (state.shiftMoneyAtOpen ?? state.money);
    const jobs = state.shiftJobsDone ?? 0;
    const sign = earned >= 0 ? '+' : '';
    return `📋 Смена: ${jobs} заказов · ${sign}$${earned} · всего $${state.money}`;
  }

  payBills(state: GameState): string | null {
    const owed = state.billsOwed ?? 0;
    if (owed <= 0) return 'Счетов нет — всё оплачено';
    if (state.money < owed) return `Нужно $${owed} (не хватает)`;
    state.money -= owed;
    state.billsOwed = 0;
    return null;
  }

  billsStatus(state: GameState): string {
    const owed = state.billsOwed ?? 0;
    if (owed > 0) return `Долг ЖКХ: $${owed}`;
    const due = state.billsDueDay ?? state.day + 7;
    const left = Math.max(0, due - state.day);
    return left === 0 ? 'Счета сегодня' : `След. счета через ${left} дн.`;
  }
}
