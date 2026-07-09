import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { SaveManager, type SaveSlotMeta } from '../systems/SaveManager';
import { getAudio } from '../systems/AudioManager';
import { stopGameplayScenes } from '../systems/SceneNav';
import {
  createMenuBackdrop,
  createMenuButton,
  createMenuPanel,
} from '../ui/MenuTheme';

export type SaveSlotsMode = 'load' | 'save' | 'new';

export interface SaveSlotsSceneData {
  mode: SaveSlotsMode;
  /** When mode=save, current game state is provided by Pause/Game. */
  getState?: () => import('../config').GameState;
  returnScene?: string;
  /** If returning to pause after save. */
  resumePause?: boolean;
}

/**
 * Three save slots: load / new-game overwrite / save from pause.
 */
export class SaveSlotsScene extends Phaser.Scene {
  private mode: SaveSlotsMode = 'load';
  private getState?: () => import('../config').GameState;
  private returnScene = 'MainMenuScene';
  private resumePause = false;

  constructor() {
    super({ key: 'SaveSlotsScene' });
  }

  init(data: SaveSlotsSceneData): void {
    this.mode = data.mode ?? 'load';
    this.getState = data.getState;
    this.returnScene = data.returnScene ?? 'MainMenuScene';
    this.resumePause = data.resumePause ?? false;
  }

  create(): void {
    getAudio(this).ensureContext();
    createMenuBackdrop(this, 0.94);
    createMenuPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 520).setDepth(1);

    const titles: Record<SaveSlotsMode, string> = {
      load: 'ЗАГРУЗИТЬ',
      save: 'СОХРАНИТЬ',
      new: 'НОВАЯ ИГРА — ЯЧЕЙКА',
    };
    const hints: Record<SaveSlotsMode, string> = {
      load: 'Выберите ячейку для продолжения',
      save: 'Куда записать текущий прогресс',
      new: 'Свободная ячейка или перезапись',
    };

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 220, titles[this.mode], {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#c8f542',
        stroke: '#0a0a12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 185, hints[this.mode], {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#9ca3af',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const slots = SaveManager.listSlots();
    const startY = GAME_HEIGHT / 2 - 120;
    slots.forEach((meta, i) => {
      this.drawSlot(meta, startY + i * 100);
    });

    createMenuButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 210, 'НАЗАД', () => this.goBack(), 320, 44).setDepth(
      2
    );

    this.input.keyboard?.once('keydown-ESC', () => this.goBack());
  }

  private drawSlot(meta: SaveSlotMeta, y: number): void {
    const active = SaveManager.getActiveSlot() === meta.slot && !meta.empty;
    const w = 440;
    const h = 84;
    const bg = this.add
      .rectangle(GAME_WIDTH / 2, y, w, h, 0x10101a, 0.95)
      .setStrokeStyle(2, active ? 0xff2d55 : 0xc8f542, active ? 0.9 : 0.4)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    const title = meta.empty
      ? `Ячейка ${meta.slot + 1} — пусто`
      : `Ячейка ${meta.slot + 1}${active ? ' · текущая' : ''}`;

    this.add
      .text(GAME_WIDTH / 2 - w / 2 + 16, y - 22, title, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: meta.empty ? '#6b7280' : '#c8f542',
      })
      .setDepth(3);

    this.add
      .text(GAME_WIDTH / 2 - w / 2 + 16, y + 2, meta.summary, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#9ca3af',
        wordWrap: { width: w - 120 },
      })
      .setDepth(3);

    if (!meta.empty) {
      this.add
        .text(GAME_WIDTH / 2 - w / 2 + 16, y + 24, meta.homeLabel, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#6b7280',
        })
        .setDepth(3);
    }

    const actionLabel =
      this.mode === 'load' ? (meta.empty ? '—' : 'Загрузить') : this.mode === 'save' ? 'Записать' : meta.empty ? 'Начать' : 'Перезаписать';

    if (!(this.mode === 'load' && meta.empty)) {
      const actionBtn = this.add
        .text(GAME_WIDTH / 2 + w / 2 - 16, y, actionLabel, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: this.mode === 'new' && !meta.empty ? '#ff6b6b' : '#00e676',
          backgroundColor: '#1a1a2e',
          padding: { x: 10, y: 6 },
        })
        .setOrigin(1, 0.5)
        .setDepth(3)
        .setInteractive({ useHandCursor: true });

      actionBtn.on('pointerdown', () => this.onSlotAction(meta));
    }

    bg.on('pointerover', () => bg.setStrokeStyle(2, 0xff2d55, 1));
    bg.on('pointerout', () =>
      bg.setStrokeStyle(2, active ? 0xff2d55 : 0xc8f542, active ? 0.9 : 0.4)
    );
    bg.on('pointerdown', () => {
      if (this.mode === 'load' && meta.empty) return;
      this.onSlotAction(meta);
    });
  }

  private onSlotAction(meta: SaveSlotMeta): void {
    getAudio(this).playSfx('ui');

    if (this.mode === 'load') {
      if (meta.empty) return;
      SaveManager.setActiveSlot(meta.slot);
      stopGameplayScenes(this);
      getAudio(this).stopMusic();
      this.scene.start('GameScene', { loadSave: true, saveSlot: meta.slot });
      return;
    }

    if (this.mode === 'new') {
      if (!meta.empty) {
        const ok = window.confirm(
          `Ячейка ${meta.slot + 1} занята:\n${meta.summary}\n\nПерезаписать и начать новую игру?`
        );
        if (!ok) return;
      }
      SaveManager.clearSlot(meta.slot);
      SaveManager.setActiveSlot(meta.slot);
      stopGameplayScenes(this);
      getAudio(this).stopMusic();
      this.scene.start('GameScene', { loadSave: false, saveSlot: meta.slot });
      return;
    }

    // save
    const state = this.getState?.();
    if (!state) {
      window.alert('Нет данных для сохранения');
      return;
    }
    if (!meta.empty) {
      const ok = window.confirm(`Перезаписать ячейку ${meta.slot + 1}?\n${meta.summary}`);
      if (!ok) return;
    }
    SaveManager.saveToSlot(meta.slot, state);
    window.alert(`Сохранено в ячейку ${meta.slot + 1}`);
    this.goBack();
  }

  private goBack(): void {
    if (this.resumePause) {
      this.scene.stop();
      // Re-open pause; GameScene remains paused
      if (!this.scene.isActive('PauseScene')) {
        this.scene.launch('PauseScene');
      }
      return;
    }
    this.scene.start(this.returnScene);
  }
}
