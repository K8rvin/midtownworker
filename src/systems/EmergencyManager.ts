import { TILE_SIZE, type EmergencyCallState, type EmergencyService, type GameState } from '../config';
import homesData from '../data/homes.json';
import shopsData from '../data/shops.json';
import jobsData from '../data/jobs.json';
import type { TimeManager } from './TimeManager';

const RESPOND_R = 48;
const BASE_PAY = 28;
const PER_TILE = 2.6;

const POLICE_CALLS = [
  'Шум соседей',
  'Кража в магазине',
  'Драка на улице',
  'Подозрительный автомобиль',
  'Нарушение парковки',
  'Грабёж кошелька',
  'Ложный вызов',
];

const FIRE_CALLS = [
  'Пожар в квартире',
  'Горит гараж',
  'Дым на крыше',
  'Загорелась мусорка',
  'Короткое замыкание',
  'Пожар на складе',
  'Кухня в огне',
];

export interface EmergencyWaypoint {
  tileX: number;
  tileY: number;
  label: string;
  phase: 'station' | 'scene';
}

export class EmergencyManager {
  private timeManager: TimeManager | null = null;

  constructor(private state: GameState) {}

  setTimeManager(tm: TimeManager): void {
    this.timeManager = tm;
  }

  private serviceFromJob(): EmergencyService | null {
    const id = this.state.job?.id;
    if (id === 'police') return 'police';
    if (id === 'firefighter') return 'firefighter';
    return null;
  }

  isEmployed(service?: EmergencyService): boolean {
    const s = this.serviceFromJob();
    if (!s) return false;
    return service ? s === service : true;
  }

  hasCall(): boolean {
    return this.state.emergencyCall !== null;
  }

  getCall(): EmergencyCallState | null {
    return this.state.emergencyCall;
  }

  clearCall(): void {
    this.state.emergencyCall = null;
  }

  getStationTile(service: EmergencyService): { x: number; y: number } {
    const job = (jobsData as { id: string; doorX: number; doorY: number }[]).find(
      (j) => j.id === service
    );
    return { x: job?.doorX ?? 80, y: job?.doorY ?? 100 };
  }

  isAtStation(px: number, py: number, maxDist = 48): boolean {
    const s = this.serviceFromJob();
    if (!s) return false;
    const st = this.getStationTile(s);
    const dx = st.x * TILE_SIZE + TILE_SIZE / 2;
    const dy = st.y * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(px - dx, py - dy) < maxDist;
  }

  canTakeCall(): string | null {
    const s = this.serviceFromJob();
    if (!s) return 'Вы не в экстренной службе';
    if (!this.state.job?.shiftOpen) return 'Сначала начните смену на участке';
    if (this.hasCall()) return 'Сначала завершите текущий вызов';
    return null;
  }

  takeCall(): string | null {
    const err = this.canTakeCall();
    if (err) return err;
    const service = this.serviceFromJob()!;
    const station = this.getStationTile(service);

    type Spot = { name: string; x: number; y: number };
    const spots: Spot[] = [];
    for (const h of homesData as { name: string; doorX: number; doorY: number }[]) {
      spots.push({ name: h.name, x: h.doorX, y: h.doorY });
    }
    for (const sh of shopsData as { name: string; doorX: number; doorY: number; type?: string }[]) {
      if (sh.type === 'weapon') continue;
      spots.push({ name: sh.name, x: sh.doorX, y: sh.doorY });
    }
    // filter far enough from station
    const far = spots.filter((sp) => Math.hypot(sp.x - station.x, sp.y - station.y) > 12);
    const pool = far.length ? far : spots;
    const target = pool[Math.floor(Math.random() * pool.length)];
    const dist = Math.round(Math.hypot(target.x - station.x, target.y - station.y));
    const titles = service === 'police' ? POLICE_CALLS : FIRE_CALLS;
    const title = titles[Math.floor(Math.random() * titles.length)];
    const pay = Math.round(BASE_PAY + dist * PER_TILE + (service === 'firefighter' ? 8 : 0));
    const limit = 22 + Math.round(dist * 0.7);
    const now = this.timeManager?.getAbsMinutes(this.state) ?? this.state.day * 24 * 60 + this.state.hour * 60;

    this.state.emergencyCall = {
      callId: `em_${Date.now() % 100000}`,
      service,
      title,
      targetName: target.name,
      targetX: target.x,
      targetY: target.y,
      pay,
      timeLimitMinutes: limit,
      deadlineAbsMin: now + limit,
      startedAbsMin: now,
    };
    return null;
  }

  isNearScene(px: number, py: number): boolean {
    const c = this.state.emergencyCall;
    if (!c) return false;
    const dx = c.targetX * TILE_SIZE + TILE_SIZE / 2;
    const dy = c.targetY * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(px - dx, py - dy) <= RESPOND_R;
  }

  resolveCall(px: number, py: number): string | { pay: number; message: string } {
    const c = this.state.emergencyCall;
    if (!c) return 'Нет активного вызова';
    if (!this.isNearScene(px, py)) return 'Подойдите ближе к месту вызова';

    const now = this.timeManager?.getAbsMinutes(this.state) ?? c.deadlineAbsMin;
    const late = now > c.deadlineAbsMin;
    let pay = c.pay;
    if (late) pay = Math.max(12, Math.round(pay * 0.55));
    else if (now - c.startedAbsMin <= c.timeLimitMinutes * 0.45) pay = Math.round(pay * 1.2);

    this.state.money += pay;
    if (c.service === 'police') {
      this.state.lifeStats.policeCalls = (this.state.lifeStats.policeCalls ?? 0) + 1;
    } else {
      this.state.lifeStats.fireCalls = (this.state.lifeStats.fireCalls ?? 0) + 1;
    }

    const verb =
      c.service === 'police'
        ? late
          ? 'Вызов закрыт с опозданием'
          : 'Вызов отработан'
        : late
          ? 'Пожар погашен с задержкой'
          : 'Очаг потушен';
    const message = `${verb}: ${c.title} · ${c.targetName} · +$${pay}`;
    this.state.emergencyCall = null;
    return { pay, message };
  }

  getWaypoint(): EmergencyWaypoint | null {
    const s = this.serviceFromJob();
    if (!s) return null;
    const c = this.state.emergencyCall;
    if (c) {
      return {
        tileX: c.targetX,
        tileY: c.targetY,
        label: c.title,
        phase: 'scene',
      };
    }
    if (!this.state.job?.shiftOpen) return null;
    const st = this.getStationTile(s);
    return {
      tileX: st.x,
      tileY: st.y,
      label: s === 'police' ? 'Участок' : 'Пожарная',
      phase: 'station',
    };
  }

  getStatusText(): string {
    const s = this.serviceFromJob();
    if (!s) return '';
    const c = this.state.emergencyCall;
    const label = s === 'police' ? '🚓 Полиция' : '🚒 Пожарные';
    if (!c) {
      if (!this.state.job?.shiftOpen) return `${label}: смена закрыта`;
      const n = s === 'police' ? this.state.lifeStats.policeCalls ?? 0 : this.state.lifeStats.fireCalls ?? 0;
      return `${label}: ждут вызовы · ${n} закрыто`;
    }
    return `${label}: ${c.title} → ${c.targetName} · ~$${c.pay}`;
  }

  getTimerLabel(): string {
    const c = this.state.emergencyCall;
    if (!c || !this.timeManager) return '';
    const now = this.timeManager.getAbsMinutes(this.state);
    const left = c.deadlineAbsMin - now;
    if (left <= 0) return 'ПРОСРОЧЕН';
    return `${left}м`;
  }
}
