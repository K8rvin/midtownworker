import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { ShopManager, ShopConfig } from '../systems/ShopManager';
import weaponsData from '../data/weapons.json';
import vehiclesData from '../data/vehicles.json';

export class ShopUI {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private visible = false;
  private escHandler?: () => void;

  constructor(
    private scene: Phaser.Scene,
    private shopManager: ShopManager,
    private onBuy: (type: string, id: string) => string | null,
    private onClose: () => void
  ) {}

  show(shop: ShopConfig): void {
    this.hide();
    this.visible = true;
    const depth = 200;

    const overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
      .setScrollFactor(0)
      .setDepth(depth);
    this.objects.push(overlay);

    const bg = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 440, 0x0d0d14, 0.98)
      .setStrokeStyle(2, 0xc8f542)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.objects.push(bg);

    const title = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 165, shop.name, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.objects.push(title);

    if (shop.type === 'weapon' && shop.items) {
      let row = 0;
      shop.items.forEach((itemId) => {
        const w = weaponsData.find((w) => w.id === itemId);
        if (!w) return;
        this.addButton(GAME_HEIGHT / 2 - 120 + row * 48, `${w.name} — $${w.price}`, depth, () =>
          this.onBuy('weapon', itemId)
        );
        row++;
      });
      const ammoPacks = this.shopManager.getAmmoPacksForOwnedWeapons();
      ammoPacks.forEach((pack) => {
        this.addButton(GAME_HEIGHT / 2 - 120 + row * 48, `${pack.label} — $${pack.price}`, depth, () =>
          this.onBuy('ammo', pack.ammoType)
        );
        row++;
      });
    }

    if (shop.type === 'vehicle' && shop.items) {
      shop.items.forEach((itemId, i) => {
        const v = vehiclesData.find((v) => v.id === itemId);
        if (!v) return;
        this.addButton(GAME_HEIGHT / 2 - 90 + i * 55, `${v.name} — $${v.price}`, depth, () =>
          this.onBuy('vehicle', itemId)
        );
      });
    }

    if (shop.type === 'hospital') {
      this.addButton(GAME_HEIGHT / 2 - 50, `Лечение — $${shop.healPrice ?? 200}`, depth, () =>
        this.onBuy('heal', '')
      );
    }

    const closeBtn = this.addButton(GAME_HEIGHT / 2 + 155, '[ Esc ] Закрыть', depth, () => this.close());
    void closeBtn;

    this.escHandler = () => this.close();
    this.scene.input.keyboard?.on('keydown-ESC', this.escHandler);
  }

  close(): void {
    if (!this.visible) return;
    this.hide();
    this.onClose();
  }

  hide(): void {
    this.visible = false;
    if (this.escHandler) {
      this.scene.input.keyboard?.off('keydown-ESC', this.escHandler);
      this.escHandler = undefined;
    }
    for (const obj of this.objects) obj.destroy();
    this.objects = [];
  }

  isVisible(): boolean {
    return this.visible;
  }

  private addButton(y: number, label: string, depth: number, action: () => void): Phaser.GameObjects.Rectangle {
    const text = this.scene.add
      .text(GAME_WIDTH / 2, y, label, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.objects.push(text);

    const btn = this.scene.add
      .rectangle(GAME_WIDTH / 2, y, 380, 42, 0x1a1a2e, 0.01)
      .setStrokeStyle(1, 0xc8f542)
      .setScrollFactor(0)
      .setDepth(depth + 3)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStrokeStyle(2, 0x00e676));
    btn.on('pointerout', () => btn.setStrokeStyle(1, 0xc8f542));
    btn.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      action();
    });
    this.objects.push(btn);
    return btn;
  }
}