import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { LifeTaskManager } from '../systems/LifeTaskManager';

export class LifeTaskLog {
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private visible = false;

  constructor(
    private scene: Phaser.Scene,
    private lifeTasks: LifeTaskManager,
    private onStart: (id: string) => boolean,
    private onClose: () => void
  ) {}

  open(): void {
    if (this.visible) return;
    this.visible = true;
    this.render();
  }

  toggle(): void {
    if (this.visible) this.close();
    else this.open();
  }

  close(): void {
    this.visible = false;
    this.clear();
    this.onClose();
  }

  isVisible(): boolean {
    return this.visible;
  }

  private clear(): void {
    this.overlay?.destroy();
    for (const r of this.rows) r.destroy();
    this.overlay = null;
    this.rows = [];
  }

  private render(): void {
    this.clear();
    const depth = 200;
    this.overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
      .setScrollFactor(0)
      .setDepth(depth);

    const tasks = this.lifeTasks.getAvailableTasks();
    const active = this.lifeTasks.getActiveTask();

    const title = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 220, 'ДОСКА ЗАДАНИЙ', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.rows.push(title);

    if (active) {
      const a = this.scene.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 180, `Активно: ${active.title}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#00b4ff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 1);
      this.rows.push(a);
    }

    tasks.slice(0, 8).forEach((t, i) => {
      const y = GAME_HEIGHT / 2 - 130 + i * 40;
      const line = this.scene.add
        .text(GAME_WIDTH / 2 - 260, y, `${t.title} — $${t.reward}\n${t.description}`, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#9ca3af',
        })
        .setScrollFactor(0)
        .setDepth(depth + 1);
      const btn = this.scene.add
        .text(GAME_WIDTH / 2 + 220, y + 8, this.lifeTasks.getActiveTask() ? '—' : 'Взять', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: this.lifeTasks.getActiveTask() ? '#4b5563' : '#00e676',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 2);
      if (!this.lifeTasks.getActiveTask()) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          if (this.onStart(t.id)) this.close();
        });
      }
      this.rows.push(line, btn);
    });

    const hint = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 200, 'Esc — закрыть', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.rows.push(hint);
  }
}