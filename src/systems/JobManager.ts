import { TILE_SIZE } from '../config';
import type { GameState } from '../config';
import jobsData from '../data/jobs.json';

export interface JobConfig {
  id: string;
  name: string;
  employer: string;
  violent?: boolean;
  description?: string;
  jobType?: string;
  mapId: string;
  doorX: number;
  doorY: number;
  interiorX: number;
  interiorY: number;
  interiorW: number;
  interiorH: number;
  hrX: number;
  hrY: number;
  salary: number;
  remote: boolean;
  remoteAfterDays: number;
  shiftStart: number;
  shiftEnd: number;
}

export class JobManager {
  public jobs: JobConfig[] = jobsData as JobConfig[];

  constructor(private state: GameState) {}

  getJobById(id: string): JobConfig | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  getJobsForMap(mapId: string): JobConfig[] {
    return this.jobs.filter((j) => j.mapId === mapId);
  }

  /** Only one job at a time — block if already employed elsewhere. */
  canApply(jobId: string): string | null {
    if (this.state.job && this.state.job.id !== jobId) {
      return `Сначала увольтесь с должности «${this.state.job.name}»`;
    }
    if (this.state.job?.id === jobId) return 'Вы уже работаете здесь';
    return null;
  }

  apply(job: JobConfig): string | null {
    const err = this.canApply(job.id);
    if (err) return err;
    this.state.job = {
      id: job.id,
      name: job.name,
      salary: job.salary,
      remote: job.remote,
      remoteUnlocked: !job.remote || job.remoteAfterDays === 0,
      shiftStart: job.shiftStart,
      shiftEnd: job.shiftEnd,
      employedDay: this.state.day,
      daysWorked: 0,
      workedToday: false,
      shiftOpen: false,
    };
    return null;
  }

  quit(): void {
    this.state.job = null;
  }

  isPieceworkJob(): boolean {
    return (
      this.isCourierJob() ||
      this.isTaxiJob() ||
      this.isPoliceJob() ||
      this.isFirefighterJob()
    );
  }

  isTaxiJob(): boolean {
    const cfg = this.getJobById(this.state.job?.id ?? '');
    return cfg?.jobType === 'taxi' || cfg?.id === 'taxi';
  }

  isPoliceJob(): boolean {
    const cfg = this.getJobById(this.state.job?.id ?? '');
    return cfg?.jobType === 'police' || cfg?.id === 'police';
  }

  isFirefighterJob(): boolean {
    const cfg = this.getJobById(this.state.job?.id ?? '');
    return cfg?.jobType === 'firefighter' || cfg?.id === 'firefighter';
  }

  isEmergencyJob(): boolean {
    return this.isPoliceJob() || this.isFirefighterJob();
  }

  isShiftOpen(): boolean {
    return this.state.job?.shiftOpen === true;
  }

  openShift(): string | null {
    if (!this.state.job) return 'Нет работы';
    if (!this.isPieceworkJob()) return 'Смена только для сдельных профессий';
    this.state.job.shiftOpen = true;
    return null;
  }

  /** End accepting new orders; fails if active piecework order. */
  closeShift(hasActiveOrder: boolean): string | null {
    if (!this.state.job) return 'Нет работы';
    if (!this.isPieceworkJob()) return 'Смена только для сдельных профессий';
    if (hasActiveOrder) return 'Сначала завершите текущий заказ/вызов';
    this.state.job.shiftOpen = false;
    this.state.lifeStats.shiftsWorked += 1;
    return null;
  }

  hasJob(): boolean {
    return this.state.job !== null;
  }

  getCurrentJob() {
    return this.state.job;
  }

  isViolentJobActive(): boolean {
    const cfg = this.getJobById(this.state.job?.id ?? '');
    return cfg?.violent === true;
  }

  isCourierJob(): boolean {
    const cfg = this.getJobById(this.state.job?.id ?? '');
    return cfg?.jobType === 'courier' || cfg?.id === 'courier';
  }

  canWorkRemote(): boolean {
    if (this.isCourierJob()) return false;
    const j = this.state.job;
    if (!j?.remote || !j.remoteUnlocked) return false;
    if (!this.hasDeskAtHome()) return false;
    return !j.workedToday;
  }

  private hasDeskAtHome(): boolean {
    return Object.values(this.state.furniturePlaced).some((id) => id.startsWith('desk_'));
  }

  workShift(atOffice: boolean, hour: number): string | null {
    const job = this.state.job;
    if (!job) return 'Вы не устроены на работу';
    if (this.isCourierJob()) return 'Курьер работает по доставкам — возьмите заказ на складе';
    if (this.isTaxiJob()) return 'Таксист работает по заказам — депо / смартфон';
    if (this.isEmergencyJob()) return 'Экстренная служба — вызовы на участке, не офисная смена';
    if (job.workedToday) return 'Сегодня смена уже отработана';

    if (!atOffice) {
      if (!job.remote || !job.remoteUnlocked) return 'Эта работа только в офисе';
      if (!this.hasDeskAtHome()) return 'Нужен рабочий стол дома';
    } else {
      const cfg = this.getJobById(job.id);
      if (!cfg) return 'Ошибка работы';
      const inShift =
        cfg.shiftStart <= cfg.shiftEnd
          ? hour >= cfg.shiftStart && hour < cfg.shiftEnd
          : hour >= cfg.shiftStart || hour < cfg.shiftEnd;
      if (!inShift) return `Смена ${cfg.shiftStart}:00–${cfg.shiftEnd}:00`;
    }

    job.workedToday = true;
    job.daysWorked += 1;
    if (!job.remoteUnlocked && job.remote) {
      const cfg = this.getJobById(job.id);
      if (cfg && job.daysWorked >= cfg.remoteAfterDays) job.remoteUnlocked = true;
    }
    this.state.money += job.salary;
    this.state.lifeStats.shiftsWorked += 1;
    if (!atOffice) this.state.lifeStats.remoteShifts += 1;
    return null;
  }

  getJobNearHr(px: number, py: number, mapId: string, maxDist = 40): JobConfig | null {
    let best: JobConfig | null = null;
    let bestDist = maxDist;
    for (const job of this.getJobsForMap(mapId)) {
      const hx = job.hrX * TILE_SIZE + TILE_SIZE / 2;
      const hy = job.hrY * TILE_SIZE + TILE_SIZE / 2;
      const dist = Math.hypot(px - hx, py - hy);
      if (dist < bestDist) {
        bestDist = dist;
        best = job;
      }
    }
    return best;
  }

  isAtJobDoor(job: JobConfig, px: number, py: number, maxDist = 40): boolean {
    const dx = job.doorX * TILE_SIZE + TILE_SIZE / 2;
    const dy = job.doorY * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(px - dx, py - dy) < maxDist;
  }
}