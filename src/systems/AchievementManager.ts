import type { GameState, GangId } from '../config';
import { GANG_NAMES } from '../config';
import questsData from '../data/quests.json';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'clean_record', title: 'Чистая репутация', description: 'Победа без единого ареста' },
  { id: 'fist_legend', title: 'Кулак закона', description: 'Победа, ни разу не стреляв из огнестрела' },
  { id: 'yakuza_path', title: 'Солдат Якудзы', description: 'Победа через ветку Якудзы' },
  { id: 'rednecks_path', title: 'Король Реднеков', description: 'Победа через ветку Реднеков' },
  { id: 'scientists_path', title: 'Агент науки', description: 'Победа через ветку Учёных' },
  { id: 'triple_agent', title: 'Тройной агент', description: 'Выполнены квесты всех трёх банд' },
  { id: 'ng_warrior', title: 'New Game+', description: 'Победа в режиме New Game+' },
  { id: 'garage_owner', title: 'Коллекционер', description: 'Владеете 2+ машинами' },
];

const ACHIEVEMENTS_KEY = 'gta2_achievements_global';

export class AchievementManager {
  static loadGlobal(): string[] {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  static saveGlobal(ids: string[]): void {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids));
  }

  static evaluate(state: GameState, victory: boolean): string[] {
    if (!victory) return [];

    const unlocked = new Set([...this.loadGlobal(), ...state.achievements]);
    const questIndex = questsData as { id: string; respectGang: GangId }[];
    const gangsDone = new Set<GangId>();
    for (const id of state.completedQuests) {
      const q = questIndex.find((entry) => entry.id === id);
      if (q) gangsDone.add(q.respectGang);
    }

    if (state.stats.arrests === 0) unlocked.add('clean_record');
    if (!state.usedWeapons.some((w) => w !== 'fists')) unlocked.add('fist_legend');
    if (state.chosenBranch === 'yakuza') unlocked.add('yakuza_path');
    if (state.chosenBranch === 'rednecks') unlocked.add('rednecks_path');
    if (state.chosenBranch === 'scientists') unlocked.add('scientists_path');
    if (gangsDone.size >= 3) unlocked.add('triple_agent');
    if (state.ngPlusLevel > 0) unlocked.add('ng_warrior');
    if (state.ownedVehicles.length >= 2) unlocked.add('garage_owner');

    const newIds = [...unlocked];
    this.saveGlobal(newIds);
    state.achievements = newIds;
    return newIds.filter((id) => !state.achievements.includes(id));
  }

  static getTitle(id: string): string {
    return ACHIEVEMENTS.find((a) => a.id === id)?.title ?? id;
  }

  static getEndingTitle(branch: GangId | null): string {
    if (branch === 'yakuza') return 'Империя Якудзы';
    if (branch === 'rednecks') return 'Дикий запад';
    if (branch === 'scientists') return 'Новый мир';
    return 'Город покорён';
  }

  static getEndingSubtitle(branch: GangId | null): string {
    if (!branch) return 'Все квесты выполнены';
    return `Концовка: ${GANG_NAMES[branch]}`;
  }
}