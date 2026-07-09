import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, type GameState, type NavTarget } from '../config';
import type { JobManager } from '../systems/JobManager';
import type { HousingManager } from '../systems/HousingManager';
import type { CourierManager } from '../systems/CourierManager';
import type { TaxiManager } from '../systems/TaxiManager';
import type { GroceryManager } from '../systems/GroceryManager';
import shopsData from '../data/shops.json';
import homesData from '../data/homes.json';
import employmentData from '../data/employment-office.json';

type Tab = 'work' | 'nav' | 'food' | 'home';

export interface SmartphoneCallbacks {
  onMessage: (msg: string) => void;
  onClose: () => void;
  onNavSet: (target: NavTarget | null) => void;
  onShiftToggle: (open: boolean) => void;
  onQuitJob: () => void;
  onTakeCourierOrder: () => void;
  onTakeTaxiFare: () => void;
  onWashCar: () => void;
}

const FOOD_DELIVERY = [
  { id: 'meal', name: 'Обед с доставкой', price: 48, hunger: 55 },
  { id: 'sandwich', name: 'Сэндвич', price: 28, hunger: 35 },
  { id: 'salad', name: 'Салат', price: 32, hunger: 30 },
  { id: 'coffee', name: 'Кофе + круассан', price: 35, hunger: 22 },
  { id: 'steak', name: 'Стейк на дом', price: 72, hunger: 70 },
  { id: 'soup', name: 'Суп', price: 24, hunger: 28 },
];

export class SmartphoneUI {
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private nodes: Phaser.GameObjects.GameObject[] = [];
  private visible = false;
  private tab: Tab = 'work';

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private jobs: JobManager,
    private housing: HousingManager,
    private courier: CourierManager,
    private taxi: TaxiManager,
    private grocery: GroceryManager,
    private cb: SmartphoneCallbacks
  ) {}

  isVisible(): boolean {
    return this.visible;
  }

  show(tab: Tab = 'work'): void {
    this.tab = tab;
    this.visible = true;
    this.render();
  }

  close(): void {
    this.visible = false;
    this.clear();
    this.cb.onClose();
  }

  private clear(): void {
    this.overlay?.destroy();
    for (const n of this.nodes) n.destroy();
    this.overlay = null;
    this.nodes = [];
  }

  private render(): void {
    this.clear();
    const d = 220;
    this.overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(d)
      .setInteractive();

    const panel = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 420, 520, 0x0d0d14, 0.98)
      .setStrokeStyle(2, 0xc8f542, 0.6)
      .setScrollFactor(0)
      .setDepth(d + 1);
    this.nodes.push(panel);

    const title = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 232, '📱 СМАРТФОН', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);
    this.nodes.push(title);

    const tabs: { id: Tab; label: string }[] = [
      { id: 'work', label: 'Работа' },
      { id: 'nav', label: 'Карта' },
      { id: 'food', label: 'Еда' },
      { id: 'home', label: 'Жильё' },
    ];
    tabs.forEach((t, i) => {
      const x = GAME_WIDTH / 2 - 150 + i * 100;
      const active = this.tab === t.id;
      const btn = this.scene.add
        .text(x, GAME_HEIGHT / 2 - 195, t.label, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: active ? '#0d0d14' : '#c8f542',
          backgroundColor: active ? '#c8f542' : '#1a1a2e',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(d + 2)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.tab = t.id;
        this.render();
      });
      this.nodes.push(btn);
    });

    if (this.tab === 'work') this.renderWork(d);
    else if (this.tab === 'nav') this.renderNav(d);
    else if (this.tab === 'food') this.renderFood(d);
    else this.renderHome(d);

    const close = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 230, '[ P / Esc ] Закрыть', {
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

  private addLine(y: number, text: string, d: number, color = '#9ca3af'): void {
    const t = this.scene.add
      .text(GAME_WIDTH / 2, y, text, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color,
        align: 'center',
        wordWrap: { width: 380 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);
    this.nodes.push(t);
  }

  private addBtn(y: number, label: string, d: number, fn: () => void, danger = false): void {
    const t = this.scene.add
      .text(GAME_WIDTH / 2, y, label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: danger ? '#ff6b6b' : '#00e676',
        backgroundColor: '#1a1a2e',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2)
      .setInteractive({ useHandCursor: true });
    t.on('pointerdown', fn);
    this.nodes.push(t);
  }

  private renderWork(d: number): void {
    const job = this.state.job;
    if (!job) {
      this.addLine(GAME_HEIGHT / 2 - 140, 'Вы безработны. Офис занятости / вакансии.', d);
      return;
    }
    this.addLine(GAME_HEIGHT / 2 - 150, `${job.name}`, d, '#c8f542');
    this.addLine(
      GAME_HEIGHT / 2 - 128,
      `Смена ${String(job.shiftStart).padStart(2, '0')}:00–${String(job.shiftEnd).padStart(2, '0')}:00 · ${
        job.shiftOpen ? 'открыта' : 'закрыта'
      }`,
      d
    );

    if (this.jobs.isPieceworkJob()) {
      if (this.jobs.isCourierJob()) {
        this.addLine(GAME_HEIGHT / 2 - 100, this.courier.getStatusText(), d, '#00b4ff');
      }
      if (this.jobs.isTaxiJob()) {
        this.addLine(GAME_HEIGHT / 2 - 100, this.taxi.getStatusText(), d, '#ffd600');
        this.addLine(
          GAME_HEIGHT / 2 - 78,
          `Чистота авто: ${Math.round(this.taxi.cleanliness())}%`,
          d
        );
      }

      let y = GAME_HEIGHT / 2 - 40;
      if (!job.shiftOpen) {
        this.addBtn(y, 'Начать смену', d, () => {
          const err = this.jobs.openShift();
          this.cb.onMessage(err ?? 'Смена открыта — можно брать заказы');
          if (!err) this.cb.onShiftToggle(true);
          this.render();
        });
      } else {
        this.addBtn(y, 'Закончить смену', d, () => {
          const busy = this.courier.hasActiveDelivery() || this.taxi.hasFare();
          const err = this.jobs.closeShift(busy);
          this.cb.onMessage(err ?? 'Смена закрыта. Новые заказы не приходят');
          if (!err) this.cb.onShiftToggle(false);
          this.render();
        });
        y += 40;
        if (this.jobs.isCourierJob() && !this.courier.hasActiveDelivery()) {
          this.addBtn(y, 'Взять заказ курьера', d, () => {
            this.cb.onTakeCourierOrder();
            this.render();
          });
          y += 40;
        }
        if (this.jobs.isTaxiJob()) {
          if (!this.taxi.hasFare()) {
            this.addBtn(y, 'Взять заказ такси', d, () => {
              this.cb.onTakeTaxiFare();
              this.render();
            });
            y += 40;
          }
          this.addBtn(y, 'Помыть машину ($15)', d, () => {
            this.cb.onWashCar();
            this.render();
          });
          y += 40;
        }
      }
    } else {
      this.addLine(GAME_HEIGHT / 2 - 90, 'Офисная работа — смена на месте работодателя', d);
    }

    this.addBtn(GAME_HEIGHT / 2 + 160, 'Уволиться', d, () => this.cb.onQuitJob(), true);
  }

  private renderNav(d: number): void {
    this.addLine(GAME_HEIGHT / 2 - 150, 'Маршрут (стрелка на улице)', d, '#c8f542');
    const pois: { label: string; x: number; y: number }[] = [];

    if (this.state.housing.homeId) {
      const home = (homesData as { id: string; name: string; doorX: number; doorY: number }[]).find(
        (h) => h.id === this.state.housing.homeId
      );
      if (home) pois.push({ label: `Дом: ${home.name}`, x: home.doorX, y: home.doorY });
    }
    for (const s of shopsData as { type: string; name: string; doorX: number; doorY: number }[]) {
      if (s.type === 'grocery') pois.push({ label: `🛒 ${s.name}`, x: s.doorX, y: s.doorY });
      if (s.type === 'furniture') pois.push({ label: `🛋 ${s.name}`, x: s.doorX, y: s.doorY });
      if (s.type === 'vehicle') pois.push({ label: `🚗 ${s.name}`, x: s.doorX, y: s.doorY });
    }
    const emp = (employmentData as { name: string; doorX: number; doorY: number }[])[0];
    if (emp) pois.push({ label: `🏢 ${emp.name}`, x: emp.doorX, y: emp.doorY });
    if (this.jobs.isCourierJob()) {
      const wh = this.courier.getWarehouseTile();
      pois.push({ label: '📦 Склад курьера', x: wh.x, y: wh.y });
    }
    if (this.jobs.isTaxiJob()) {
      const dep = this.taxi.getDepotTile();
      pois.push({ label: '🚕 Парк такси', x: dep.x, y: dep.y });
    }

    pois.slice(0, 10).forEach((p, i) => {
      this.addBtn(GAME_HEIGHT / 2 - 120 + i * 32, p.label, d, () => {
        this.cb.onNavSet({
          x: p.x * TILE_SIZE + TILE_SIZE / 2,
          y: p.y * TILE_SIZE + TILE_SIZE / 2,
          label: p.label,
        });
        this.cb.onMessage(`Маршрут: ${p.label}`);
        this.close();
      });
    });
    this.addBtn(GAME_HEIGHT / 2 + 185, 'Сбросить маршрут', d, () => {
      this.cb.onNavSet(null);
      this.cb.onMessage('Маршрут сброшен');
    }, true);
  }

  private renderFood(d: number): void {
    this.addLine(GAME_HEIGHT / 2 - 150, 'Доставка еды (наценка)', d, '#c8f542');
    FOOD_DELIVERY.forEach((item, i) => {
      this.addBtn(GAME_HEIGHT / 2 - 115 + i * 42, `${item.name} — $${item.price}`, d, () => {
        if (this.state.money < item.price) {
          this.cb.onMessage('Недостаточно денег');
          return;
        }
        this.state.money -= item.price;
        this.state.hunger = Math.min(100, this.state.hunger + item.hunger);
        this.state.lifeStats.foodBought += 1;
        this.cb.onMessage(`Доставлено: ${item.name} (+${item.hunger} голод)`);
        this.render();
      });
    });
  }

  private renderHome(d: number): void {
    const days = this.housing.daysUntilRent();
    const amount = this.housing.rentAmountDue();
    if (this.state.housing.type === 'none') {
      this.addLine(GAME_HEIGHT / 2 - 100, 'Нет жилья — снимите квартиру (зелёная дверь)', d);
      return;
    }
    if (this.state.housing.type === 'owned') {
      this.addLine(GAME_HEIGHT / 2 - 100, 'Жильё в собственности. Аренды нет.', d, '#00e676');
      return;
    }
    this.addLine(GAME_HEIGHT / 2 - 130, `Аренда: через ${days} дн. · $${amount}`, d, '#ffd600');
    this.addLine(GAME_HEIGHT / 2 - 100, `День списания: ${this.state.housing.rentDueDay}`, d);
    this.addBtn(GAME_HEIGHT / 2 - 40, `Оплатить аренду сейчас ($${amount})`, d, () => {
      const err = this.housing.payRent();
      this.cb.onMessage(err ?? `Аренда $${amount} оплачена`);
      this.render();
    });
  }
}
