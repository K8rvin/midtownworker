import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getAudio } from '../systems/AudioManager';
import {
  ControlSettings,
  DEFAULT_CONTROL_SETTINGS,
  type MobileControlMode,
} from '../systems/ControlSettings';
import { CloudSaveManager } from '../systems/CloudSaveManager';
import { AssetSettings } from '../graphics/AssetSettings';
import {
  createMenuBackdrop,
  createMenuButton,
  createMenuDivider,
  createMenuPanel,
  createMenuScrollArea,
} from '../ui/MenuTheme';

const PANEL_W = 540;
const SCROLL_TOP = 132;
const SCROLL_HEIGHT = 500;
const CONTENT_HEIGHT = 780;
const FOOTER_Y = GAME_HEIGHT - 52;

export class SettingsScene extends Phaser.Scene {
  private returnScene = 'MainMenuScene';
  private resumeGame = false;
  private scrollAreaDestroy?: () => void;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data: { returnScene?: string; resumeGame?: boolean }): void {
    this.returnScene = data.returnScene ?? 'MainMenuScene';
    this.resumeGame = data.resumeGame ?? false;
  }

  create(): void {
    // Clean camera left over from gameplay zoom/follow
    try {
      this.cameras.main.stopFollow();
      this.cameras.main.setZoom(1);
      this.cameras.main.setScroll(0, 0);
      this.cameras.main.setAlpha(1);
      this.cameras.main.setVisible(true);
    } catch {
      /* ignore */
    }
    this.input.enabled = true;
    this.input.setDefaultCursor('default');
    try {
      this.scene.bringToTop('SettingsScene');
    } catch {
      try {
        this.scene.bringToTop();
      } catch {
        /* ignore */
      }
    }

    try {
      getAudio(this).ensureContext();
    } catch {
      /* audio optional */
    }
    createMenuBackdrop(this, 0.98).setDepth(0);
    createMenuPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, PANEL_W, GAME_HEIGHT - 48).setDepth(1);

    this.add
      .text(GAME_WIDTH / 2, 56, 'НАСТРОЙКИ', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#c8f542',
        stroke: '#0a0a12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2);

    createMenuDivider(this, GAME_WIDTH / 2, 88, PANEL_W - 72).setDepth(2);

    const audio = getAudio(this);
    const audioSettings = audio.getSettings();
    const controls = ControlSettings.load();
    const assets = AssetSettings.load();

    const scroll = createMenuScrollArea(this, {
      x: GAME_WIDTH / 2,
      top: SCROLL_TOP,
      width: PANEL_W - 48,
      height: SCROLL_HEIGHT,
      contentHeight: CONTENT_HEIGHT,
      depth: 2,
    });
    this.scrollAreaDestroy = scroll.destroy;
    const content = scroll.content;

    let y = 24;

    y = this.addSlider(content, y, 'Громкость эффектов', audioSettings.sfxVolume, (v) => {
      audio.updateSettings({ sfxVolume: v });
      audio.playSfx('ui');
    });

    y = this.addSlider(content, y, 'Громкость музыки', audioSettings.musicVolume, (v) => {
      audio.updateSettings({ musicVolume: v });
      if (v > 0 && !audio.getSettings().muted) audio.startMusic();
      else audio.stopMusic();
    });

    y = this.addButton(
      content,
      y,
      audioSettings.muted ? 'ЗВУК: ВЫКЛ' : 'ЗВУК: ВКЛ',
      () => {
        const next = !audio.getSettings().muted;
        audio.updateSettings({ muted: next });
        if (next) audio.stopMusic();
        else if (audio.getSettings().musicVolume > 0) audio.startMusic();
        this.scene.restart({ returnScene: this.returnScene, resumeGame: this.resumeGame });
      }
    );

    y = this.addSection(content, y, 'УПРАВЛЕНИЕ');

    y = this.addSlider(
      content,
      y,
      'Чувствительность руля',
      (controls.steerSensitivity - 0.5) / 1.5,
      (v) => {
        const current = ControlSettings.load();
        ControlSettings.save({ ...current, steerSensitivity: 0.5 + v * 1.5 });
      },
      true
    );

    const mobileLabel =
      controls.mobileControls === 'auto'
        ? 'СЕНСОР: АВТО'
        : controls.mobileControls === 'on'
          ? 'СЕНСОР: ВКЛ'
          : 'СЕНСОР: ВЫКЛ';

    y = this.addButton(content, y, mobileLabel, () => {
      const order: MobileControlMode[] = ['auto', 'on', 'off'];
      const next = order[(order.indexOf(controls.mobileControls) + 1) % order.length];
      ControlSettings.save({ ...controls, mobileControls: next });
      this.scene.restart({ returnScene: this.returnScene, resumeGame: this.resumeGame });
    });

    y = this.addHint(
      content,
      y,
      `Действие [${controls.keys.interact}] · Квесты [${controls.keys.questLog}] · Карта [${controls.keys.map}] · Спринт [${controls.keys.sprint}]`
    );

    y = this.addButton(content, y, 'СБРОСИТЬ КЛАВИШИ', () => {
      const current = ControlSettings.load();
      ControlSettings.save({
        ...current,
        keys: { ...DEFAULT_CONTROL_SETTINGS.keys },
        steerSensitivity: DEFAULT_CONTROL_SETTINGS.steerSensitivity,
      });
      this.scene.restart({ returnScene: this.returnScene, resumeGame: this.resumeGame });
    });

    y = this.addSection(content, y, 'ГРАФИКА');

    y = this.addButton(content, y, `АССЕТЫ: ${AssetSettings.modeLabel(assets.mode)}`, () => {
      AssetSettings.save({ mode: AssetSettings.cycleMode(assets.mode) });
      this.scene.restart({ returnScene: this.returnScene, resumeGame: this.resumeGame });
    });

    y = this.addHint(content, y, 'АВТО: PNG если есть · PNG: только файлы · ПРОЦЕДУР: код');

    y = this.addSection(content, y, 'ОБЛАЧНОЕ СОХРАНЕНИЕ');

    y = this.addButton(content, y, 'ЭКСПОРТ КОДА', () => this.exportSave());
    this.addButton(content, y, 'ИМПОРТ КОДА', () => this.importSave());

    createMenuButton(this, GAME_WIDTH / 2, FOOTER_Y, 'НАЗАД', () => this.goBack(), 360, 44).setDepth(3);

    this.input.keyboard?.once('keydown-ESC', () => this.goBack());
  }

  shutdown(): void {
    this.scrollAreaDestroy?.();
    this.scrollAreaDestroy = undefined;
  }

  private addSection(content: Phaser.GameObjects.Container, y: number, label: string): number {
    const text = this.add
      .text(0, y, `— ${label} —`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6b7280',
      })
      .setOrigin(0.5, 0);
    content.add(text);
    return y + 36;
  }

  private addHint(content: Phaser.GameObjects.Container, y: number, text: string): number {
    const hint = this.add
      .text(0, y, text, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#9ca3af',
        align: 'center',
        wordWrap: { width: PANEL_W - 96 },
      })
      .setOrigin(0.5, 0);
    content.add(hint);
    return y + hint.height + 16;
  }

  private addButton(
    content: Phaser.GameObjects.Container,
    y: number,
    label: string,
    onClick: () => void
  ): number {
    const btn = createMenuButton(this, 0, y + 22, label, onClick, 360, 44);
    content.add(btn);
    return y + 58;
  }

  private addSlider(
    content: Phaser.GameObjects.Container,
    y: number,
    label: string,
    initial: number,
    onChange: (value: number) => void,
    isControl = false
  ): number {
    const rowY = y + 28;

    const labelText = this.add
      .text(-210, rowY - 22, label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: isControl ? '#ff2d55' : '#c8f542',
      })
      .setOrigin(0, 0.5);
    content.add(labelText);

    const barX = -110;
    const barW = 300;
    const barH = 10;

    const track = this.add
      .rectangle(barX + barW / 2, rowY, barW, barH, 0x10101a)
      .setStrokeStyle(1, 0xc8f542, 0.6)
      .setInteractive({ useHandCursor: true });
    content.add(track);

    const fill = this.add.rectangle(barX, rowY, barW * initial, barH, 0xc8f542).setOrigin(0, 0.5);
    content.add(fill);

    const pctText = this.add
      .text(barX + barW + 16, rowY, `${Math.round(initial * 100)}%`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
      })
      .setOrigin(0, 0.5);
    content.add(pctText);

    const setValue = (pointer: Phaser.Input.Pointer): void => {
      const bounds = track.getBounds();
      const localX = Phaser.Math.Clamp(pointer.x - bounds.x, 0, bounds.width);
      const value = localX / barW;
      fill.width = barW * value;
      pctText.setText(`${Math.round(value * 100)}%`);
      onChange(value);
    };

    track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      let dragging = true;
      setValue(pointer);

      const onMove = (p: Phaser.Input.Pointer) => {
        if (dragging && p.isDown) setValue(p);
      };
      const onUp = () => {
        dragging = false;
        this.input.off('pointermove', onMove);
        this.input.off('pointerup', onUp);
      };

      this.input.on('pointermove', onMove);
      this.input.on('pointerup', onUp);
    });

    return y + 64;
  }

  private exportSave(): void {
    const code = CloudSaveManager.exportBundle();
    CloudSaveManager.copyToClipboard(code).then((copied) => {
      window.prompt(
        copied ? 'Код скопирован в буфер. Сохраните его:' : 'Скопируйте код сохранения:',
        code
      );
    });
  }

  private importSave(): void {
    const raw = window.prompt('Вставьте код сохранения:');
    if (!raw) return;
    const result = CloudSaveManager.importBundle(raw);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    window.alert('Сохранение восстановлено!');
    this.scene.restart({ returnScene: this.returnScene, resumeGame: this.resumeGame });
  }

  private goBack(): void {
    if (this.resumeGame) {
      // Opened as overlay from PauseScene
      this.scene.stop('SettingsScene');
      if (this.returnScene && this.scene.isSleeping(this.returnScene)) {
        this.scene.wake(this.returnScene);
      } else if (this.returnScene && this.scene.isPaused(this.returnScene)) {
        this.scene.resume(this.returnScene);
      } else if (this.returnScene && !this.scene.isActive(this.returnScene)) {
        this.scene.launch(this.returnScene);
      }
      if (this.returnScene) this.scene.bringToTop(this.returnScene);
      return;
    }
    this.scene.start(this.returnScene || 'MainMenuScene');
  }
}