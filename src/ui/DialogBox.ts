import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { DialogueLine } from '../types/dialogue';

export class DialogBox {
  private bg: Phaser.GameObjects.Rectangle | null = null;
  private speakerLabel: Phaser.GameObjects.Text | null = null;
  private label: Phaser.GameObjects.Text | null = null;
  private hint: Phaser.GameObjects.Text | null = null;
  private hitZone: Phaser.GameObjects.Rectangle | null = null;
  private closeHandler?: () => void;
  private lines: DialogueLine[] = [];
  private lineIndex = 0;
  private onComplete?: () => void;

  show(scene: Phaser.Scene, text: string, onClose?: () => void): void {
    this.showSequence(scene, [{ speaker: '', text }], onClose);
  }

  showSequence(scene: Phaser.Scene, lines: DialogueLine[], onComplete?: () => void): void {
    this.hide();
    this.lines = lines.filter((l) => l.text.trim().length > 0);
    this.lineIndex = 0;
    this.onComplete = onComplete;
    if (this.lines.length === 0) {
      onComplete?.();
      return;
    }
    this.renderLine(scene);
  }

  private renderLine(scene: Phaser.Scene): void {
    this.destroyVisuals();

    const line = this.lines[this.lineIndex];
    const depth = 250;
    const isLast = this.lineIndex >= this.lines.length - 1;

    this.hitZone = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.01)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    this.bg = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 120, 700, 110, 0x0d0d14, 0.95)
      .setStrokeStyle(2, 0xc8f542)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    if (line.speaker) {
      this.speakerLabel = scene.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 168, line.speaker, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#ffd600',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 2);
    }

    this.label = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 132, line.text, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#c8f542',
        wordWrap: { width: 660 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);

    this.hint = scene.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 58,
        isLast ? 'Кликните или нажмите E / Esc' : 'Далее — клик / E / Esc',
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#6b7280',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);

    this.closeHandler = () => this.advance(scene);
    this.hitZone.on('pointerdown', this.closeHandler);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', this.closeHandler);
    scene.input.keyboard?.once('keydown-E', this.closeHandler);
    scene.input.keyboard?.once('keydown-ESC', this.closeHandler);
  }

  private advance(scene: Phaser.Scene): void {
    if (this.lineIndex < this.lines.length - 1) {
      this.lineIndex++;
      this.renderLine(scene);
      return;
    }
    const done = this.onComplete;
    this.hide();
    done?.();
  }

  hide(): void {
    if (this.closeHandler) {
      this.hitZone?.off('pointerdown', this.closeHandler);
      this.bg?.off('pointerdown', this.closeHandler);
      this.closeHandler = undefined;
    }
    this.destroyVisuals();
    this.lines = [];
    this.lineIndex = 0;
    this.onComplete = undefined;
  }

  private destroyVisuals(): void {
    this.hitZone?.destroy();
    this.bg?.destroy();
    this.speakerLabel?.destroy();
    this.label?.destroy();
    this.hint?.destroy();
    this.hitZone = null;
    this.bg = null;
    this.speakerLabel = null;
    this.label = null;
    this.hint = null;
  }

  isVisible(): boolean {
    return this.bg !== null;
  }
}