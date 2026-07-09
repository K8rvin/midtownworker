import { DEFAULT_GAME_STATE, type GameState } from '../config';
import { SaveManager } from './SaveManager';
import { MetaProgress, type MetaProgressData } from './MetaProgress';
import { RunStats, type RunStatsData } from './RunStats';
import { LeaderboardManager, type LeaderboardEntry } from './LeaderboardManager';
import { DailyQuestManager, type DailyQuestState } from './DailyQuestManager';
import { AchievementManager } from './AchievementManager';

const BUNDLE_VERSION = 1;

export interface CloudSaveBundle {
  version: number;
  gameState: GameState | null;
  /** All save slots when available (v1 may only have active slot in gameState). */
  slots?: (GameState | null)[];
  activeSlot?: number;
  meta: MetaProgressData;
  achievements: string[];
  runStats: RunStatsData;
  dailyQuest: DailyQuestState | null;
  leaderboard: LeaderboardEntry[];
  playerName: string;
  exportedAt: string;
}

const STORAGE_KEYS = {
  save: 'gta2_save',
  meta: 'gta2_meta',
  achievements: 'gta2_achievements_global',
  runStats: 'gta2_run_stats',
  daily: 'gta2_daily_quest',
  leaderboard: 'gta2_leaderboard',
  playerName: 'gta2_player_name',
} as const;

export class CloudSaveManager {
  static exportBundle(): string {
    const slots = [0, 1, 2].map((i) => SaveManager.loadFromSlot(i));
    const bundle: CloudSaveBundle = {
      version: BUNDLE_VERSION,
      gameState: SaveManager.load(),
      slots,
      activeSlot: SaveManager.getActiveSlot(),
      meta: MetaProgress.load(),
      achievements: AchievementManager.loadGlobal(),
      runStats: RunStats.load(),
      dailyQuest: this.readJson<DailyQuestState>(STORAGE_KEYS.daily),
      leaderboard: LeaderboardManager.load(),
      playerName: LeaderboardManager.getPlayerName(),
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(bundle);
    return btoa(unescape(encodeURIComponent(json)));
  }

  static importBundle(encoded: string): { ok: true } | { ok: false; error: string } {
    let bundle: CloudSaveBundle;
    try {
      const json = decodeURIComponent(escape(atob(encoded.trim())));
      bundle = JSON.parse(json) as CloudSaveBundle;
    } catch {
      return { ok: false, error: 'Неверный код сохранения' };
    }

    if (bundle.version !== BUNDLE_VERSION) {
      return { ok: false, error: 'Несовместимая версия сохранения' };
    }

    if (bundle.slots && Array.isArray(bundle.slots)) {
      for (let i = 0; i < 3; i++) {
        const st = bundle.slots[i];
        if (st) {
          const merged: GameState = {
            ...DEFAULT_GAME_STATE,
            ...st,
            respect: { ...DEFAULT_GAME_STATE.respect, ...st.respect },
            ammo: { ...DEFAULT_GAME_STATE.ammo, ...st.ammo },
            stats: { ...DEFAULT_GAME_STATE.stats, ...st.stats },
            questProgress: { ...DEFAULT_GAME_STATE.questProgress, ...st.questProgress },
          };
          SaveManager.saveToSlot(i, merged);
        } else {
          SaveManager.clearSlot(i);
        }
      }
      if (typeof bundle.activeSlot === 'number') SaveManager.setActiveSlot(bundle.activeSlot);
    } else if (bundle.gameState) {
      const merged: GameState = {
        ...DEFAULT_GAME_STATE,
        ...bundle.gameState,
        respect: { ...DEFAULT_GAME_STATE.respect, ...bundle.gameState.respect },
        ammo: { ...DEFAULT_GAME_STATE.ammo, ...bundle.gameState.ammo },
        stats: { ...DEFAULT_GAME_STATE.stats, ...bundle.gameState.stats },
        questProgress: { ...DEFAULT_GAME_STATE.questProgress, ...bundle.gameState.questProgress },
      };
      SaveManager.saveToSlot(0, merged);
    } else {
      SaveManager.clearAll();
    }

    MetaProgress.save(bundle.meta ?? { hasBeatenGame: false, ngPlusLevel: 0 });
    AchievementManager.saveGlobal(bundle.achievements ?? []);
    RunStats.save(bundle.runStats ?? { bestRun: null, fastestVictorySeconds: null });

    if (bundle.dailyQuest) {
      localStorage.setItem(STORAGE_KEYS.daily, JSON.stringify(bundle.dailyQuest));
    }
    LeaderboardManager.save(bundle.leaderboard ?? []);
    if (bundle.playerName) LeaderboardManager.setPlayerName(bundle.playerName);

    return { ok: true };
  }

  static copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    return Promise.resolve(false);
  }

  private static readJson<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}