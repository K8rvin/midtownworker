import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, type GameState } from '../config';
import {
  CAFE_ITEMS,
  PHARMACY_ITEMS,
  type ShopConfig,
  type ShopManager,
} from '../systems/ShopManager';

export type ServiceShopType = 'pharmacy' | 'cafe' | 'pawn';

export class ServiceShopUI {
  private nodes: Phaser.GameObjects.GameObject[] = [];
  private visible = false;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private shops: ShopManager,
    private shop: ShopConfig,
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

  private titleFor(): string {
    if (this.shop.type === 'pharmacy') return '💊 АПТЕКА';
    if (this.shop.type === 'cafe') return '☕ КАФЕ';
    return '💎 ЛОМБАРД';
  }

  private render(): void {
    this.clear();
    const d = 212;
    const overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(d)
      .setInteractive();
    this.nodes.push(overlay);

    const panel = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 460, 440, 0x0d0d14, 0.98)
      .setStrokeStyle(2, 0xc8f542, 0.55)
      .setScrollFactor(0)
      .setDepth(d + 1);
    this.nodes.push(panel);

    const title = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 185, this.titleFor(), {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);
    this.nodes.push(title);

    const sub = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 155, `${this.shop.name} · $${this.state.money}`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#9ca3af',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);
    this.nodes.push(sub);

    const actions: { label: string; fn: () => void }[] = [];

    if (this.shop.type === 'pharmacy') {
      for (const item of PHARMACY_ITEMS) {
        const price = item.id === 'full_heal' ? (this.shop.healPrice ?? item.price) : item.price;
        const detail = item.heal
          ? item.heal >= 999
            ? 'полное HP'
            : `+${item.heal} HP`
          : item.sleep
            ? `+${item.sleep} сон`
            : '';
        actions.push({
          label: `${item.name} · $${price}${detail ? ` (${detail})` : ''}`,
          fn: () => {
            const err = this.shops.buyPharmacy(item.id, this.shop.healPrice);
            this.act(err, err ? '' : `${item.name}: готово`);
          },
        });
      }
    } else if (this.shop.type === 'cafe') {
      for (const item of CAFE_ITEMS) {
        actions.push({
          label: `${item.name} · $${item.price} (+${item.hunger} голод)`,
          fn: () => {
            const err = this.shops.buyCafe(item.id);
            this.act(err, err ? '' : `${item.name}: приятного аппетита`);
          },
        });
      }
    } else if (this.shop.type === 'pawn') {
      const furn = this.shops.listPawnableFurniture();
      const vehs = this.shops.listPawnableVehicles();
      if (furn.length === 0 && vehs.length === 0) {
        actions.push({
          label: 'Нечего сдавать (мебель со склада / авто)',
          fn: () => this.onMessage('Принесите нерасставленную мебель или авто из гаража'),
        });
      }
      for (const f of furn) {
        actions.push({
          label: `Сдать: ${f.name} → $${f.offer}`,
          fn: () => {
            const err = this.shops.pawnSellFurniture(f.id);
            this.act(err, err ? '' : `Сдано ${f.name} · +$${f.offer}`);
          },
        });
      }
      for (const v of vehs) {
        actions.push({
          label: `Сдать: ${v.name} → $${v.offer}`,
          fn: () => {
            const err = this.shops.pawnSellVehicle(v.id);
            this.act(err, err ? '' : `Сдано ${v.name} · +$${v.offer}`);
          },
        });
      }
    }

    actions.slice(0, 10).forEach((a, i) => {
      const btn = this.scene.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110 + i * 34, a.label, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#c8f542',
          backgroundColor: '#1a1a2e',
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(d + 2)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', a.fn);
      this.nodes.push(btn);
    });

    const close = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 185, '[Esc] Закрыть', {
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
    else if (ok) this.onMessage(ok);
    this.render();
  }
}
