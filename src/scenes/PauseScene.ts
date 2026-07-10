import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getAudio } from '../systems/AudioManager';
import { goToMainMenu } from '../systems/SceneNav';
import { createMenuBackdrop, createMenuButton, createMenuPanel } from '../ui/MenuTheme';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    createMenuBackdrop(this, 0.88);
    createMenuPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 380, 380);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150, 'ПАУЗА', {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: '#c8f542',
        stroke: '#0a0a12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, 'ПРОДОЛЖИТЬ', () => {
      this.scene.resume('GameScene');
      this.scene.stop();
    }).setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, 'СОХРАНИТЬ', () => {
      // GameScene stays paused under SaveSlotsScene
      const game = this.scene.get('GameScene') as Phaser.Scene & {
        syncState?: () => import('../config').GameState;
      };
      this.scene.stop(); // close pause overlay
      this.scene.launch('SaveSlotsScene', {
        mode: 'save',
        resumePause: true,
        returnScene: 'PauseScene',
        getState: () => {
          if (game && typeof game.syncState === 'function') return game.syncState();
          throw new Error('GameScene unavailable');
        },
      });
    }).setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 54, 'НАСТРОЙКИ', () => {
      try {
        if (this.scene.isActive('SettingsScene') || this.scene.isSleeping('SettingsScene')) {
          this.scene.stop('SettingsScene');
        }
        this.scene.launch('SettingsScene', { returnScene: 'PauseScene', resumeGame: true });
        this.scene.bringToTop('SettingsScene');
        // Sleep after launch so Settings mounts fully and gets input priority
        const game = this.game;
        window.setTimeout(() => {
          try {
            if (game.scene.isActive('SettingsScene') && game.scene.isActive('PauseScene')) {
              game.scene.sleep('PauseScene');
            }
          } catch {
            /* ignore */
          }
        }, 0);
      } catch (e) {
        console.error('openSettings from pause failed', e);
        if (this.scene.isSleeping('PauseScene')) this.scene.wake('PauseScene');
      }
    }).setDepth(2);

    let leaving = false;
    createMenuButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 116, 'ГЛАВНОЕ МЕНЮ', () => {
      if (leaving) return;
      leaving = true;
      goToMainMenu(this);
    }).setDepth(2);

    this.input.keyboard?.on('keydown-ESC', () => {
      if (leaving) return;
      if (this.scene.isActive('SaveSlotsScene') || this.scene.isActive('SettingsScene')) return;
      if (this.scene.isSleeping('SettingsScene')) return;
      this.scene.resume('GameScene');
      this.scene.stop();
    });
  }
}
