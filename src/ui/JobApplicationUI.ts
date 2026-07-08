import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { JobManager, JobConfig } from '../systems/JobManager';

export type JobBoardSource = 'phone' | 'laptop' | 'office';

export class JobApplicationUI {
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private visible = false;

  constructor(
    private scene: Phaser.Scene,
    private jobManager: JobManager,
    private onApply: (job: JobConfig) => string | null,
    private onQuit: () => void,
    private onMessage: (msg: string) => void,
    private onClose: () => void
  ) {}

  show(source: JobBoardSource): void {
    if (this.visible) return;
    this.visible = true;
    this.render(source);
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

  private render(source: JobBoardSource): void {
    this.clear();
    const depth = 215;
    this.overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive();

    const sourceLabel =
      source === 'phone' ? '📱 Телефон' : source === 'laptop' ? '💻 Ноутбук' : '🏢 Офис занятости';
    const header = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 240, 'ВАКАНСИИ', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    const sub = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 210, `${sourceLabel} · одна работа одновременно`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#9ca3af',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.rows.push(header, sub);

    const cur = this.jobManager.getCurrentJob();
    const current = cur
      ? this.scene.add
          .text(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2 - 180,
            `Сейчас: ${cur.name} (${this.payLabel(cur.id, cur.salary)})`,
            {
              fontFamily: 'monospace',
              fontSize: '13px',
              color: '#ffd600',
            }
          )
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(depth + 1)
      : null;
    if (current) this.rows.push(current);

    const jobs = this.jobManager.jobs;
    jobs.forEach((job, i) => {
      const y = GAME_HEIGHT / 2 - 140 + i * 58;
      const violent = job.violent ? ' · ⚠ оружие' : '';
      const remote = job.remote ? ' · удалёнка' : '';
      const employed = cur?.id === job.id;
      const payLabel = this.payLabel(job.id, job.salary, job.jobType);
      const label = this.scene.add
        .text(GAME_WIDTH / 2 - 220, y - 10, `${job.name} — ${payLabel}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: employed ? '#7ee787' : '#e5e7eb',
        })
        .setScrollFactor(0)
        .setDepth(depth + 1);
      const hint = this.scene.add
        .text(GAME_WIDTH / 2 - 220, y + 12, `${job.employer}${remote}${violent}`, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#6b7280',
        })
        .setScrollFactor(0)
        .setDepth(depth + 1);
      this.rows.push(label, hint);

      if (employed) {
        const quitBtn = this.makeBtn(GAME_WIDTH / 2 + 150, y, 'Уволиться', depth, () => {
          this.onQuit();
          this.onMessage('Вы уволились');
          this.close();
        });
        this.rows.push(quitBtn);
      } else if (!this.jobManager.hasJob()) {
        const applyBtn = this.makeBtn(GAME_WIDTH / 2 + 150, y, 'Устроиться', depth, () => {
          const err = this.onApply(job);
          if (err) this.onMessage(err);
          else {
            this.onMessage(`Вы устроились: ${job.name}`);
            this.render(source);
          }
        });
        this.rows.push(applyBtn);
      }
    });

    if (this.jobManager.hasJob()) {
      const globalQuit = this.makeBtn(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 200, 'Уволиться с текущей', depth, () => {
        this.onQuit();
        this.onMessage('Вы уволились');
        this.close();
      });
      this.rows.push(globalQuit);
    }

    const close = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 240, 'Esc — закрыть', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.close());
    this.rows.push(close);
  }

  private payLabel(jobId: string, salary: number, jobType?: string): string {
    if (jobType === 'courier' || jobId === 'courier') return 'оплата за доставку';
    return `$${salary}/смена`;
  }

  private makeBtn(
    x: number,
    y: number,
    label: string,
    depth: number,
    action: () => void
  ): Phaser.GameObjects.Text {
    const btn = this.scene.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#00e676',
        backgroundColor: '#1a1a2e',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', action);
    return btn;
  }
}