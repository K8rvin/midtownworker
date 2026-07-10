import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, type GameState } from '../config';
import type { BankManager } from '../systems/BankManager';

export class BankUI {
  private nodes: Phaser.GameObjects.GameObject[] = [];
  private visible = false;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private bank: BankManager,
    private onMessage: (msg: string) => void,
    private onClose: () => void
  ) {}

  isVisible(): boolean {
    return this.visible;
  }

  show(): void {
    this.visible = true;
    this.render();
  }

  close(): void {
    this.visible = false;
    this.clear();
    this.onClose();
  }

  private clear(): void {
    for (const n of this.nodes) n.destroy();
    this.nodes = [];
  }

  private render(): void {
    this.clear();
    const d = 215;
    const overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(d)
      .setInteractive();
    this.nodes.push(overlay);

    const panel = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 440, 420, 0x0d0d14, 0.98)
      .setStrokeStyle(2, 0xffd600, 0.7)
      .setScrollFactor(0)
      .setDepth(d + 1);
    this.nodes.push(panel);

    const title = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 180, '🏦 БАНК', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#ffd600',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);
    this.nodes.push(title);

    const b = this.state.bank;
    const status = this.scene.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 140,
        `Наличные: $${this.state.money}\nВклад: $${b.deposit}\nКредит: $${b.loanRemaining}` +
          (b.loanRemaining > 0 ? ` (платёж $${b.loanPayment} до дн.${b.loanDueDay})` : '') +
          `\nЛимит кредита: $${this.bank.maxLoan()}`,
        {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#9ca3af',
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);
    this.nodes.push(status);

    const actions: { label: string; fn: () => void }[] = [
      {
        label: 'Вклад $50',
        fn: () => this.act(this.bank.deposit(50), 'Внесено $50 на вклад'),
      },
      {
        label: 'Вклад $200',
        fn: () => this.act(this.bank.deposit(200), 'Внесено $200 на вклад'),
      },
      {
        label: 'Снять $50',
        fn: () => this.act(this.bank.withdraw(50), 'Снято $50'),
      },
      {
        label: 'Снять всё',
        fn: () => {
          const all = this.state.bank.deposit;
          this.act(this.bank.withdraw(all), all > 0 ? `Снято $${all}` : 'Вклад пуст');
        },
      },
      {
        label: `Кредит $200`,
        fn: () => this.act(this.bank.takeLoan(200), 'Кредит $200 получен'),
      },
      {
        label: `Кредит $500`,
        fn: () => this.act(this.bank.takeLoan(500), 'Кредит $500 получен'),
      },
      {
        label: 'Погасить платёж',
        fn: () => {
          const p = this.state.bank.loanPayment || this.state.bank.loanRemaining;
          this.act(this.bank.repayLoan(p), `Внесено $${p} по кредиту`);
        },
      },
      {
        label: 'Погасить весь долг',
        fn: () => {
          const p = this.state.bank.loanRemaining;
          this.act(this.bank.repayLoan(p), p > 0 ? 'Кредит закрыт' : 'Нет долга');
        },
      },
    ];

    actions.forEach((a, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const btn = this.scene.add
        .text(GAME_WIDTH / 2 - 100 + col * 200, GAME_HEIGHT / 2 - 40 + row * 42, a.label, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#c8f542',
          backgroundColor: '#1a1a2e',
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(d + 2)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', a.fn);
      this.nodes.push(btn);
    });

    const close = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 175, '[Esc] Закрыть', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.close());
    this.nodes.push(close);
  }

  private act(err: string | null, ok: string): void {
    if (err) this.onMessage(err);
    else this.onMessage(ok);
    this.render();
  }
}
