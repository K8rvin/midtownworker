import { TILE_SIZE, type GameState } from '../config';
import pickupsData from '../data/courier-pickups.json';
import homesData from '../data/homes.json';

export interface CourierPickupConfig {
  id: string;
  name: string;
  category: 'shop' | 'cafe' | 'warehouse' | 'restaurant';
  x: number;
  y: number;
}

export interface CourierDeliveryState {
  orderId: string;
  pickupId: string;
  pickupName: string;
  pickupX: number;
  pickupY: number;
  dropoffHomeId: string;
  dropoffName: string;
  dropoffX: number;
  dropoffY: number;
  distanceTiles: number;
  hasPackage: boolean;
}

const BASE_PAY = 12;
const PAY_PER_TILE = 2.5;
const PICKUP_RADIUS = 36;
const DROP_RADIUS = 36;
const WAREHOUSE_RADIUS = 40;

export class CourierManager {
  private pickups: CourierPickupConfig[] = (pickupsData as CourierPickupConfig[]).filter(
    (p) => p.category !== 'warehouse'
  );

  constructor(private state: GameState) {}

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

  estimatePay(distanceTiles: number): number {
    return Math.round(BASE_PAY + distanceTiles * PAY_PER_TILE);
  }

  tileDistance(ax: number, ay: number, bx: number, by: number): number {
    return Math.round(Math.hypot(bx - ax, by - ay));
  }

  takeOrder(): string | null {
    if (!this.isCourierEmployed()) return 'Вы не работаете курьером';
    if (this.hasActiveDelivery()) return 'Сначала завершите текущую доставку';

    const pickup = this.pickups[Math.floor(Math.random() * this.pickups.length)];
    const homes = homesData as { id: string; name: string; doorX: number; doorY: number }[];
    const dropoff = homes[Math.floor(Math.random() * homes.length)];
    const distanceTiles = this.tileDistance(pickup.x, pickup.y, dropoff.doorX, dropoff.doorY);
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

  deliverPackage(px: number, py: number, homeId: string): string | { pay: number } {
    const d = this.state.courierDelivery;
    if (!d || !d.hasPackage) return 'У вас нет посылки';
    if (homeId !== d.dropoffHomeId) return 'Это не тот адрес доставки';
    const dist = this.distToTile(px, py, d.dropoffX, d.dropoffY);
    if (dist > DROP_RADIUS) return 'Подойдите к двери';

    const pay = this.estimatePay(d.distanceTiles);
    this.state.money += pay;
    this.state.lifeStats.courierDeliveries += 1;
    this.state.courierDelivery = null;
    return { pay };
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

  getStatusText(): string {
    const d = this.state.courierDelivery;
    if (!d) return 'На складе — возьмите заказ';
    if (!d.hasPackage) {
      return `Забрать: ${d.pickupName} (~$${this.estimatePay(d.distanceTiles)})`;
    }
    return `Доставить: ${d.dropoffName} (~$${this.estimatePay(d.distanceTiles)})`;
  }

  private distToTile(px: number, py: number, tx: number, ty: number): number {
    const wx = tx * TILE_SIZE + TILE_SIZE / 2;
    const wy = ty * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(px - wx, py - wy);
  }
}