import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { GameState } from '../config';
import { RunStats, type RunStatsData } from '../systems/RunStats';
import {
  createMenuBackdrop,
  createMenuButton,
  createMenuPanel,
  createStatLines,
} from '../ui/MenuTheme';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: {
    state: GameState;
    playTimeSeconds?: number;
    runStats?: RunStatsData;
    leaderboardRank?: number | null;
    isNewBest?: boolean;
  }): void {
    const state = data.state;
    const playTime = data.playTimeSeconds ?? 0;
    const stats = data.runStats ?? RunStats.load();

    createMenuBackdrop(this);
    createMenuPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 460, 400);

    this.add
      .text(GAME_WIDTH / 2, 130, 'ИГРА ОКОНЧЕНА', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ff2d55',
        stroke: '#0a0a12',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(2);

    const lines = [
      `Время: ${RunStats.formatTime(playTime)}`,
      `Квестов: ${state.stats.questsCompleted}`,
      `Убийств: ${state.stats.kills}`,
      `Угонов: ${state.stats.vehiclesStolen}`,
      `Денег: $${state.money}`,
    ];

    if (stats.bestRun) {
      lines.push(
        `Рекорд: ${stats.bestRun.questsCompleted} квестов · $${stats.bestRun.money} · ${RunStats.formatTime(stats.bestRun.playTimeSeconds)}`
      );
    }
    if (data.leaderboardRank) {
      lines.push(
        `${data.isNewBest ? '★ Новый #1 в лидерборде!' : `Место в лидерборде: #${data.leaderboardRank}`}`
      );
    }

    createStatLines(this, lines, 250).forEach((t) => t.setDepth(2));

    createMenuButton(this, GAME_WIDTH / 2, 520, 'ГЛАВНОЕ МЕНЮ', () =>
      this.scene.start('MainMenuScene')
    ).setDepth(2);
    createMenuButton(this, GAME_WIDTH / 2, 586, 'НОВАЯ ИГРА', () =>
      this.scene.start('GameScene', { loadSave: false })
    ).setDepth(2);
  }
}