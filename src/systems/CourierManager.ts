import {
  TILE_SIZE,
  type CourierDeliveryState,
  type CourierOrderCategory,
  type GameState,
} from '../config';
import pickupsData from '../data/courier-pickups.json';
import homesData from '../data/homes.json';
import jobsData from '../data/jobs.json';
import type { TimeManager } from './TimeManager';

export interface CourierPickupConfig {
  id: string;
  name: string;
  category: 'shop' | 'cafe' | 'warehouse' | 'restaurant' | 'office';
  x: number;
  y: number;
}

export interface CourierWaypoint {
  tileX: number;
  tileY: number;
  label: string;
  phase: 'warehouse' | 'pickup' | 'dropoff';
}

export interface DeliveryResult {
  pay: number;
  basePay: number;
  late: boolean;
  fast: boolean;
  combo: number;
  bonus: number;
  message: string;
}

const BASE_PAY = 14;
const PAY_PER_TILE = 2.8;
const PICKUP_RADIUS = 36;
const DROP_RADIUS = 36;
const WAREHOUSE_RADIUS = 40;

const CATEGORY_WEIGHTS: { cat: CourierOrderCategory; w: number }[] = [
  { cat: 'food', w: 35 },
  { cat: 'parcel', w: 30 },
  { cat: 'fragile', w: 20 },
  { cat: 'express', w: 15 },
];

export class CourierManager {
  private pickups: CourierPickupConfig[] = (pickupsData as CourierPickupConfig[]).filter(
    (p) => p.category !== 'warehouse'
  );
  private timeManager: TimeManager | null = null;

  constructor(private state: GameState) {}

  setTimeManager(tm: TimeManager): void {
    this.timeManager = tm;
  }

  isCourierEmployed(): boolean {
    return this.state.job?.id === 'courier';
  }

  hasActiveDelivery(): boolean {
    return this.state.courierDelivery !== null;
  }

  getDelivery(): CourierDeliveryState | null {
    return this.state.courierDelivery;
  }

  clearDelivery(): void {
    this.state.courierDelivery = null;
  }

  estimatePay(distanceTiles: number, category: CourierOrderCategory = 'parcel'): number {
    let mult = 1;
    if (category === 'food') mult = 0.95;
    if (category === 'fragile') mult = 1.25;
    if (category === 'express') mult = 1.4;
    return Math.round((BASE_PAY + distanceTiles * PAY_PER_TILE) * mult);
  }

  tileDistance(ax: number, ay: number, bx: number, by: number): number {
    return Math.round(Math.hypot(bx - ax, by - ay));
  }

  private pickCategory(): CourierOrderCategory {
    const total = CATEGORY_WEIGHTS.reduce((s, c) => s + c.w, 0);
    let r = Math.random() * total;
    for (const c of CATEGORY_WEIGHTS) {
      r -= c.w;
      if (r <= 0) return c.cat;
    }
    return 'parcel';
  }

  private timeLimitFor(distanceTiles: number, category: CourierOrderCategory): number {
    // Game minutes (clock runs ~8 min/real sec → ~1 game hour ~7.5 real sec)
    const base = 25 + Math.round(distanceTiles * 0.9);
    if (category === 'express') return Math.max(18, Math.round(base * 0.65));
    if (category === 'food') return Math.max(22, Math.round(base * 0.8));
    if (category === 'fragile') return Math.round(base * 1.15);
    return base;
  }

  takeOrder(): string | null {
    if (!this.isCourierEmployed()) return 'Вы не работаете курьером';
    if (this.hasActiveDelivery()) return 'Сначала завершите текущую доставку';

    const pickup = this.pickups[Math.floor(Math.random() * this.pickups.length)];
    const homes = homesData as { id: string; name: string; doorX: number; doorY: number }[];
    const dropoff = homes[Math.floor(Math.random() * homes.length)];
    const distanceTiles = this.tileDistance(pickup.x, pickup.y, dropoff.doorX, dropoff.doorY);
    const category = this.pickCategory();
    const basePay = this.estimatePay(distanceTiles, category);
    const timeLimitMinutes = this.timeLimitFor(distanceTiles, category);
    const now = this.timeManager?.getAbsMinutes(this.state) ?? this.state.day * 24 * 60 + this.state.hour * 60;
    const orderId = `ord_${this.state.day}_${Date.now() % 100000}`;

    this.state.courierDelivery = {
      orderId,
      pickupId: pickup.id,
      pickupName: pickup.name,
      pickupX: pickup.x,
      pickupY: pickup.y,
      dropoffHomeId: dropoff.id,
      dropoffName: dropoff.name,
      dropoffX: dropoff.doorX,
      dropoffY: dropoff.doorY,
      distanceTiles,
      hasPackage: false,
      basePay,
      timeLimitMinutes,
      deadlineAbsMin: now + timeLimitMinutes,
      startedAbsMin: now,
      category,
    };
    return null;
  }

  pickupPackage(px: number, py: number): string | null {
    const d = this.state.courierDelivery;
    if (!d || d.hasPackage) return 'Нет заказа для забора';
    const dist = this.distToTile(px, py, d.pickupX, d.pickupY);
    if (dist > PICKUP_RADIUS) return 'Подойдите к точке забора';
    d.hasPackage = true;
    return null;
  }

  deliverPackage(px: number, py: number, homeId: string): string | DeliveryResult {
    const d = this.state.courierDelivery;
    if (!d || !d.hasPackage) return 'У вас нет посылки';
    if (homeId !== d.dropoffHomeId) return 'Это не тот адрес доставки';
    const dist = this.distToTile(px, py, d.dropoffX, d.dropoffY);
    if (dist > DROP_RADIUS) return 'Подойдите к двери';

    const now = this.timeManager?.getAbsMinutes(this.state) ?? d.deadlineAbsMin;
    const elapsed = now - d.startedAbsMin;
    const late = now > d.deadlineAbsMin;
    const fast = !late && elapsed <= d.timeLimitMinutes * 0.5;

    let pay = d.basePay ?? this.estimatePay(d.distanceTiles, d.category ?? 'parcel');
    let bonus = 0;
    if (late) {
      pay = Math.max(8, Math.round(pay * 0.55));
      this.state.lifeStats.courierCombo = 0;
    } else {
      this.state.lifeStats.courierCombo = (this.state.lifeStats.courierCombo ?? 0) + 1;
      if (fast) {
        const b = Math.round(pay * 0.3);
        bonus += b;
        pay += b;
      }
      const combo = this.state.lifeStats.courierCombo;
      if (combo >= 5) {
        bonus += 25;
        pay += 25;
      } else if (combo >= 3) {
        bonus += 12;
        pay += 12;
      }
    }

    this.state.money += pay;
    this.state.lifeStats.courierDeliveries += 1;
    this.state.courierDelivery = null;

    const combo = this.state.lifeStats.courierCombo;
    let message = late
      ? `Опоздание: $${pay} (штраф по сроку)`
      : fast
        ? `Быстрая доставка! +$${pay}`
        : `Доставлено +$${pay}`;
    if (!late && combo >= 3) message += ` · комбо ×${combo}`;

    return {
      pay,
      basePay: d.basePay,
      late,
      fast,
      combo,
      bonus,
      message,
    };
  }

  isNearPickup(px: number, py: number): boolean {
    const d = this.state.courierDelivery;
    if (!d || d.hasPackage) return false;
    return this.distToTile(px, py, d.pickupX, d.pickupY) <= PICKUP_RADIUS;
  }

  isNearDropoff(px: number, py: number, homeId: string): boolean {
    const d = this.state.courierDelivery;
    if (!d || !d.hasPackage || homeId !== d.dropoffHomeId) return false;
    return this.distToTile(px, py, d.dropoffX, d.dropoffY) <= DROP_RADIUS;
  }

  isAtWarehouse(px: number, py: number, hrX: number, hrY: number): boolean {
    const hx = hrX * TILE_SIZE + TILE_SIZE / 2;
    const hy = hrY * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(px - hx, py - hy) < WAREHOUSE_RADIUS;
  }

  getWarehouseTile(): { x: number; y: number } {
    const job = (jobsData as { id: string; doorX: number; doorY: number }[]).find(
      (j) => j.id === 'courier'
    );
    return { x: job?.doorX ?? 132, y: job?.doorY ?? 72 };
  }

  getWaypoint(): CourierWaypoint | null {
    if (!this.isCourierEmployed()) return null;
    const d = this.state.courierDelivery;
    if (!d) {
      const wh = this.getWarehouseTile();
      return {
        tileX: wh.x,
        tileY: wh.y,
        label: 'Склад «Быстрая доставка»',
        phase: 'warehouse',
      };
    }
    if (!d.hasPackage) {
      return {
        tileX: d.pickupX,
        tileY: d.pickupY,
        label: d.pickupName,
        phase: 'pickup',
      };
    }
    return {
      tileX: d.dropoffX,
      tileY: d.dropoffY,
      label: d.dropoffName,
      phase: 'dropoff',
    };
  }

  /** Remaining game minutes as "M:SS" style minutes only, or empty. */
  getTimerLabel(): string {
    const d = this.state.courierDelivery;
    if (!d?.deadlineAbsMin) return '';
    const now = this.timeManager?.getAbsMinutes(this.state) ?? d.startedAbsMin;
    const left = d.deadlineAbsMin - now;
    if (left <= 0) return 'просрочено!';
    return `${left}м`;
  }

  isLate(): boolean {
    const d = this.state.courierDelivery;
    if (!d?.deadlineAbsMin) return false;
    const now = this.timeManager?.getAbsMinutes(this.state) ?? d.startedAbsMin;
    return now > d.deadlineAbsMin;
  }

  getStatusText(): string {
    const d = this.state.courierDelivery;
    if (!d) return 'Склад — возьмите заказ (следуйте за стрелкой)';
    const timer = this.getTimerLabel();
    const cat =
      d.category === 'express'
        ? '⚡'
        : d.category === 'fragile'
          ? '📦'
          : d.category === 'food'
            ? '🍔'
            : '✉';
    if (!d.hasPackage) {
      return `${cat} Забрать: ${d.pickupName} · ~$${d.basePay ?? this.estimatePay(d.distanceTiles)}${timer ? ` · ${timer}` : ''}`;
    }
    return `${cat} Доставить: ${d.dropoffName} · ~$${d.basePay ?? this.estimatePay(d.distanceTiles)}${timer ? ` · ${timer}` : ''}`;
  }

  private distToTile(px: number, py: number, tx: number, ty: number): number {
    const wx = tx * TILE_SIZE + TILE_SIZE / 2;
    const wy = ty * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(px - wx, py - wy);
  }
}
