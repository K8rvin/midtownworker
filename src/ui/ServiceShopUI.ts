import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, type GameState } from '../config';
import {
  CAFE_ITEMS,
  PHARMACY_ITEMS,
  type ShopConfig,
  type ShopManager,
} from '../systems/ShopManager';

/** Optional vehicle helpers (gas / garage need the car the player is in). */
export interface ServiceVehicleApi {
  inVehicle: () => boolean;
  hp: () => number;
  maxHp: () => number;
  fuel?: () => number;
  maxFuel?: () => number;
  refuel?: (amount: number | 'full') => void;
  repair: (amount: number | 'full') => void;
  wash: () => void;
}

export class ServiceShopUI {
  private nodes: Phaser.GameObjects.GameObject[] = [];
  private visible = false;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private shops: ShopManager,
    private shop: ShopConfig,
    private onMessage: (msg: string) => void,
    private onClose: () => void,
    private vehicle: ServiceVehicleApi | null = null
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
    switch (this.shop.type) {
      case 'pharmacy':
        return '💊 АПТЕКА';
      case 'cafe':
        return '☕ КАФЕ';
      case 'pawn':
        return '💎 ЛОМБАРД';
      case 'laundry':
        return '🧺 ПРАЧЕЧНАЯ';
      case 'hotel':
        return '🛏 ХОСТЕЛ';
      case 'post':
        return '✉ ПОЧТА';
      case 'gym':
        return '🏋 СПОРТЗАЛ';
      case 'gas':
        return '⛽ АЗС';
      case 'garage':
        return '🔧 АВТОСЕРВИС';
      case 'insurance':
        return '🛡 СТРАХОВКА';
      case 'casino':
        return '🎰 КАЗИНО';
      default:
        return this.shop.name;
    }
  }

  private render(): void {
    this.clear();
    const d = 212;
    const overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.62)
      .setScrollFactor(0)
      .setDepth(d)
      .setInteractive();
    this.nodes.push(overlay);

    // Soft glow frame behind panel
    const glow = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 476, 456, 0xc8f542, 0.08)
      .setScrollFactor(0)
      .setDepth(d + 1);
    this.nodes.push(glow);

    const panel = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 468, 448, 0x0d0d14, 0.98)
      .setStrokeStyle(2, 0xc8f542, 0.7)
      .setScrollFactor(0)
      .setDepth(d + 2);
    this.nodes.push(panel);

    const accent = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, 420, 3, 0xc8f542, 0.85)
      .setScrollFactor(0)
      .setDepth(d + 3);
    this.nodes.push(accent);

    const title = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 185, this.titleFor(), {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 3);
    this.nodes.push(title);

    const sub = this.scene.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 155,
        `${this.shop.name} · $${this.state.money} · HP ${Math.round(this.state.health)} · сон ${Math.round(this.state.sleep)}`,
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#9ca3af',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 3);
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
    } else if (this.shop.type === 'laundry') {
      const clean = Math.round(this.state.taxiCarCleanliness ?? 100);
      actions.push({
        label: `Помыть авто · $12 (сейчас ${clean}%)`,
        fn: () => {
          const err = this.shops.laundryWashCar();
          this.act(err, err ? '' : 'Авто вымыто (100%)');
        },
      });
      actions.push({
        label: 'Стирка · $18 (+сон, −алкоголь)',
        fn: () => {
          const err = this.shops.laundryWashClothes();
          this.act(err, err ? '' : 'Одежда чистая, стало легче');
        },
      });
    } else if (this.shop.type === 'hotel') {
      actions.push({
        label: 'Койка · $35 (≈3ч, +35 сон)',
        fn: () => {
          const err = this.shops.hotelRest('cheap');
          this.act(err, err ? '' : 'Отдохнули в хостеле');
        },
      });
      actions.push({
        label: 'Комната · $65 (≈5ч, +60 сон, +HP)',
        fn: () => {
          const err = this.shops.hotelRest('normal');
          this.act(err, err ? '' : 'Выспались в номере');
        },
      });
    } else if (this.shop.type === 'post') {
      actions.push({
        label: 'Марки / конверты · $8',
        fn: () => {
          const err = this.shops.postBuyStamps();
          this.act(err, err ? '' : 'Купили марки');
        },
      });
      actions.push({
        label:
          (this.state.billsOwed ?? 0) > 0
            ? `Оплатить ЖКХ · $${this.state.billsOwed}`
            : 'Предоплата счетов · $40 (+аренда/срок)',
        fn: () => {
          const err = this.shops.postPayBills();
          this.act(err, err ? '' : 'Счета оплачены');
        },
      });
      actions.push({
        label: 'Отправить посылку · $22',
        fn: () => {
          const err = this.shops.postSendParcel();
          this.act(err, err ? '' : 'Посылка отправлена');
        },
      });
    } else if (this.shop.type === 'gym') {
      actions.push({
        label: 'Тренировка · $28 (+HP, −голод/сон)',
        fn: () => {
          const err = this.shops.gymWorkout();
          this.act(err, err ? '' : 'Хорошая тренировка');
        },
      });
      actions.push({
        label: 'Сауна · $20 (+сон, −алкоголь)',
        fn: () => {
          const err = this.shops.gymSauna();
          this.act(err, err ? '' : 'Расслабились в сауне');
        },
      });
    } else if (this.shop.type === 'gas') {
      const hasCar = this.vehicle?.inVehicle() ?? false;
      const fuel = this.vehicle?.fuel?.() ?? 0;
      const maxFuel = this.vehicle?.maxFuel?.() ?? 100;
      const hp = this.vehicle?.hp() ?? 0;
      const max = this.vehicle?.maxHp() ?? 0;
      actions.push({
        label: hasCar
          ? `Полный бак · $35 (⛽ ${Math.round(fuel)}/${maxFuel})`
          : 'Полный бак · $35 (машина у колонки / E с авто)',
        fn: () => {
          if (!this.vehicle?.inVehicle()) {
            this.onMessage('Подъедьте на машине (E у АЗС) или оставьте её у входа');
            return;
          }
          const cost = 35;
          if (this.state.money < cost) {
            this.onMessage(`Нужно $${cost}`);
            return;
          }
          this.state.money -= cost;
          this.vehicle.refuel?.('full');
          this.act(null, 'Бак полный');
        },
      });
      actions.push({
        label: hasCar
          ? `Комплекс · $55 (бак + мойка + HP ${Math.round(hp)}/${max})`
          : 'Комплекс · $55 (нужна машина)',
        fn: () => {
          if (!this.vehicle?.inVehicle()) {
            this.onMessage('Подъедьте на машине (E у АЗС) или оставьте её у входа');
            return;
          }
          const cost = 55;
          if (this.state.money < cost) {
            this.onMessage(`Нужно $${cost}`);
            return;
          }
          this.state.money -= cost;
          this.vehicle.refuel?.('full');
          this.vehicle.repair(Math.ceil(this.vehicle.maxHp() * 0.25));
          this.vehicle.wash();
          this.act(null, 'Заправлено, подлатали, вымыли');
        },
      });
      actions.push({
        label: 'Снэк с полки · $16 (+голод)',
        fn: () => {
          const err = this.shops.gasSnack();
          this.act(err, err ? '' : 'Перекусили на АЗС');
        },
      });
    } else if (this.shop.type === 'garage') {
      const hasCar = this.vehicle?.inVehicle() ?? false;
      const hp = this.vehicle?.hp() ?? 0;
      const max = this.vehicle?.maxHp() ?? 0;
      actions.push({
        label: hasCar
          ? `Полный ремонт · $90 (HP ${Math.round(hp)}/${max})`
          : 'Полный ремонт · $90 (машина у бокса / E с авто)',
        fn: () => {
          if (!this.vehicle?.inVehicle()) {
            this.onMessage('Подгоните машину к сервису (E с авто или рядом с входом)');
            return;
          }
          const cost = 90;
          if (this.state.money < cost) {
            this.onMessage(`Нужно $${cost}`);
            return;
          }
          this.state.money -= cost;
          this.vehicle.repair('full');
          this.act(null, 'Машина как новая');
        },
      });
      actions.push({
        label: hasCar
          ? 'Частичный ремонт · $45 (+40% HP)'
          : 'Частичный ремонт · $45 (нужна машина рядом)',
        fn: () => {
          if (!this.vehicle?.inVehicle()) {
            this.onMessage('Подгоните машину к сервису (E с авто или рядом с входом)');
            return;
          }
          const cost = 45;
          if (this.state.money < cost) {
            this.onMessage(`Нужно $${cost}`);
            return;
          }
          this.state.money -= cost;
          this.vehicle.repair(Math.ceil(this.vehicle.maxHp() * 0.4));
          this.act(null, 'Подлатали кузов');
        },
      });
    } else if (this.shop.type === 'insurance') {
      actions.push({
        label: `Статус: ${this.shops.insuranceStatus()}`,
        fn: () => this.onMessage(this.shops.insuranceStatus()),
      });
      actions.push({
        label: 'Полис 7 дней · $120 (штраф −60%)',
        fn: () => {
          const err = this.shops.buyInsurance('week');
          this.act(err, err ? '' : `Страховка до дня ${this.state.insuranceUntilDay}`);
        },
      });
      actions.push({
        label: 'Полис 30 дней · $320 (штраф −60%)',
        fn: () => {
          const err = this.shops.buyInsurance('month');
          this.act(err, err ? '' : `Страховка до дня ${this.state.insuranceUntilDay}`);
        },
      });
    } else if (this.shop.type === 'casino') {
      const dayBet =
        this.state.casinoDay === this.state.day ? this.state.casinoDayBet ?? 0 : 0;
      const left = Math.max(0, 500 - dayBet);
      actions.push({
        label: `Лимит дня: $${left} / $500`,
        fn: () => this.onMessage(left <= 0 ? 'Лимит ставок на сегодня исчерпан' : `Можно поставить ещё $${left}`),
      });
      for (const amount of [20, 50, 100]) {
        actions.push({
          label: `Ставка $${amount} (×2, ~45%)`,
          fn: () => {
            const r = this.shops.casinoBet(amount);
            if (r.err) {
              this.onMessage(r.err);
              return;
            }
            if (r.won) this.onMessage(`Выигрыш! +$${r.payout}`);
            else this.onMessage(`Проигрыш −$${amount}`);
            this.render();
          },
        });
      }
    }

    actions.slice(0, 10).forEach((a, i) => {
      const btn = this.scene.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110 + i * 34, a.label, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#e8ff8a',
          backgroundColor: '#16162a',
          padding: { x: 14, y: 7 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(d + 3)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setStyle({ color: '#0d0d14', backgroundColor: '#c8f542' }));
      btn.on('pointerout', () => btn.setStyle({ color: '#e8ff8a', backgroundColor: '#16162a' }));
      btn.on('pointerdown', a.fn);
      this.nodes.push(btn);
    });

    const close = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 190, '[Esc] Закрыть', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#9ca3af',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 3)
      .setInteractive({ useHandCursor: true });
    close.on('pointerover', () => close.setColor('#c8f542'));
    close.on('pointerout', () => close.setColor('#9ca3af'));
    close.on('pointerdown', () => this.close());
    this.nodes.push(close);
  }

  private act(err: string | null, ok: string): void {
    if (err) this.onMessage(err);
    else if (ok) this.onMessage(ok);
    this.render();
  }
}
