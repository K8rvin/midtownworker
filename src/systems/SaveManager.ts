import { DEFAULT_GAME_STATE, DEFAULT_HOUSING, DEFAULT_LIFE_STATS, type GameState } from '../config';

const SAVE_KEY = 'gta2_save';

function normalizeInventory(raw: unknown): { food: Record<string, number> } {
  if (!raw || typeof raw !== 'object') return { food: {} };
  const inv = raw as { food?: unknown };
  if (typeof inv.food === 'number') {
    return inv.food > 0 ? { food: { meal: inv.food } } : { food: {} };
  }
  if (inv.food && typeof inv.food === 'object') {
    return { food: { ...(inv.food as Record<string, number>) } };
  }
  return { food: {} };
}

export class SaveManager {
  static save(state: GameState): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  static load(): GameState | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<GameState>;
      return {
        ...DEFAULT_GAME_STATE,
        ...parsed,
        respect: { ...DEFAULT_GAME_STATE.respect, ...parsed.respect },
        ammo: { ...DEFAULT_GAME_STATE.ammo, ...parsed.ammo },
        stats: { ...DEFAULT_GAME_STATE.stats, ...parsed.stats },
        questProgress: { ...DEFAULT_GAME_STATE.questProgress, ...parsed.questProgress },
        questSnapshot: parsed.questSnapshot ?? null,
        ownedWeapons: parsed.ownedWeapons ?? DEFAULT_GAME_STATE.ownedWeapons,
        completedQuests: parsed.completedQuests ?? DEFAULT_GAME_STATE.completedQuests,
        chosenBranch: parsed.chosenBranch ?? null,
        blockedQuests: parsed.blockedQuests ?? [],
        ownedVehicles: parsed.ownedVehicles ?? [],
        usedWeapons: parsed.usedWeapons ?? [],
        ngPlusLevel: parsed.ngPlusLevel ?? 0,
        achievements: parsed.achievements ?? [],
        currentMapId: parsed.currentMapId ?? DEFAULT_GAME_STATE.currentMapId,
        coopPlayer2: parsed.coopPlayer2,
        inVehicle: false,
        vehicleType: null,
        hunger: parsed.hunger ?? DEFAULT_GAME_STATE.hunger,
        sleep: parsed.sleep ?? DEFAULT_GAME_STATE.sleep,
        drunkLevel: parsed.drunkLevel ?? 0,
        day: parsed.day ?? DEFAULT_GAME_STATE.day,
        hour: parsed.hour ?? DEFAULT_GAME_STATE.hour,
        housing: { ...DEFAULT_HOUSING, ...parsed.housing },
        job: parsed.job ?? null,
        homeFurniture: parsed.homeFurniture ?? [],
        furniturePlaced: parsed.furniturePlaced ?? {},
        inventory: normalizeInventory(parsed.inventory),
        lifeStats: {
          ...DEFAULT_LIFE_STATS,
          ...parsed.lifeStats,
          contractKills: parsed.lifeStats?.contractKills ?? 0,
          courierDeliveries: parsed.lifeStats?.courierDeliveries ?? 0,
        },
        courierDelivery: parsed.courierDelivery ?? null,
        completedLifeTasks: parsed.completedLifeTasks ?? [],
        activeLifeTaskId: parsed.activeLifeTaskId ?? null,
        storyChapter: parsed.storyChapter ?? 0,
      };
    } catch {
      return null;
    }
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static clear(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}