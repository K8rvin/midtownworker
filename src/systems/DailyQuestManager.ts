import type { GameState } from '../config';

export type DailyQuestType = 'kills' | 'money' | 'quests' | 'survive_wanted' | 'visit_port';

export interface DailyQuestDef {
  dateKey: string;
  type: DailyQuestType;
  title: string;
  description: string;
  target: number;
  reward: number;
}

export interface DailyQuestState {
  dateKey: string;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
}

const DAILY_KEY = 'gta2_daily_quest';

const TEMPLATES: Record<
  DailyQuestType,
  { titles: string[]; desc: (n: number) => string; target: (rng: () => number) => number; reward: number }
> = {
  kills: {
    titles: ['Охота на районе', 'Чистка улиц', 'Кровавый вечер'],
    desc: (n) => `Устраните ${n} целей за забег`,
    target: (rng) => 6 + Math.floor(rng() * 8),
    reward: 450,
  },
  money: {
    titles: ['Быстрый нал', 'Кэш-флоу', 'Денежный поток'],
    desc: (n) => `Заработайте $${n} за забег`,
    target: (rng) => 400 + Math.floor(rng() * 600),
    reward: 500,
  },
  quests: {
    titles: ['Активный день', 'Контракты', 'Работа на район'],
    desc: (n) => `Выполните ${n} квеста за забег`,
    target: (rng) => 1 + Math.floor(rng() * 2),
    reward: 650,
  },
  survive_wanted: {
    titles: ['В розыске', 'На грани', 'Погоня'],
    desc: (n) => `Продержитесь ${n} сек. с розыском 2+`,
    target: (rng) => 45 + Math.floor(rng() * 45),
    reward: 550,
  },
  visit_port: {
    titles: ['Рейс в порт', 'Морской бриз', 'Доки'],
    desc: () => 'Доберитесь до порта',
    target: () => 1,
    reward: 350,
  },
};

function dateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function generateDailyQuest(d = new Date()): DailyQuestDef {
  const key = dateKey(d);
  const rng = seededRandom(parseInt(key, 10));
  const types: DailyQuestType[] = ['kills', 'money', 'quests', 'survive_wanted', 'visit_port'];
  const type = types[Math.floor(rng() * types.length)];
  const tpl = TEMPLATES[type];
  const target = tpl.target(rng);
  const title = tpl.titles[Math.floor(rng() * tpl.titles.length)];

  return {
    dateKey: key,
    type,
    title,
    description: tpl.desc(target),
    target,
    reward: tpl.reward,
  };
}

export class DailyQuestManager {
  readonly def: DailyQuestDef;
  private state: DailyQuestState;
  private wantedSurviveTimer = 0;

  constructor() {
    this.def = generateDailyQuest();
    this.state = DailyQuestManager.loadState(this.def.dateKey);
  }

  static loadState(expectedDateKey: string): DailyQuestState {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) {
      return { dateKey: expectedDateKey, progress: 0, completed: false, rewardClaimed: false };
    }
    try {
      const parsed = JSON.parse(raw) as DailyQuestState;
      if (parsed.dateKey !== expectedDateKey) {
        return { dateKey: expectedDateKey, progress: 0, completed: false, rewardClaimed: false };
      }
      return parsed;
    } catch {
      return { dateKey: expectedDateKey, progress: 0, completed: false, rewardClaimed: false };
    }
  }

  static saveState(state: DailyQuestState): void {
    localStorage.setItem(DAILY_KEY, JSON.stringify(state));
  }

  static isCompletedToday(): boolean {
    const def = generateDailyQuest();
    const state = DailyQuestManager.loadState(def.dateKey);
    return state.completed && state.rewardClaimed;
  }

  getProgress(): number {
    return this.state.progress;
  }

  isDone(): boolean {
    return this.state.completed && this.state.rewardClaimed;
  }

  getProgressText(): string {
    const prefix = 'Ежедневное';
    if (this.isDone()) {
      return `✓ ${prefix}: ${this.def.title} — выполнено (+$${this.def.reward})`;
    }

    const p = Math.min(this.state.progress, this.def.target);
    switch (this.def.type) {
      case 'visit_port':
        return `◎ ${prefix}: ${this.def.title} — доберитесь до порта`;
      case 'money':
        return `◎ ${prefix}: ${this.def.title} ($${p}/$${this.def.target})`;
      case 'survive_wanted':
        return `◎ ${prefix}: ${this.def.title} (${p}/${this.def.target} сек. в розыске 2+)`;
      case 'quests':
        return `◎ ${prefix}: ${this.def.title} (${p}/${this.def.target} квестов)`;
      case 'kills':
      default:
        return `◎ ${prefix}: ${this.def.title} (${p}/${this.def.target} убийств)`;
    }
  }

  onKill(): string | null {
    if (this.def.type !== 'kills' || this.state.completed) return null;
    this.state.progress += 1;
    return this.checkComplete();
  }

  onQuestComplete(): string | null {
    if (this.def.type !== 'quests' || this.state.completed) return null;
    this.state.progress += 1;
    return this.checkComplete();
  }

  onMoneyEarned(amount: number): string | null {
    if (this.def.type !== 'money' || this.state.completed || amount <= 0) return null;
    this.state.progress += amount;
    return this.checkComplete();
  }

  onVisitPort(): string | null {
    if (this.def.type !== 'visit_port' || this.state.completed) return null;
    this.state.progress = 1;
    return this.checkComplete();
  }

  update(dt: number, wantedLevel: number): string | null {
    if (this.def.type !== 'survive_wanted' || this.state.completed) return null;
    if (wantedLevel < 2) return null;
    this.wantedSurviveTimer += dt;
    this.state.progress = Math.floor(this.wantedSurviveTimer);
    return this.checkComplete();
  }

  private checkComplete(): string | null {
    if (this.state.progress < this.def.target) {
      DailyQuestManager.saveState(this.state);
      return null;
    }
    if (!this.state.completed) this.state.completed = true;
    return null;
  }

  claimReward(state: GameState): string | null {
    if (!this.state.completed || this.state.rewardClaimed) return null;
    state.money += this.def.reward;
    this.state.rewardClaimed = true;
    DailyQuestManager.saveState(this.state);
    return `Ежедневное задание: +$${this.def.reward}!`;
  }

  tryAutoClaim(state: GameState): string | null {
    if (this.state.progress >= this.def.target && !this.state.rewardClaimed) {
      if (!this.state.completed) this.state.completed = true;
      return this.claimReward(state);
    }
    return null;
  }
}