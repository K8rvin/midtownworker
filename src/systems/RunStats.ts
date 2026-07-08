import type { GameState } from '../config';

export interface RunRecord {
  questsCompleted: number;
  kills: number;
  money: number;
  arrests: number;
  playTimeSeconds: number;
  victory: boolean;
  recordedAt: string;
}

export interface RunStatsData {
  bestRun: RunRecord | null;
  fastestVictorySeconds: number | null;
}

const STATS_KEY = 'gta2_run_stats';

export class RunStats {
  static load(): RunStatsData {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { bestRun: null, fastestVictorySeconds: null };
    try {
      return JSON.parse(raw) as RunStatsData;
    } catch {
      return { bestRun: null, fastestVictorySeconds: null };
    }
  }

  static save(data: RunStatsData): void {
    localStorage.setItem(STATS_KEY, JSON.stringify(data));
  }

  static recordRun(state: GameState, playTimeSeconds: number, victory: boolean): RunStatsData {
    const record: RunRecord = {
      questsCompleted: state.stats.questsCompleted,
      kills: state.stats.kills,
      money: state.money,
      arrests: state.stats.arrests,
      playTimeSeconds,
      victory,
      recordedAt: new Date().toISOString(),
    };

    const current = this.load();
    const score = record.questsCompleted * 1000 + record.money + record.kills * 10;
    const bestScore = current.bestRun
      ? current.bestRun.questsCompleted * 1000 + current.bestRun.money + current.bestRun.kills * 10
      : -1;

    if (!current.bestRun || score > bestScore) {
      current.bestRun = record;
    }

    if (victory) {
      if (
        current.fastestVictorySeconds === null ||
        playTimeSeconds < current.fastestVictorySeconds
      ) {
        current.fastestVictorySeconds = playTimeSeconds;
      }
    }

    this.save(current);
    return current;
  }

  static formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}