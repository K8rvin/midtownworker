import Phaser from 'phaser';
import { TILE_SIZE, type GameState } from '../config';
import { Vehicle } from '../entities/Vehicle';
import { Pedestrian } from '../entities/Pedestrian';
import type { CityMap } from '../world/CityMap';
import type { LaneNavigation } from '../world/LaneNavigation';

/** Pay fine if you have money; arrest is free but costs time/needs. */
const FINE_BASE = 55;
const FINE_PER_WANTED = 20;
const ARREST_MONEY = 0; // intentional: choose arrest when broke
const CATCH_DIST = 44;
const CHASE_SPEED = 135;
/** Only witnesses within this radius start a chase (no spawn-on-crime). */
const WITNESS_RADIUS = 240;
const PATROL_COUNT = 2;
const FOOT_PATROL_COUNT = 2;

/**
 * Life-sim crime: patrol units on the map; chase only if they witness a crime.
 */
export class SoftCrimeManager {
  public softWanted = 0;
  private chaseVehicle: Vehicle | null = null;
  private fleeingPed: Pedestrian | null = null;
  private chaseTimer = 0;
  private pendingChoice = false;
  private patrolCars: Vehicle[] = [];
  private footCops: Pedestrian[] = [];
  private laneNav: LaneNavigation | null = null;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private cityMap: CityMap
  ) {}

  setLaneNav(laneNav: LaneNavigation | null): void {
    this.laneNav = laneNav;
  }

  /** Spawn patrol cars + foot officers across the city (not on the player). */
  spawnPatrols(): void {
    this.clearPatrolsOnly();
    const nav = this.cityMap.navigation;
    for (let i = 0; i < PATROL_COUNT; i++) {
      const tile = nav?.findRandomRoadTile?.() ?? {
        tx: 40 + i * 40,
        ty: 60 + i * 30,
      };
      const pos = this.cityMap.tileToWorld(tile.tx, tile.ty);
      // Keep spawn away from typical start area if possible
      const v = new Vehicle(this.scene, pos.x, pos.y, 'police', true);
      v.isTraffic = true;
      if (this.laneNav) {
        const nearest = this.laneNav.findNearestSegment(pos.x, pos.y);
        if (nearest) v.initLaneDriving(nearest.segment, this.laneNav, pos.x, pos.y);
      }
      this.patrolCars.push(v);
    }
    for (let i = 0; i < FOOT_PATROL_COUNT; i++) {
      const side = nav?.findRandomSidewalkTile?.() ?? {
        tx: 70 + i * 25,
        ty: 90 + i * 20,
      };
      const pos = this.cityMap.tileToWorld(side.tx, side.ty);
      try {
        const p = new Pedestrian(this.scene, pos.x, pos.y, 38);
        p.sprite.setTint(0xffd600);
        this.footCops.push(p);
      } catch {
        /* ignore */
      }
    }
  }

  getPatrolVehicles(): Vehicle[] {
    return this.patrolCars.filter((v) => v.active);
  }

  /** Call when player steals a non-owned vehicle. */
  onCarjack(
    vehicle: Vehicle,
    playerPos: { x: number; y: number },
    ownedTypes: string[]
  ): { message: string; policeAlerted: boolean } {
    if (ownedTypes.includes(vehicle.getType()) && !vehicle.isTraffic) {
      return { message: '', policeAlerted: false };
    }

    this.state.stats.vehiclesStolen += 1;

    // Driver abandoned the car — no more traffic AI on this vehicle
    vehicle.claimByPlayer();
    vehicle.occupied = true; // player is boarding

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

    this.softWanted = Math.min(3, this.softWanted + 1);

    // Witness check — only existing patrols in radius (never spawn at player)
    const witness = this.findWitness(playerPos);
    if (witness) {
      this.startChaseFromPatrol(witness, playerPos);
      return {
        message: 'Вас заметил патруль! Полиция преследует',
        policeAlerted: true,
      };
    }
    return {
      message: 'Водитель убежал. Полиции рядом не было — уезжайте',
      policeAlerted: false,
    };
  }

  private findWitness(playerPos: { x: number; y: number }): Vehicle | Pedestrian | null {
    let best: Vehicle | Pedestrian | null = null;
    let bestD = WITNESS_RADIUS;
    for (const v of this.patrolCars) {
      if (!v.active || !v.sprite?.active) continue;
      const d = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, v.sprite.x, v.sprite.y);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    for (const p of this.footCops) {
      if (!p.active || !p.sprite?.active) continue;
      const d = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, p.sprite.x, p.sprite.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private startChaseFromPatrol(witness: Vehicle | Pedestrian, playerPos: { x: number; y: number }): void {
    this.clearChaseVehicleOnly();
    if (witness instanceof Vehicle) {
      this.chaseVehicle = witness;
      this.chaseVehicle.isTraffic = false; // leave normal traffic loop
      this.chaseTimer = 0;
      return;
    }
    // Foot cop radioed a car — pull nearest patrol car into chase, or create one only at foot cop pos (not player)
    const nearestCar = this.patrolCars.find((v) => v.active);
    if (nearestCar) {
      this.chaseVehicle = nearestCar;
      this.chaseVehicle.isTraffic = false;
      this.chaseTimer = 0;
      return;
    }
    // Last resort: spawn at witness position (officer called backup to their location)
    const v = new Vehicle(this.scene, witness.sprite.x, witness.sprite.y, 'police', false);
    v.state.angle = Phaser.Math.RadToDeg(
      Math.atan2(playerPos.y - witness.sprite.y, playerPos.x - witness.sprite.x)
    );
    this.chaseVehicle = v;
    this.chaseTimer = 0;
  }

  computeFine(): number {
    return FINE_BASE + this.softWanted * FINE_PER_WANTED;
  }

  /** Arrest never charges big money — time/needs penalty instead. */
  computeArrestMoney(): number {
    return ARREST_MONEY;
  }

  update(
    dt: number,
    player: {
      getPosition: () => { x: number; y: number };
      inVehicle: boolean;
      currentVehicle: Vehicle | null;
    },
    onCaught: (options: { fine: number; arrestMoney: number; canPayFine: boolean }) => void,
    trafficUpdate?: (v: Vehicle, dt: number) => void
  ): void {
    // Fleeing ped
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

    // Patrol cars continue lane traffic when not chasing
    const nav = this.cityMap.navigation;
    for (const v of this.patrolCars) {
      if (!v.active || v.occupied) continue;
      if (v === this.chaseVehicle) continue;
      if (trafficUpdate) trafficUpdate(v, dt);
      else if (this.laneNav) {
        v.updateTraffic(dt, nav, undefined, this.laneNav, this.patrolCars);
      }
    }
    for (const p of this.footCops) {
      if (p.active) p.update(dt, nav!, []);
    }

    if (!this.chaseVehicle?.active || this.pendingChoice) return;
    if (this.softWanted <= 0) {
      this.releaseChaseToPatrol();
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
      const fine = this.computeFine();
      onCaught({
        fine,
        arrestMoney: this.computeArrestMoney(),
        canPayFine: this.state.money >= fine,
      });
    }

    if (dist > 950) {
      this.softWanted = Math.max(0, this.softWanted - 1);
      this.releaseChaseToPatrol();
    }
  }

  resolveFine(fine: number): string {
    if (this.state.money < fine) {
      return `Не хватает денег на штраф $${fine}`;
    }
    this.state.money -= fine;
    this.softWanted = 0;
    this.pendingChoice = false;
    this.releaseChaseToPatrol();
    return `Штраф $${fine} оплачен. Авто конфисковано.`;
  }

  resolveArrest(_money = 0): string {
    // No big fee — you pick this when broke
    this.state.stats.arrests += 1;
    this.state.health = Math.max(20, this.state.health - 5);
    this.state.sleep = Math.max(15, this.state.sleep - 12);
    this.state.hunger = Math.max(15, this.state.hunger - 8);
    // Advance time ~3 hours in the station
    this.state.hour = (this.state.hour + 3) % 24;
    if (this.state.hour < 3) this.state.day += 1;
    this.softWanted = 0;
    this.pendingChoice = false;
    this.releaseChaseToPatrol();
    return 'Арест: без штрафа. Несколько часов в участке, усталость. Авто конфисковано.';
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

  private releaseChaseToPatrol(): void {
    if (this.chaseVehicle?.active) {
      // Return unit to patrol list if it was ours
      if (!this.patrolCars.includes(this.chaseVehicle)) {
        this.patrolCars.push(this.chaseVehicle);
      }
      this.chaseVehicle.isTraffic = true;
    }
    this.chaseVehicle = null;
    this.pendingChoice = false;
  }

  private clearChaseVehicleOnly(): void {
    // Do not destroy patrol cars — only clear chase pointer
    if (this.chaseVehicle && !this.patrolCars.includes(this.chaseVehicle)) {
      // backup spawn car — destroy if not in patrol
      if (this.chaseVehicle.active) {
        this.chaseVehicle.destroyExtras();
        this.chaseVehicle.sprite.destroy();
      }
    }
    this.chaseVehicle = null;
  }

  private clearPatrolsOnly(): void {
    for (const v of this.patrolCars) {
      if (v.active) {
        v.destroyExtras();
        v.sprite.destroy();
      }
    }
    this.patrolCars = [];
    for (const p of this.footCops) p.destroy();
    this.footCops = [];
  }

  destroy(): void {
    this.clearChaseVehicleOnly();
    this.clearPatrolsOnly();
    this.fleeingPed?.destroy();
    this.fleeingPed = null;
    this.pendingChoice = false;
  }
}
