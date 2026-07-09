import Phaser from 'phaser';
import { TILE_SIZE, type GameState } from '../config';
import { Vehicle } from '../entities/Vehicle';
import { Pedestrian } from '../entities/Pedestrian';
import type { CityMap } from '../world/CityMap';

const FINE_BASE = 80;
const ARREST_FINE = 180;
const CATCH_DIST = 42;
const CHASE_SPEED = 130;

/**
 * Life-sim carjack consequences: fleeing driver + optional soft police chase.
 * Full GTA wanted/blockposts stay off.
 */
export class SoftCrimeManager {
  public softWanted = 0;
  private chaseVehicle: Vehicle | null = null;
  private fleeingPed: Pedestrian | null = null;
  private chaseTimer = 0;
  private pendingChoice = false;
  private lastStolenType: string | null = null;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private cityMap: CityMap
  ) {}

  /** Call when player steals a non-owned vehicle. */
  onCarjack(
    vehicle: Vehicle,
    playerPos: { x: number; y: number },
    ownedTypes: string[]
  ): { message: string; policeAlerted: boolean } {
    if (ownedTypes.includes(vehicle.getType())) {
      return { message: '', policeAlerted: false };
    }
    if (vehicle.isTraffic === false && ownedTypes.includes(vehicle.config.id)) {
      return { message: '', policeAlerted: false };
    }

    this.lastStolenType = vehicle.getType();
    this.state.stats.vehiclesStolen += 1;

    // Fleeing former driver
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const fx = playerPos.x + Math.cos(angle) * 28;
    const fy = playerPos.y + Math.sin(angle) * 28;
    try {
      this.fleeingPed?.destroy();
      this.fleeingPed = new Pedestrian(this.scene, fx, fy, 90);
      this.fleeingPed.sprite.setTint(0xffaaaa);
    } catch {
      this.fleeingPed = null;
    }

    // Soft police: always small wanted; spawn chase if chance or wanted builds
    this.softWanted = Math.min(3, this.softWanted + 1);
    const alert = Math.random() < 0.4 + this.softWanted * 0.15;
    if (alert) {
      this.spawnChase(playerPos);
      return {
        message: 'Водитель убежал! Полиция рядом — вас заметили',
        policeAlerted: true,
      };
    }
    return {
      message: 'Водитель выбежал и убежал. Лучше уехать',
      policeAlerted: false,
    };
  }

  private spawnChase(near: { x: number; y: number }): void {
    this.clearChaseVehicleOnly();
    const ox = near.x + Phaser.Math.Between(-80, 80);
    const oy = near.y + Phaser.Math.Between(-80, 80);
    const v = new Vehicle(this.scene, ox, oy, 'police', false);
    v.state.angle = Phaser.Math.RadToDeg(Math.atan2(near.y - oy, near.x - ox));
    this.chaseVehicle = v;
    this.chaseTimer = 0;
  }

  update(
    dt: number,
    player: {
      getPosition: () => { x: number; y: number };
      inVehicle: boolean;
      currentVehicle: Vehicle | null;
      takeDamage?: (n: number) => void;
    },
    onCaught: (options: { fine: number; arrestFine: number }) => void
  ): void {
    // Fleeing ped runs away from player
    if (this.fleeingPed?.active) {
      const p = player.getPosition();
      const ped = this.fleeingPed.sprite;
      const dx = ped.x - p.x;
      const dy = ped.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      ped.setVelocity((dx / len) * 70, (dy / len) * 70);
      if (len > 400) {
        this.fleeingPed.destroy();
        this.fleeingPed = null;
      }
    }

    if (!this.chaseVehicle?.active || this.pendingChoice) return;
    if (this.softWanted <= 0) {
      this.clearChase();
      return;
    }

    const p = player.getPosition();
    const cop = this.chaseVehicle;
    const dx = p.x - cop.sprite.x;
    const dy = p.y - cop.sprite.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ang = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    cop.state.angle = ang;
    cop.state.speed = CHASE_SPEED;
    cop.state.vx = (dx / dist) * CHASE_SPEED;
    cop.state.vy = (dy / dist) * CHASE_SPEED;
    const body = cop.sprite.body as Phaser.Physics.Arcade.Body;
    body?.setVelocity(cop.state.vx, cop.state.vy);
    cop.sprite.setAngle(ang);

    this.chaseTimer += dt;
    if (dist < CATCH_DIST && this.chaseTimer > 1.2) {
      this.pendingChoice = true;
      onCaught({
        fine: FINE_BASE + this.softWanted * 40,
        arrestFine: ARREST_FINE + this.softWanted * 50,
      });
    }

    // Lose chase if far
    if (dist > 900) {
      this.softWanted = Math.max(0, this.softWanted - 1);
      this.clearChase();
    }
  }

  resolveFine(fine: number): string {
    this.state.money = Math.max(0, this.state.money - fine);
    this.softWanted = 0;
    this.pendingChoice = false;
    this.clearChase();
    return `Штраф $${fine} оплачен. Авто конфисковано.`;
  }

  resolveArrest(fine: number): string {
    this.state.money = Math.max(0, this.state.money - fine);
    this.state.stats.arrests += 1;
    this.state.health = Math.max(20, this.state.health - 10);
    this.softWanted = 0;
    this.pendingChoice = false;
    this.clearChase();
    // Teleport near midtown
    return `Арест: −$${fine}. Отпустили с участком.`;
  }

  getArrestSpawn(): { x: number; y: number } {
    return {
      x: 100 * TILE_SIZE + TILE_SIZE / 2,
      y: 100 * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  isPendingChoice(): boolean {
    return this.pendingChoice;
  }

  getChaseVehicle(): Vehicle | null {
    return this.chaseVehicle;
  }

  clearChase(): void {
    this.clearChaseVehicleOnly();
    this.pendingChoice = false;
  }

  private clearChaseVehicleOnly(): void {
    if (this.chaseVehicle?.active) {
      this.chaseVehicle.destroyExtras();
      this.chaseVehicle.sprite.destroy();
    }
    this.chaseVehicle = null;
  }

  destroy(): void {
    this.clearChase();
    this.fleeingPed?.destroy();
    this.fleeingPed = null;
  }
}
