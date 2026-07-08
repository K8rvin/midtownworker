import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, LIFE_SIM } from '../config';
import { SaveManager } from '../systems/SaveManager';
import { MetaProgress } from '../systems/MetaProgress';
import { AchievementManager, ACHIEVEMENTS } from '../systems/AchievementManager';
import { DailyQuestManager } from '../systems/DailyQuestManager';
import { RunStats } from '../systems/RunStats';
import { getAudio } from '../systems/AudioManager';
import {
  createMenuBackdrop,
  createMenuButton,
  createMenuPanel,
  createMenuTitle,
} from '../ui/MenuTheme';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const audio = getAudio(this);
    audio.ensureContext();
    audio.startMusic();

    createMenuBackdrop(this);
    createMenuTitle(this, 'РАБОТЯГА', 'из мидтауна');

    const hasSave = SaveManager.hasSave();
    const meta = MetaProgress.load();
    const achCount = AchievementManager.loadGlobal().length;
    const buttons: { label: string; action: () => void }[] = [
      { label: 'НОВАЯ ИГРА', action: () => this.startGame(false) },
      ...(hasSave ? [{ label: 'ПРОДОЛЖИТЬ', action: () => this.startGame(true) }] : []),
      ...(meta.hasBeatenGame
        ? [{ label: `NEW GAME+ (ур. ${meta.ngPlusLevel})`, action: () => this.startNgPlus() }]
        : []),
      { label: 'КООП 2P', action: () => this.startCoop(false) },
      { label: 'PvP 2P', action: () => this.startCoop(true) },
      { label: 'ОНЛАЙН КООП', action: () => this.openLobby() },
      { label: 'ЛИДЕРБОРД', action: () => this.openLeaderboard() },
      { label: 'НАСТРОЙКИ', action: () => this.openSettings() },
    ];

    const hintY = 228;
    const buttonGap = 44;
    const buttonStartY = hintY + 36;
    const panelH = buttonStartY - (GAME_HEIGHT / 2 + 70 - 240) + buttons.length * buttonGap + 48;
    const panel = createMenuPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, 400, panelH);
    panel.setDepth(1);

    const hintText = LIFE_SIM
      ? 'Симулятор жизни — жильё, работа, еда, сон'
      : new DailyQuestManager().getProgressText();
    this.add
      .text(GAME_WIDTH / 2, hintY, hintText, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: LIFE_SIM ? '#c8f542' : '#00b4ff',
        align: 'center',
        wordWrap: { width: 380 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    buttons.forEach((btn, i) => {
      createMenuButton(this, GAME_WIDTH / 2, buttonStartY + i * buttonGap, btn.label, btn.action).setDepth(2);
    });

    const stats = RunStats.load();
    if (!LIFE_SIM && stats.fastestVictorySeconds !== null) {
      const recordY = buttonStartY + buttons.length * buttonGap + 20;
      this.add
        .text(GAME_WIDTH / 2, recordY, `Рекорд: ${RunStats.formatTime(stats.fastestVictorySeconds)}`, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#6b7280',
        })
        .setOrigin(0.5)
        .setDepth(2);
    }

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 48, 'WASD · 1–4 · E · J · M', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setDepth(2);

    if (achCount > 0) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, `Достижения: ${achCount}/${ACHIEVEMENTS.length}`, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#00e676',
        })
        .setOrigin(0.5)
        .setDepth(2);
    }
  }

  private startCoop(pvp: boolean): void {
    getAudio(this).stopMusic();
    if (this.scene.isActive('GameScene')) this.scene.stop('GameScene');
    this.scene.start('GameScene', { coop: true, pvp, loadSave: false });
  }

  private startNgPlus(): void {
    getAudio(this).stopMusic();
    if (this.scene.isActive('GameScene')) this.scene.stop('GameScene');
    this.scene.start('GameScene', { ngPlus: true });
  }

  private openSettings(): void {
    this.scene.start('SettingsScene', { returnScene: 'MainMenuScene' });
  }

  private openLobby(): void {
    getAudio(this).stopMusic();
    this.scene.start('LobbyScene');
  }

  private openLeaderboard(): void {
    getAudio(this).stopMusic();
    this.scene.start('LeaderboardScene');
  }

  private startGame(loadSave: boolean): void {
    getAudio(this).stopMusic();
    if (!loadSave) SaveManager.clear();
    if (this.scene.isPaused('GameScene')) {
      this.scene.resume('GameScene');
    }
    if (this.scene.isActive('GameScene')) {
      this.scene.stop('GameScene');
    }
    if (this.scene.isActive('HomeScene')) {
      this.scene.stop('HomeScene');
    }
    this.scene.start('GameScene', { loadSave });
  }
}