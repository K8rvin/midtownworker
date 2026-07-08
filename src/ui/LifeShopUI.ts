import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { GroceryManager } from '../systems/GroceryManager';

export class LifeShopUI {
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private visible = false;

  constructor(
    private scene: Phaser.Scene,
    private grocery: GroceryManager,
    private shopType: 'grocery' | 'furniture',
    private onBuy: (id: string) => string | null,
    private onEat: (id: string) => string | null,
    private onMessage: (msg: string) => void,
    private onClose: () => void
  ) {}

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.render();
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

  private handleResult(err: string | null, okMsg: string): void {
    if (err) this.onMessage(err);
    else {
      this.onMessage(okMsg);
      this.render();
    }
  }

  private render(): void {
    this.clear();
    const depth = 210;
    this.overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(depth)
      .setInteractive();

    const title = this.shopType === 'grocery' ? 'СУПЕРМАРКЕТ' : 'МЕБЕЛЬНЫЙ МАГАЗИН';
    const header = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 220, title, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.rows.push(header);

    if (this.shopType === 'grocery') {
      const cap = this.grocery.getFoodCapacity();
      const stock = this.grocery.getFoodStockSummary();
      const sub = this.scene.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2 - 188,
          cap > 0 ? `Запасы дома: ${stock}` : 'Без холодильника — только «Съесть здесь»',
          {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#9ca3af',
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 1);
      this.rows.push(sub);
    } else {
      const sub = this.scene.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 188, 'Купленную мебель ставьте в доме', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#9ca3af',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 1);
      this.rows.push(sub);
    }

    if (this.shopType === 'grocery') {
      this.grocery.getGroceries().forEach((item, i) => {
        const y = GAME_HEIGHT / 2 - 148 + i * 52;
        const label = this.scene.add
          .text(GAME_WIDTH / 2 - 200, y - 8, `${item.name} — $${item.price}`, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#e5e7eb',
          })
          .setScrollFactor(0)
          .setDepth(depth + 1);
        const hint = this.scene.add
          .text(GAME_WIDTH / 2 - 200, y + 10, `+${item.hunger} голод`, {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#6b7280',
          })
          .setScrollFactor(0)
          .setDepth(depth + 1);
        this.rows.push(label, hint);
        const buy = this.makeButton(GAME_WIDTH / 2 + 80, y, 'Домой', depth, () => {
          this.handleResult(this.onBuy(item.id), `В запасы: ${item.name}`);
        });
        const eat = this.makeButton(GAME_WIDTH / 2 + 170, y, 'Съесть', depth, () => {
          this.handleResult(this.onEat(item.id), `Съели ${item.name} (+${item.hunger} голод)`);
        });
        this.rows.push(buy, eat);
      });
    } else {
      this.grocery.getFurniture().forEach((item, i) => {
        const y = GAME_HEIGHT / 2 - 148 + i * 52;
        const isOwned = this.grocery.ownsFurniture(item.id);
        const detail = this.grocery.getFurnitureBonusText(item);
        const label = this.scene.add
          .text(GAME_WIDTH / 2 - 200, y - 8, `${item.name} — $${item.price}`, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: isOwned ? '#6b7280' : '#e5e7eb',
          })
          .setScrollFactor(0)
          .setDepth(depth + 1);
        const hint = this.scene.add
          .text(GAME_WIDTH / 2 - 200, y + 10, isOwned ? 'уже куплено' : detail, {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#6b7280',
          })
          .setScrollFactor(0)
          .setDepth(depth + 1);
        this.rows.push(label, hint);
        if (!isOwned) {
          const buy = this.makeButton(GAME_WIDTH / 2 + 140, y, 'Купить', depth, () => {
            this.handleResult(this.onBuy(item.id), `Куплено: ${item.name}`);
          });
          this.rows.push(buy);
        }
      });
    }

    const close = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 200, 'Esc — закрыть', {
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

  private makeButton(
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
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', action);
    return btn;
  }
}