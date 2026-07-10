import { TILE_SIZE, type GameState, type TaxiFareState } from '../config';
import pickupsData from '../data/taxi-pickups.json';
import homesData from '../data/homes.json';
import jobsData from '../data/jobs.json';
import type { TimeManager } from './TimeManager';

const PICKUP_R = 48;
const DROP_R = 48;
const WASH_COST = 15;
const MIN_CLEAN = 40;
const BASE = 18;
const PER_TILE = 3.2;

const NAMES = ['Анна', 'Игорь', 'Мария', 'Сергей', 'Ольга', 'Дмитрий', 'Елена', 'Павел'];

export interface TaxiWaypoint {
  tileX: number;
  tileY: number;
  label: string;
  phase: 'depot' | 'pickup' | 'dropoff';
}

export class TaxiManager {
  private pickups = pickupsData as { id: string; name: string; x: number; y: number }[];
  private timeManager: TimeManager | null = null;

  constructor(private state: GameState) {}

  setTimeManager(tm: TimeManager): void {
    this.timeManager = tm;
  }

  isEmployed(): boolean {
    return this.state.job?.id === 'taxi';
  }

  hasFare(): boolean {
    return this.state.taxiFare !== null;
  }

  getFare(): TaxiFareState | null {
    return this.state.taxiFare;
  }

  clearFare(): void {
    this.state.taxiFare = null;
  }

  getDepotTile(): { x: number; y: number } {
    const job = (jobsData as { id: string; doorX: number; doorY: number }[]).find((j) => j.id === 'taxi');
    return { x: job?.doorX ?? 136, y: job?.doorY ?? 97 };
  }

  /** Door + HR tiles for markers / interaction. */
  getDepotPoints(): { x: number; y: number; kind: 'door' | 'hr' }[] {
    const job = (jobsData as { id: string; doorX: number; doorY: number; hrX?: number; hrY?: number }[]).find(
      (j) => j.id === 'taxi'
    );
    if (!job) return [{ x: 136, y: 97, kind: 'door' }];
    const pts: { x: number; y: number; kind: 'door' | 'hr' }[] = [
      { x: job.doorX, y: job.doorY, kind: 'door' },
    ];
    if (job.hrX !== undefined && job.hrY !== undefined) {
      pts.push({ x: job.hrX, y: job.hrY, kind: 'hr' });
    }
    return pts;
  }

  cleanliness(): number {
    return this.state.taxiCarCleanliness ?? 100;
  }

  washCar(): string | null {
    if (!this.isEmployed()) return 'Вы не таксист';
    if (this.state.money < WASH_COST) return `Нужно $${WASH_COST} на мойку`;
    this.state.money -= WASH_COST;
    this.state.taxiCarCleanliness = 100;
    return null;
  }

  /** vehicleType: current vehicle config id; must be sedan/van/taxi and not traffic for work. */
  canAcceptFare(inVehicle: boolean, vehicleType: string | null, isTraffic: boolean): string | null {
    if (!this.isEmployed()) return 'Вы не таксист';
    if (!this.state.job?.shiftOpen) return 'Сначала начните смену';
    if (this.hasFare()) return 'Сначала завершите текущий заказ';
    if (!inVehicle || !vehicleType) return 'Сядьте в седан, фургон или такси';
    if (isTraffic) return 'Нужна своя/служебная машина, не угнанная';
    const ok = ['sedan', 'van', 'taxi', 'sports'].includes(vehicleType);
    if (!ok) return 'Парк принимает седан, фургон или такси';
    if (this.cleanliness() < MIN_CLEAN) {
      return `Машина грязная (${Math.round(this.cleanliness())}%). Вымойте у депо ($${WASH_COST})`;
    }
    return null;
  }

  takeFare(inVehicle: boolean, vehicleType: string | null, isTraffic: boolean): string | null {
    const err = this.canAcceptFare(inVehicle, vehicleType, isTraffic);
    if (err) return err;

    const pickup = this.pickups[Math.floor(Math.random() * this.pickups.length)];
    const homes = homesData as { id: string; name: string; doorX: number; doorY: number }[];
    let drop = homes[Math.floor(Math.random() * homes.length)];
    // avoid same tile
    for (let i = 0; i < 5 && drop.doorX === pickup.x && drop.doorY === pickup.y; i++) {
      drop = homes[Math.floor(Math.random() * homes.length)];
    }
    const dist = Math.round(Math.hypot(drop.doorX - pickup.x, drop.doorY - pickup.y));
    const basePay = Math.round(BASE + dist * PER_TILE);
    const limit = 28 + Math.round(dist * 0.85);
    const now = this.timeManager?.getAbsMinutes(this.state) ?? this.state.day * 24 * 60 + this.state.hour * 60;

    this.state.taxiFare = {
      fareId: `fare_${Date.now() % 100000}`,
      passengerName: NAMES[Math.floor(Math.random() * NAMES.length)],
      pickupX: pickup.x,
      pickupY: pickup.y,
      dropoffX: drop.doorX,
      dropoffY: drop.doorY,
      dropoffName: drop.name,
      distanceTiles: dist,
      hasPassenger: false,
      basePay,
      timeLimitMinutes: limit,
      deadlineAbsMin: now + limit,
      startedAbsMin: now,
    };
    return null;
  }

  pickupPassenger(px: number, py: number, inVehicle: boolean): string | null {
    const f = this.state.taxiFare;
    if (!f || f.hasPassenger) return 'Нет пассажира для посадки';
    if (!inVehicle) return 'Посадка только в машине';
    const dist = this.distTile(px, py, f.pickupX, f.pickupY);
    if (dist > PICKUP_R) return 'Подъедьте ближе к пассажиру';
    f.hasPassenger = true;
    return null;
  }

  dropoffPassenger(
    px: number,
    py: number,
    inVehicle: boolean
  ): string | { pay: number; rating: number; message: string } {
    const f = this.state.taxiFare;
    if (!f || !f.hasPassenger) return 'В машине нет пассажира';
    if (!inVehicle) return 'Высадка из машины';
    const dist = this.distTile(px, py, f.dropoffX, f.dropoffY);
    if (dist > DROP_R) return 'Подъедьте к адресу высадки';

    const now = this.timeManager?.getAbsMinutes(this.state) ?? f.deadlineAbsMin;
    const late = now > f.deadlineAbsMin;
    const fast = !late && now - f.startedAbsMin <= f.timeLimitMinutes * 0.5;
    const clean = this.cleanliness();

    let rating = 4;
    if (late) rating -= 1;
    if (fast) rating += 1;
    if (clean < 55) rating -= 1;
    if (clean >= 90) rating += 1;
    rating = Math.max(1, Math.min(5, rating));

    let pay = f.basePay;
    if (late) pay = Math.max(10, Math.round(pay * 0.6));
    if (fast) pay = Math.round(pay * 1.2);
    if (clean < 50) pay = Math.max(8, pay - 15);
    if (rating <= 2) {
      pay = Math.max(5, pay - 15);
      this.state.money = Math.max(0, this.state.money); // park fine applied below if needed
    }

    this.state.money += pay;
    this.state.lifeStats.taxiFares = (this.state.lifeStats.taxiFares ?? 0) + 1;
    this.state.lifeStats.taxiRatingSum = (this.state.lifeStats.taxiRatingSum ?? 0) + rating;
    this.state.lifeStats.taxiRatingCount = (this.state.lifeStats.taxiRatingCount ?? 0) + 1;
    this.state.taxiCarCleanliness = Math.max(0, clean - (6 + Math.floor(Math.random() * 9)));
    this.state.taxiFare = null;

    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    let message = `${f.passengerName}: ${stars} · +$${pay}`;
    if (late) message += ' · опоздание';
    if (clean < 50) message += ' · грязный салон';

    return { pay, rating, message };
  }

  avgRating(): number {
    const c = this.state.lifeStats.taxiRatingCount ?? 0;
    if (c <= 0) return 0;
    return (this.state.lifeStats.taxiRatingSum ?? 0) / c;
  }

  /** Daily park fine if avg low (call once per day max from scene). */
  checkParkRatingFine(alreadyFinedToday: boolean): string | null {
    if (alreadyFinedToday) return null;
    const c = this.state.lifeStats.taxiRatingCount ?? 0;
    if (c < 3) return null;
    const avg = this.avgRating();
    if (avg >= 3.2) return null;
    const fine = 40;
    this.state.money = Math.max(0, this.state.money - fine);
    return `Парк «Жёлтый»: низкий рейтинг ${avg.toFixed(1)} — штраф $${fine}`;
  }

  getWaypoint(): TaxiWaypoint | null {
    if (!this.isEmployed()) return null;
    const f = this.state.taxiFare;
    if (!f) {
      // Always guide to depot when no fare (start shift, wash, take order)
      const d = this.getDepotTile();
      const label = this.state.job?.shiftOpen
        ? 'Парк «Жёлтый» · [E] заказ / мойка'
        : 'Парк «Жёлтый» · [E] начать смену';
      return { tileX: d.x, tileY: d.y, label, phase: 'depot' };
    }
    if (!f.hasPassenger) {
      return {
        tileX: f.pickupX,
        tileY: f.pickupY,
        label: f.passengerName,
        phase: 'pickup',
      };
    }
    return {
      tileX: f.dropoffX,
      tileY: f.dropoffY,
      label: f.dropoffName,
      phase: 'dropoff',
    };
  }

  getStatusText(): string {
    const f = this.state.taxiFare;
    const clean = Math.round(this.cleanliness());
    if (!f) {
      if (!this.state.job?.shiftOpen) {
        return 'Такси: подъедьте к жёлтой площадке депо [E] · или P → смена';
      }
      const avg = this.avgRating();
      return `Такси: депо [E] заказ · чистота ${clean}% · ★${avg > 0 ? avg.toFixed(1) : '—'}`;
    }
    if (!f.hasPassenger) return `Забрать: ${f.passengerName} · ~$${f.basePay}`;
    return `Везу: ${f.passengerName} → ${f.dropoffName} · ~$${f.basePay}`;
  }

  isNearPickup(px: number, py: number): boolean {
    const f = this.state.taxiFare;
    if (!f || f.hasPassenger) return false;
    return this.distTile(px, py, f.pickupX, f.pickupY) <= PICKUP_R;
  }

  isNearDropoff(px: number, py: number): boolean {
    const f = this.state.taxiFare;
    if (!f || !f.hasPassenger) return false;
    return this.distTile(px, py, f.dropoffX, f.dropoffY) <= DROP_R;
  }

  /** Large radius so player can use [E] on foot or in a car at the yellow pad. */
  isAtDepot(px: number, py: number): boolean {
    const R = 88;
    for (const p of this.getDepotPoints()) {
      const hx = p.x * TILE_SIZE + TILE_SIZE / 2;
      const hy = p.y * TILE_SIZE + TILE_SIZE / 2;
      if (Math.hypot(px - hx, py - hy) < R) return true;
    }
    return false;
  }

  private distTile(px: number, py: number, tx: number, ty: number): number {
    return Math.hypot(px - (tx * TILE_SIZE + TILE_SIZE / 2), py - (ty * TILE_SIZE + TILE_SIZE / 2));
  }
};
