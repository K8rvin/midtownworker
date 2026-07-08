import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getAudio } from '../systems/AudioManager';
import { createMenuBackdrop, createMenuButton, createMenuPanel } from '../ui/MenuTheme';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    createMenuBackdrop(this, 0.88);
    createMenuPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 360, 300);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 118, 'ПАУЗА', {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: '#c8f542',
        stroke: '#0a0a12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'ПРОДОЛЖИТЬ', () => {
      this.scene.resume('GameScene');
      this.scene.stop();
    }).setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 36, 'НАСТРОЙКИ', () => {
      this.scene.launch('SettingsScene', { returnScene: 'PauseScene', resumeGame: true });
    }).setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 102, 'ГЛАВНОЕ МЕНЮ', () => {
      getAudio(this).stopEngine();
      if (this.scene.isPaused('GameScene')) {
        this.scene.resume('GameScene');
      }
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('MainMenuScene');
    }).setDepth(2);

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.resume('GameScene');
      this.scene.stop();
    });
  }
}