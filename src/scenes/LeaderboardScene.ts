import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { LeaderboardManager, type LeaderboardEntry } from '../systems/LeaderboardManager';
import { RunStats } from '../systems/RunStats';
import {
  createMenuBackdrop,
  createMenuButton,
  createMenuPanel,
} from '../ui/MenuTheme';

export class LeaderboardScene extends Phaser.Scene {
  private nameInput: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  create(): void {
    createMenuBackdrop(this);
    createMenuPanel(this, GAME_WIDTH / 2, 360, 520, 520);

    this.add
      .text(GAME_WIDTH / 2, 90, 'ЛИДЕРБОРД', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#ffd600',
        stroke: '#0a0a12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2);

    const playerName = LeaderboardManager.getPlayerName();
    this.nameInput = this.add
      .text(GAME_WIDTH / 2, 140, `Имя: ${playerName}  [клик — изменить]`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#00b4ff',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    this.nameInput.on('pointerdown', () => this.promptPlayerName());

    const entries = LeaderboardManager.load();
    const lines = this.formatEntries(entries);

    this.add
      .text(GAME_WIDTH / 2, 200, lines.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#c8f542',
        lineSpacing: 6,
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    const stats = RunStats.load();
    const footer: string[] = [];
    if (stats.fastestVictorySeconds !== null) {
      footer.push(`Лучшее время победы: ${RunStats.formatTime(stats.fastestVictorySeconds)}`);
    }
    if (stats.bestRun) {
      footer.push(
        `Лучший забег: ${stats.bestRun.questsCompleted} квестов · $${stats.bestRun.money}`
      );
    }
    if (footer.length) {
      this.add
        .text(GAME_WIDTH / 2, 560, footer.join('\n'), {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#6b7280',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(2);
    }

    createMenuButton(this, GAME_WIDTH / 2, 620, 'НАЗАД', () =>
      this.scene.start('MainMenuScene')
    ).setDepth(2);

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MainMenuScene'));
  }

  private formatEntries(entries: LeaderboardEntry[]): string[] {
    if (entries.length === 0) {
      return ['Пока нет записей.', 'Сыграйте забег — результат попадёт сюда.'];
    }
    return entries.map((e, i) => {
      const mark = e.victory ? '★' : '·';
      const time = RunStats.formatTime(e.playTimeSeconds);
      return `${i + 1}. ${mark} ${e.playerName} — ${e.score} очк. (${e.questsCompleted}к · ${time})`;
    });
  }

  private promptPlayerName(): void {
    const current = LeaderboardManager.getPlayerName();
    const next = window.prompt('Ваше имя в таблице лидеров:', current);
    if (next !== null) {
      LeaderboardManager.setPlayerName(next);
      this.scene.restart();
    }
  }
}