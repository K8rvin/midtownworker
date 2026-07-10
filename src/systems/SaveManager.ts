import {
  DEFAULT_BANK,
  DEFAULT_GAME_STATE,
  DEFAULT_HOUSING,
  DEFAULT_LIFE_STATS,
  type GameState,
} from '../config';

/** Number of player save slots. */
export const SAVE_SLOT_COUNT = 3;

const LEGACY_SAVE_KEY = 'gta2_save';
const ACTIVE_SLOT_KEY = 'gta2_active_slot';
const slotKey = (slot: number) => `gta2_save_slot_${slot}`;

export interface SaveSlotMeta {
  slot: number;
  empty: boolean;
  savedAt: string | null;
  day: number;
  hour: number;
  money: number;
  jobName: string | null;
  homeLabel: string;
  storyChapter: number;
  summary: string;
}

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

function parseState(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GameState> & { _savedAt?: string };
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
      job: parsed.job
        ? { ...parsed.job, shiftOpen: parsed.job.shiftOpen ?? false }
        : null,
      homeFurniture: parsed.homeFurniture ?? [],
      furniturePlaced: parsed.furniturePlaced ?? {},
      inventory: normalizeInventory(parsed.inventory),
      lifeStats: {
        ...DEFAULT_LIFE_STATS,
        ...parsed.lifeStats,
        contractKills: parsed.lifeStats?.contractKills ?? 0,
        courierDeliveries: parsed.lifeStats?.courierDeliveries ?? 0,
        courierCombo: parsed.lifeStats?.courierCombo ?? 0,
        taxiFares: parsed.lifeStats?.taxiFares ?? 0,
        taxiRatingSum: parsed.lifeStats?.taxiRatingSum ?? 0,
        taxiRatingCount: parsed.lifeStats?.taxiRatingCount ?? 0,
        policeCalls: parsed.lifeStats?.policeCalls ?? 0,
        fireCalls: parsed.lifeStats?.fireCalls ?? 0,
      },
      courierDelivery: parsed.courierDelivery ?? null,
      taxiFare: parsed.taxiFare ?? null,
      taxiCarCleanliness: parsed.taxiCarCleanliness ?? 100,
      emergencyCall: parsed.emergencyCall ?? null,
      navTarget: parsed.navTarget ?? null,
      completedLifeTasks: parsed.completedLifeTasks ?? [],
      activeLifeTaskId: parsed.activeLifeTaskId ?? null,
      storyChapter: parsed.storyChapter ?? 0,
      bank: { ...DEFAULT_BANK, ...parsed.bank },
      insuranceUntilDay: parsed.insuranceUntilDay ?? 0,
      casinoDay: parsed.casinoDay ?? 0,
      casinoDayBet: parsed.casinoDayBet ?? 0,
    };
  } catch {
    return null;
  }
}

function wrapForStorage(state: GameState): string {
  return JSON.stringify({
    ...state,
    _savedAt: new Date().toISOString(),
  });
}

function readSavedAt(raw: string): string | null {
  try {
    const p = JSON.parse(raw) as { _savedAt?: string };
    return p._savedAt ?? null;
  } catch {
    return null;
  }
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** Migrate legacy single save into slot 0 once. */
function migrateLegacyIfNeeded(): void {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(slotKey(0))) return;
  const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
  if (!legacy) return;
  localStorage.setItem(slotKey(0), legacy);
  localStorage.removeItem(LEGACY_SAVE_KEY);
  if (localStorage.getItem(ACTIVE_SLOT_KEY) === null) {
    localStorage.setItem(ACTIVE_SLOT_KEY, '0');
  }
}

export class SaveManager {
  static getActiveSlot(): number {
    migrateLegacyIfNeeded();
    const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
    const n = raw !== null ? parseInt(raw, 10) : 0;
    if (Number.isNaN(n) || n < 0 || n >= SAVE_SLOT_COUNT) return 0;
    return n;
  }

  static setActiveSlot(slot: number): void {
    const s = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, Math.floor(slot)));
    localStorage.setItem(ACTIVE_SLOT_KEY, String(s));
  }

  /** Save to active slot (F5 / auto). */
  static save(state: GameState): void {
    this.saveToSlot(this.getActiveSlot(), state);
  }

  static saveToSlot(slot: number, state: GameState): void {
    migrateLegacyIfNeeded();
    const s = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, slot));
    localStorage.setItem(slotKey(s), wrapForStorage(state));
    this.setActiveSlot(s);
  }

  /** Load active slot. */
  static load(): GameState | null {
    return this.loadFromSlot(this.getActiveSlot());
  }

  static loadFromSlot(slot: number): GameState | null {
    migrateLegacyIfNeeded();
    const s = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, slot));
    const raw = localStorage.getItem(slotKey(s));
    if (!raw) return null;
    return parseState(raw);
  }

  static hasSave(): boolean {
    return this.hasAnySave();
  }

  static hasAnySave(): boolean {
    migrateLegacyIfNeeded();
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      if (localStorage.getItem(slotKey(i))) return true;
    }
    return false;
  }

  static hasSlot(slot: number): boolean {
    migrateLegacyIfNeeded();
    return localStorage.getItem(slotKey(slot)) !== null;
  }

  static clear(): void {
    this.clearSlot(this.getActiveSlot());
  }

  static clearSlot(slot: number): void {
    migrateLegacyIfNeeded();
    const s = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, slot));
    localStorage.removeItem(slotKey(s));
  }

  static clearAll(): void {
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      localStorage.removeItem(slotKey(i));
    }
    localStorage.removeItem(LEGACY_SAVE_KEY);
  }

  static getSlotMeta(slot: number): SaveSlotMeta {
    migrateLegacyIfNeeded();
    const s = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, slot));
    const raw = localStorage.getItem(slotKey(s));
    if (!raw) {
      return {
        slot: s,
        empty: true,
        savedAt: null,
        day: 0,
        hour: 0,
        money: 0,
        jobName: null,
        homeLabel: '—',
        storyChapter: 0,
        summary: 'Пусто',
      };
    }
    const state = parseState(raw);
    if (!state) {
      return {
        slot: s,
        empty: true,
        savedAt: null,
        day: 0,
        hour: 0,
        money: 0,
        jobName: null,
        homeLabel: '—',
        storyChapter: 0,
        summary: 'Повреждено',
      };
    }
    const homeLabel =
      state.housing.type === 'owned'
        ? 'свой дом'
        : state.housing.type === 'rent'
          ? 'аренда'
          : 'без жилья';
    const job = state.job?.name ?? 'без работы';
    const summary = `День ${state.day} · ${formatHour(state.hour)} · $${state.money} · ${job}`;
    return {
      slot: s,
      empty: false,
      savedAt: readSavedAt(raw),
      day: state.day,
      hour: state.hour,
      money: state.money,
      jobName: state.job?.name ?? null,
      homeLabel,
      storyChapter: state.storyChapter,
      summary,
    };
  }

  static listSlots(): SaveSlotMeta[] {
    return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => this.getSlotMeta(i));
  }
}
