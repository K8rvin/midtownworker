import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { getAudio } from '../systems/AudioManager';
import {
  ControlSettings,
  DEFAULT_CONTROL_SETTINGS,
  type MobileControlMode,
} from '../systems/ControlSettings';
import { CloudSaveManager } from '../systems/CloudSaveManager';
import { AssetSettings } from '../graphics/AssetSettings';
import { createMenuBackdrop, createMenuButton, createMenuPanel } from '../ui/MenuTheme';

export class SettingsScene extends Phaser.Scene {
  private returnScene = 'MainMenuScene';
  private resumeGame = false;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data: { returnScene?: string; resumeGame?: boolean }): void {
    this.returnScene = data.returnScene ?? 'MainMenuScene';
    this.resumeGame = data.resumeGame ?? false;
  }

  create(): void {
    getAudio(this).ensureContext();
    createMenuBackdrop(this, 0.96);
    createMenuPanel(this, GAME_WIDTH / 2, 420, 540, 720);

    this.add
      .text(GAME_WIDTH / 2, 90, 'НАСТРОЙКИ', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#c8f542',
        stroke: '#0a0a12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2);

    const audio = getAudio(this);
    const audioSettings = audio.getSettings();
    const controls = ControlSettings.load();
    const assets = AssetSettings.load();

    this.createSlider('Громкость эффектов', 160, audioSettings.sfxVolume, (v) => {
      audio.updateSettings({ sfxVolume: v });
      audio.playSfx('ui');
    });

    this.createSlider('Громкость музыки', 220, audioSettings.musicVolume, (v) => {
      audio.updateSettings({ musicVolume: v });
      if (v > 0 && !audio.getSettings().muted) audio.startMusic();
      else audio.stopMusic();
    });

    createMenuButton(
      this,
      GAME_WIDTH / 2,
      280,
      audioSettings.muted ? 'ЗВУК: ВЫКЛ' : 'ЗВУК: ВКЛ',
      () => {
        const next = !audio.getSettings().muted;
        audio.updateSettings({ muted: next });
        if (next) audio.stopMusic();
        else if (audio.getSettings().musicVolume > 0) audio.startMusic();
        this.scene.restart({ returnScene: this.returnScene, resumeGame: this.resumeGame });
      },
      360
    ).setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, 330, '— УПРАВЛЕНИЕ —', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.createSlider('Чувствительность руля', 380, (controls.steerSensitivity - 0.5) / 1.5, (v) => {
      const current = ControlSettings.load();
      ControlSettings.save({ ...current, steerSensitivity: 0.5 + v * 1.5 });
    }, true);

    const mobileLabel =
      controls.mobileControls === 'auto'
        ? 'СЕНСОР: АВТО'
        : controls.mobileControls === 'on'
          ? 'СЕНСОР: ВКЛ'
          : 'СЕНСОР: ВЫКЛ';

    createMenuButton(this, GAME_WIDTH / 2, 440, mobileLabel, () => {
      const order: MobileControlMode[] = ['auto', 'on', 'off'];
      const next = order[(order.indexOf(controls.mobileControls) + 1) % order.length];
      ControlSettings.save({ ...controls, mobileControls: next });
      this.scene.restart({ returnScene: this.returnScene, resumeGame: this.resumeGame });
    }, 360).setDepth(2);

    this.add
      .text(
        GAME_WIDTH / 2,
        490,
        `Действие [${controls.keys.interact}] · Квесты [${controls.keys.questLog}] · Карта [${controls.keys.map}] · Спринт [${controls.keys.sprint}]`,
        { fontFamily: 'monospace', fontSize: '11px', color: '#9ca3af', align: 'center' }
      )
      .setOrigin(0.5)
      .setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, 540, 'СБРОСИТЬ КЛАВИШИ', () => {
      const current = ControlSettings.load();
      ControlSettings.save({
        ...current,
        keys: { ...DEFAULT_CONTROL_SETTINGS.keys },
        steerSensitivity: DEFAULT_CONTROL_SETTINGS.steerSensitivity,
      });
      this.scene.restart({ returnScene: this.returnScene, resumeGame: this.resumeGame });
    }, 360).setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, 545, '— ГРАФИКА —', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setDepth(2);

    createMenuButton(
      this,
      GAME_WIDTH / 2,
      590,
      `АССЕТЫ: ${AssetSettings.modeLabel(assets.mode)}`,
      () => {
        AssetSettings.save({ mode: AssetSettings.cycleMode(assets.mode) });
        this.scene.restart({ returnScene: this.returnScene, resumeGame: this.resumeGame });
      },
      360
    ).setDepth(2);

    this.add
      .text(
        GAME_WIDTH / 2,
        625,
        'АВТО: PNG если есть · PNG: только файлы · ПРОЦЕДУР: код',
        { fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }
      )
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, 655, '— ОБЛАЧНОЕ СОХРАНЕНИЕ —', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, 690, 'ЭКСПОРТ КОДА', () => this.exportSave(), 360).setDepth(2);
    createMenuButton(this, GAME_WIDTH / 2, 740, 'ИМПОРТ КОДА', () => this.importSave(), 360).setDepth(2);
    createMenuButton(this, GAME_WIDTH / 2, 790, 'НАЗАД', () => this.goBack(), 360).setDepth(2);

    this.input.keyboard?.once('keydown-ESC', () => this.goBack());
  }

  private createSlider(
    label: string,
    y: number,
    initial: number,
    onChange: (value: number) => void,
    isControl = false
  ): void {
    this.add
      .text(GAME_WIDTH / 2 - 210, y - 22, label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: isControl ? '#ff2d55' : '#c8f542',
      })
      .setOrigin(0, 0.5)
      .setDepth(2);

    const barX = GAME_WIDTH / 2 - 110;
    const barW = 300;
    const barH = 10;

    const track = this.add
      .rectangle(barX + barW / 2, y, barW, barH, 0x10101a)
      .setStrokeStyle(1, 0xc8f542, 0.6)
      .setDepth(2);

    const fill = this.add.rectangle(barX, y, barW * initial, barH, 0xc8f542).setOrigin(0, 0.5).setDepth(2);

    const pctText = this.add
      .text(barX + barW + 16, y, `${Math.round(initial * 100)}%`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
      })
      .setOrigin(0, 0.5)
      .setDepth(2);

    const setValue = (pointer: Phaser.Input.Pointer): void => {
      const localX = Phaser.Math.Clamp(pointer.x - barX, 0, barW);
      const value = localX / barW;
      fill.width = barW * value;
      pctText.setText(`${Math.round(value * 100)}%`);
      onChange(value);
    };

    track.setInteractive({ useHandCursor: true });
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
      this.scene.stop();
      return;
    }
    this.scene.start(this.returnScene);
  }
}