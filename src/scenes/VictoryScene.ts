import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { GameState } from '../config';
import { getAudio } from '../systems/AudioManager';
import { SaveManager } from '../systems/SaveManager';
import { RunStats, type RunStatsData } from '../systems/RunStats';
import { AchievementManager, ACHIEVEMENTS } from '../systems/AchievementManager';
import type { MetaProgressData } from '../systems/MetaProgress';
import {
  createMenuBackdrop,
  createMenuButton,
  createMenuPanel,
  createStatLines,
} from '../ui/MenuTheme';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(data: {
    state: GameState;
    playTimeSeconds?: number;
    runStats?: RunStatsData;
    meta?: MetaProgressData;
    leaderboardRank?: number | null;
    isNewBest?: boolean;
  }): void {
    const state = data.state;
    const playTime = data.playTimeSeconds ?? 0;
    const stats = data.runStats ?? RunStats.load();
    SaveManager.clear();

    createMenuBackdrop(this);
    createMenuPanel(this, GAME_WIDTH / 2, 360, 460, 440);

    const endingTitle = AchievementManager.getEndingTitle(state.chosenBranch);
    const endingSub = AchievementManager.getEndingSubtitle(state.chosenBranch);

    this.add
      .text(GAME_WIDTH / 2, 120, endingTitle.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '42px',
        color: '#00e676',
        stroke: '#0a0a12',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, 175, endingSub, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const lines = [
      `Время: ${RunStats.formatTime(playTime)}`,
      `Квестов: ${state.stats.questsCompleted}`,
      `Убийств: ${state.stats.kills}`,
      `Арестов: ${state.stats.arrests}`,
      `Угонов: ${state.stats.vehiclesStolen}`,
      `Деньги: $${state.money}`,
    ];

    if (stats.fastestVictorySeconds !== null) {
      const isRecord = playTime <= stats.fastestVictorySeconds;
      lines.push(
        `${isRecord ? '★ Новый рекорд!' : 'Лучшее время'}: ${RunStats.formatTime(stats.fastestVictorySeconds)}`
      );
    }
    if (state.ngPlusLevel > 0) lines.push(`New Game+ уровень: ${state.ngPlusLevel}`);
    lines.push(`Достижения: ${state.achievements.length}/${ACHIEVEMENTS.length}`);
    if (data.leaderboardRank) {
      lines.push(
        `${data.isNewBest ? '★ Новый #1 в лидерборде!' : `Место в лидерборде: #${data.leaderboardRank}`}`
      );
    }

    createStatLines(this, lines, 230).forEach((t) => t.setDepth(2));

    getAudio(this).playSfx('victory');
    createMenuButton(this, GAME_WIDTH / 2, 530, 'ГЛАВНОЕ МЕНЮ', () =>
      this.scene.start('MainMenuScene')
    ).setDepth(2);
    createMenuButton(this, GAME_WIDTH / 2, 596, 'НОВАЯ ИГРА', () =>
      this.scene.start('GameScene', { loadSave: false })
    ).setDepth(2);
  }
}