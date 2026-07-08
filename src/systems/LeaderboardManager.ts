import type { GameState } from '../config';

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  questsCompleted: number;
  kills: number;
  money: number;
  playTimeSeconds: number;
  victory: boolean;
  ngPlusLevel: number;
  recordedAt: string;
}

const LEADERBOARD_KEY = 'gta2_leaderboard';
const PLAYER_NAME_KEY = 'gta2_player_name';
const MAX_ENTRIES = 10;

export class LeaderboardManager {
  static getPlayerName(): string {
    return localStorage.getItem(PLAYER_NAME_KEY) ?? 'Игрок';
  }

  static setPlayerName(name: string): void {
    const trimmed = name.trim().slice(0, 16) || 'Игрок';
    localStorage.setItem(PLAYER_NAME_KEY, trimmed);
  }

  static computeScore(state: GameState, playTimeSeconds: number, victory: boolean): number {
    return (
      state.stats.questsCompleted * 1000 +
      state.money +
      state.stats.kills * 10 +
      (victory ? 5000 : 0) +
      state.ngPlusLevel * 500 +
      Math.max(0, 1800 - Math.floor(playTimeSeconds))
    );
  }

  static load(): LeaderboardEntry[] {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as LeaderboardEntry[];
    } catch {
      return [];
    }
  }

  static save(entries: LeaderboardEntry[]): void {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  }

  static addEntry(state: GameState, playTimeSeconds: number, victory: boolean): {
    entries: LeaderboardEntry[];
    rank: number | null;
    isNewBest: boolean;
  } {
    const entry: LeaderboardEntry = {
      playerName: this.getPlayerName(),
      score: this.computeScore(state, playTimeSeconds, victory),
      questsCompleted: state.stats.questsCompleted,
      kills: state.stats.kills,
      money: state.money,
      playTimeSeconds,
      victory,
      ngPlusLevel: state.ngPlusLevel,
      recordedAt: new Date().toISOString(),
    };

    const entries = [...this.load(), entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);

    const rank = entries.findIndex(
      (e) => e.recordedAt === entry.recordedAt && e.score === entry.score
    );
    const isNewBest = rank === 0;

    this.save(entries);
    return { entries, rank: rank >= 0 ? rank + 1 : null, isNewBest };
  }
}