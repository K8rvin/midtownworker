import Phaser from 'phaser';
import { VehiclePhysics, type VehicleState } from '../systems/VehiclePhysics';
import { PathFollower } from '../world/PathFollower';
import type { NavigationGrid } from '../world/NavigationGrid';
import type { TrafficLightManager } from '../systems/TrafficLightManager';
import type { LaneNavigation, LaneSegment } from '../world/LaneNavigation';
import { TILE_SIZE } from '../config';
import { getAudio } from '../systems/AudioManager';
import vehiclesData from '../data/vehicles.json';

export interface VehicleConfig {
  id: string;
  name: string;
  color: string;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  friction?: number;
  grip?: number;
  brakePower?: number;
  hp: number;
  price: number;
  wheels?: number;
}

export class Vehicle {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public config: VehicleConfig;
  public hp: number;
  /** 0–100 fuel. Traffic AI ignores drain. */
  public fuel = 100;
  public readonly maxFuel = 100;
  public occupied = false;
  public isTraffic = false;
  /**
   * Player has taken this car (carjack / garage). Permanent for this instance:
   * re-enter must not re-trigger carjack / fleeing NPC / soft wanted.
   */
  public playerStolen = false;
  public active = true;
  public state: VehicleState;
  public pathFollower = new PathFollower();
  /** Last throttle used (for brake lights / smoke). */
  public lastThrottle = 0;
  private textureKey: string;
  private steerSmoothed = 0;
  private readonly steerSmoothRate = 6;
  private readonly steerDecayRate = 16;
  private laneSegmentId: string | null = null;
  private laneWaypointIndex = 0;
  private trafficStuckTimer = 0;
  private shadow: Phaser.GameObjects.Ellipse | null = null;
  private brakeLights: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: string, isTraffic = false) {
    const config = (vehiclesData as VehicleConfig[]).find((v) => v.id === type) ?? vehiclesData[0];
    this.config = config as VehicleConfig;
    this.hp = config.hp;
    this.isTraffic = isTraffic;
    this.textureKey = `vehicle_${type}`;

    this.sprite = scene.physics.add.sprite(x, y, this.textureKey);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDepth(2);
    this.sprite.setCollideWorldBounds(true);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const hitbox = this.getHitbox(type);
    body.setSize(hitbox.w, hitbox.h);
    body.setOffset(hitbox.ox, hitbox.oy);
    // Custom VehiclePhysics owns deceleration — no Arcade drag fight
    body.setDrag(0, 0);
    body.setMaxVelocity(config.maxSpeed * 1.15, config.maxSpeed * 1.15);

    this.state = { x, y, angle: 0, speed: 0, vx: 0, vy: 0 };

    // Soft ground shadow
    this.shadow = scene.add.ellipse(x, y + 4, hitbox.w + 4, 10, 0x000000, 0.28);
    this.shadow.setDepth(1);

    this.brakeLights = scene.add.graphics();
    this.brakeLights.setDepth(2.1);
  }

  syncFromPhysics(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    this.state.x = this.sprite.x;
    this.state.y = this.sprite.y;

    const blocked = body.blocked.up || body.blocked.down || body.blocked.left || body.blocked.right;
    if (blocked && !this.isTraffic) {
      // Slide along walls: kill normal component, keep tangential
      let vx = this.state.vx;
      let vy = this.state.vy;
      if (body.blocked.left || body.blocked.right) vx *= 0.15;
      if (body.blocked.up || body.blocked.down) vy *= 0.15;
      const rad = Phaser.Math.DegToRad(this.state.angle);
      const along = vx * Math.cos(rad) + vy * Math.sin(rad);
      this.state.speed = along * 0.55;
      this.state.vx = Math.cos(rad) * this.state.speed;
      this.state.vy = Math.sin(rad) * this.state.speed;
      body.setVelocity(this.state.vx, this.state.vy);
    } else {
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      const actualSpeed = Math.sqrt(vx * vx + vy * vy);
      if (actualSpeed > 1) {
        this.state.vx = vx;
        this.state.vy = vy;
        const rad = Phaser.Math.DegToRad(this.state.angle);
        const along = vx * Math.cos(rad) + vy * Math.sin(rad);
        if (Math.abs(along) > 1) {
          this.state.speed = along;
        }
      }
    }
  }

  updateDriving(throttle: number, steer: number, dt: number): void {
    this.syncFromPhysics();

    // Fuel: player cars only — empty tank blocks acceleration (brakes still work).
    let th = throttle;
    if (!this.isTraffic) {
      if (this.fuel <= 0 && th > 0) th = 0;
      const speedRatio = Math.min(1, Math.abs(this.state.speed) / Math.max(1, this.config.maxSpeed));
      if (th > 0.04 || speedRatio > 0.08) {
        // ~45–60s continuous full-speed drive empties a full tank.
        const burn = (0.9 + speedRatio * 1.6) * Math.max(0.15, Math.abs(th)) * dt * 1.15;
        this.fuel = Math.max(0, this.fuel - burn);
      }
    }
    this.lastThrottle = th;

    const steerTarget = Math.abs(steer) < 0.04 ? 0 : steer;
    const rate = steerTarget === 0 ? this.steerDecayRate : this.steerSmoothRate;
    const steerBlend = 1 - Math.exp(-rate * dt);
    this.steerSmoothed = Phaser.Math.Linear(this.steerSmoothed, steerTarget, steerBlend);

    const friction = this.config.friction ?? 2.5;
    const grip = this.config.grip ?? 8;
    const brakePower = this.config.brakePower ?? this.config.acceleration * 1.4;
    const fuelFactor = this.isTraffic || this.fuel > 5 ? 1 : this.fuel > 0 ? 0.45 : 0.12;

    this.state = VehiclePhysics.update(
      this.state,
      {
        maxSpeed: this.config.maxSpeed * fuelFactor,
        acceleration: this.config.acceleration * fuelFactor,
        handling: this.config.handling,
        friction,
        grip,
        brakePower,
      },
      th,
      steer,
      dt,
      this.steerSmoothed
    );

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(this.state.vx, this.state.vy);
    }
    this.sprite.setAngle(this.state.angle);
    this.updateVisuals();
  }

  refuel(amount: number | 'full'): void {
    if (amount === 'full') this.fuel = this.maxFuel;
    else this.fuel = Math.min(this.maxFuel, this.fuel + amount);
  }

  /**
   * Car-following: brake for vehicles ahead in the same lane corridor.
   * Returns throttle in [-1, desired] (negative = brake). Also clamps speed
   * so coasting cannot plow through the car ahead.
   */
  applyCarFollowing(others: Vehicle[], desiredThrottle: number): number {
    const lookDist = 150;
    const stopDist = 42;
    const slowDist = 95;
    const rad = Phaser.Math.DegToRad(this.state.angle);
    const fx = Math.cos(rad);
    const fy = Math.sin(rad);

    let nearest = Infinity;
    let leadSpeed = 0;

    for (const other of others) {
      if (other === this || !other.active || !other.sprite?.active) continue;
      const dx = other.sprite.x - this.sprite.x;
      const dy = other.sprite.y - this.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist > lookDist || dist < 1) continue;
      // Must be ahead along our heading
      const along = dx * fx + dy * fy;
      if (along < 12) continue;
      const lateral = Math.abs(dx * -fy + dy * fx);
      // Same-lane corridor (~ one car width + margin)
      if (lateral > 30) continue;
      // Prefer cars roughly same heading (not oncoming)
      const otherRad = Phaser.Math.DegToRad(other.state.angle);
      const headingDot = Math.cos(otherRad) * fx + Math.sin(otherRad) * fy;
      if (headingDot < -0.25) continue; // oncoming
      if (dist < nearest) {
        nearest = dist;
        leadSpeed = Math.abs(other.state.speed);
      }
    }

    if (nearest === Infinity) return desiredThrottle;

    // Emergency: almost touching — hard brake and match/stop
    if (nearest <= stopDist) {
      const cap = Math.min(leadSpeed * 0.35, 12);
      if (this.state.speed > cap) {
        this.state.speed = Phaser.Math.Linear(this.state.speed, cap, 0.55);
        this.state.vx = fx * this.state.speed;
        this.state.vy = fy * this.state.speed;
      }
      return -1;
    }

    // Close: ease throttle + cap speed near leader
    if (nearest <= slowDist) {
      const t = (nearest - stopDist) / (slowDist - stopDist); // 0 at stop, 1 at slowDist
      const speedCap = Phaser.Math.Linear(Math.max(leadSpeed * 0.85, 20), this.config.maxSpeed, t);
      if (this.state.speed > speedCap) {
        this.state.speed = Phaser.Math.Linear(this.state.speed, speedCap, 0.35);
        this.state.vx = fx * this.state.speed;
        this.state.vy = fy * this.state.speed;
      }
      if (this.state.speed > leadSpeed + 15 && leadSpeed > 5) {
        return -0.4 * (1 - t); // brake to match
      }
      return desiredThrottle * Math.max(0.05, t);
    }

    // Far but in sight: gentle slow if much faster than lead
    if (this.state.speed > leadSpeed + 40 && leadSpeed > 8) {
      return desiredThrottle * 0.55;
    }
    return desiredThrottle;
  }

  /** Push this car backward slightly if overlapping another (soft, no solid gridlock). */
  separateFrom(other: Vehicle, minDist = 36): void {
    if (!other.active || !other.sprite?.active) return;
    const dx = this.sprite.x - other.sprite.x;
    const dy = this.sprite.y - other.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= minDist || dist < 0.1) return;
    // Who is behind? Push rear car back
    const rad = Phaser.Math.DegToRad(this.state.angle);
    const fx = Math.cos(rad);
    const fy = Math.sin(rad);
    const along = (other.sprite.x - this.sprite.x) * fx + (other.sprite.y - this.sprite.y) * fy;
    // If other is ahead of us, we are the rear car — move back
    if (along > 0) {
      const push = (minDist - dist) * 0.55;
      this.sprite.x -= fx * push;
      this.sprite.y -= fy * push;
      this.state.x = this.sprite.x;
      this.state.y = this.sprite.y;
      this.state.speed = Math.min(this.state.speed, Math.abs(other.state.speed) * 0.7);
      this.state.vx = fx * this.state.speed;
      this.state.vy = fy * this.state.speed;
      const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
      body?.setVelocity(this.state.vx, this.state.vy);
    }
  }

  initLaneDriving(segment: LaneSegment, laneNav: LaneNavigation, wx: number, wy: number): void {
    this.laneSegmentId = segment.id;
    const nearest = laneNav.findNearestSegment(wx, wy);
    const useSegment = nearest?.segment.id === segment.id ? nearest.segment : segment;
    this.laneWaypointIndex =
      nearest?.segment.id === segment.id ? nearest.index : this.findNearestWaypointIndex(useSegment, wx, wy);
    const wp = useSegment.waypoints[this.laneWaypointIndex] ?? useSegment.waypoints[0];
    if (wp) {
      this.sprite.setPosition(wp.x, wp.y);
      this.state.x = wp.x;
      this.state.y = wp.y;
    }
    this.state.angle = laneNav.directionToAngle(useSegment.direction);
    this.state.speed = this.config.maxSpeed * 0.35;
    this.state.vx = 0;
    this.state.vy = 0;
    this.sprite.setAngle(this.state.angle);
    this.trafficStuckTimer = 0;
  }

  updateTraffic(
    dt: number,
    navigation?: NavigationGrid,
    trafficLights?: TrafficLightManager,
    laneNav?: LaneNavigation,
    otherVehicles?: Vehicle[]
  ): void {
    if (!this.isTraffic) return;

    if (laneNav) {
      if (!this.laneSegmentId || !laneNav.segments.has(this.laneSegmentId)) {
        const nearest = laneNav.findNearestSegment(this.sprite.x, this.sprite.y);
        if (nearest) this.initLaneDriving(nearest.segment, laneNav, this.sprite.x, this.sprite.y);
      }
      if (this.laneSegmentId) {
        this.updateLaneTraffic(dt, trafficLights, laneNav, navigation, otherVehicles);
        return;
      }
    }

    if (navigation) {
      this.updateRoadPathTraffic(dt, navigation, trafficLights, otherVehicles);
      return;
    }

    const throttle = 0.7;
    const steer = Math.sin(this.sprite.scene.time.now / 1000) * 0.2;
    this.updateDriving(throttle, steer, dt);
  }

  private updateRoadPathTraffic(
    dt: number,
    navigation: NavigationGrid,
    trafficLights?: TrafficLightManager,
    otherVehicles?: Vehicle[]
  ): void {
    this.pathFollower.tickRetarget(dt);
    if (this.pathFollower.getRetargetTimer() <= 0 || !this.pathFollower.hasPath()) {
      const dest = navigation.findRandomRoadTile();
      if (dest) {
        const start = navigation.worldToTile(this.sprite.x, this.sprite.y, TILE_SIZE);
        const path = navigation.findPath(start, dest, true);
        this.pathFollower.setPath(path);
        this.pathFollower.setRetargetTimer(8 + Math.random() * 8);
      }
    }
    const dir = this.pathFollower.getSteerDirection(this.sprite.x, this.sprite.y, TILE_SIZE, 20);
    let throttle = 0.65;
    let steer = 0;
    if (dir) {
      const targetAngle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x));
      const diff = Phaser.Math.Angle.WrapDegrees(targetAngle - this.state.angle);
      steer = Phaser.Math.Clamp(diff / 40, -1, 1);
      throttle = 0.78;
    }
    if (trafficLights?.shouldStop(this.sprite.x, this.sprite.y, this.state.angle)) {
      throttle = 0;
    }
    if (otherVehicles) {
      throttle = this.applyCarFollowing(otherVehicles, throttle);
    }
    this.updateDriving(throttle, steer, dt);
    this.tickTrafficStuck(dt, throttle);
  }

  private updateLaneTraffic(
    dt: number,
    trafficLights: TrafficLightManager | undefined,
    laneNav: LaneNavigation,
    navigation?: NavigationGrid,
    otherVehicles?: Vehicle[]
  ): void {
    const segment = laneNav.segments.get(this.laneSegmentId!);
    if (!segment) {
      this.laneSegmentId = null;
      return;
    }

    let steerResult = laneNav.getSteerDirection(
      this.sprite.x,
      this.sprite.y,
      segment,
      this.laneWaypointIndex,
      22
    );

    if (!steerResult) {
      const next = laneNav.pickNextSegment(segment.id);
      if (!next) {
        this.laneSegmentId = null;
        if (navigation) this.updateRoadPathTraffic(dt, navigation, trafficLights, otherVehicles);
        return;
      }
      this.laneSegmentId = next.id;
      this.laneWaypointIndex = 0;
      this.state.angle = laneNav.directionToAngle(next.direction);
      steerResult = laneNav.getSteerDirection(this.sprite.x, this.sprite.y, next, 0, 22);
      if (!steerResult) {
        this.updateDriving(0.55, 0, dt);
        this.tickTrafficStuck(dt, 0.55);
        return;
      }
    }

    this.laneWaypointIndex = steerResult.nextIndex;
    const targetAngle = Phaser.Math.RadToDeg(Math.atan2(steerResult.dir.y, steerResult.dir.x));
    const diff = Phaser.Math.Angle.WrapDegrees(targetAngle - this.state.angle);
    const steer = Phaser.Math.Clamp(diff / 30, -1, 1);
    let throttle = 0.78;

    if (trafficLights?.shouldStop(this.sprite.x, this.sprite.y, this.state.angle)) {
      throttle = 0;
    }
    if (otherVehicles) {
      throttle = this.applyCarFollowing(otherVehicles, throttle);
    }

    this.updateDriving(throttle, steer, dt);
    this.tickTrafficStuck(dt, throttle);
  }

  private tickTrafficStuck(dt: number, throttle: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    const actualSpeed = body ? Math.hypot(body.velocity.x, body.velocity.y) : 0;
    // Don't count as stuck when intentionally stopped behind traffic
    if (throttle > 0.25 && actualSpeed < 18) {
      this.trafficStuckTimer += dt;
    } else {
      this.trafficStuckTimer = 0;
    }
    // Rare recovery only — prefer following, not warping through cars
    if (this.trafficStuckTimer < 4.5) return;

    this.trafficStuckTimer = 0;
    this.laneWaypointIndex += 1;
    // Slight lateral lane re-snap instead of forward plow
    const rad = Phaser.Math.DegToRad(this.state.angle + 90);
    const side = Math.random() < 0.5 ? 1 : -1;
    this.sprite.setPosition(
      this.sprite.x + Math.cos(rad) * TILE_SIZE * 0.25 * side,
      this.sprite.y + Math.sin(rad) * TILE_SIZE * 0.25 * side
    );
    this.state.speed = Math.min(this.state.speed, this.config.maxSpeed * 0.2);
  }

  private findNearestWaypointIndex(segment: LaneSegment, wx: number, wy: number): number {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < segment.waypoints.length; i++) {
      const wp = segment.waypoints[i];
      const dist = Phaser.Math.Distance.Between(wx, wy, wp.x, wp.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  private updateVisuals(): void {
    if (this.shadow?.active) {
      const rad = Phaser.Math.DegToRad(this.state.angle);
      this.shadow.setPosition(
        this.sprite.x + Math.sin(rad) * 2,
        this.sprite.y + 5 + Math.abs(Math.cos(rad)) * 1
      );
      this.shadow.setAngle(this.state.angle);
    }

    // Damage tint
    const hpRatio = this.hp / this.config.hp;
    if (hpRatio < 0.35) {
      this.sprite.setTint(0xff6644);
    } else if (hpRatio < 0.65) {
      this.sprite.setTint(0xffaa66);
    } else if (!this.isTraffic) {
      this.sprite.clearTint();
    }

    // Brake lights when braking or reverse throttle
    if (this.brakeLights?.active) {
      this.brakeLights.clear();
      const braking = this.lastThrottle < -0.05 || (this.lastThrottle <= 0 && Math.abs(this.state.speed) > 40);
      if (braking && Math.abs(this.state.speed) > 5) {
        const rad = Phaser.Math.DegToRad(this.state.angle);
        const bx = this.sprite.x - Math.cos(rad) * 12;
        const by = this.sprite.y - Math.sin(rad) * 12;
        const perp = rad + Math.PI / 2;
        this.brakeLights.fillStyle(0xff2222, 0.85);
        this.brakeLights.fillCircle(bx + Math.cos(perp) * 5, by + Math.sin(perp) * 5, 2.2);
        this.brakeLights.fillCircle(bx - Math.cos(perp) * 5, by - Math.sin(perp) * 5, 2.2);
      }
    }
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.sprite.setTint(0xff6600);
    if (this.hp <= 0) {
      this.explode();
      return true;
    }
    return false;
  }

  explode(): void {
    this.active = false;
    const scene = this.sprite.scene;
    const x = this.sprite.x;
    const y = this.sprite.y;
    scene.events.emit('vehicle-destroyed');
    getAudio(scene).playSfx('explode');
    const vfx = scene.registry.get('vfx') as { explosion?: (x: number, y: number, s?: number) => void } | undefined;
    vfx?.explosion?.(x, y, this.isTraffic ? 1 : 1.2);
    this.shadow?.destroy();
    this.brakeLights?.destroy();
    this.sprite.destroy();
  }

  stopMovement(): void {
    this.state.speed = 0;
    this.state.vx = 0;
    this.state.vy = 0;
    this.lastThrottle = 0;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);
    this.updateVisuals();
  }

  /**
   * Player took the vehicle (carjack / garage) — stop NPC traffic AI permanently.
   * Without this, after exit Traffic AI resumes and the empty car drives away.
   * Also marks the car as abandoned/stolen so re-boarding is free of crime checks.
   */
  claimByPlayer(): void {
    this.isTraffic = false;
    this.playerStolen = true;
    this.laneSegmentId = null;
    this.laneWaypointIndex = 0;
    this.trafficStuckTimer = 0;
    this.stopMovement();
  }

  getType(): string {
    return this.config.id;
  }

  destroyExtras(): void {
    this.shadow?.destroy();
    this.brakeLights?.destroy();
  }

  private getHitbox(type: string): { w: number; h: number; ox: number; oy: number } {
    switch (type) {
      case 'bicycle':
      case 'moped':
      case 'motorcycle':
        return { w: 22, h: 10, ox: 3, oy: 3 };
      case 'truck':
      case 'van':
        return { w: 34, h: 16, ox: 3, oy: 3 };
      case 'sports':
        return { w: 28, h: 12, ox: 3, oy: 3 };
      case 'police':
        return { w: 30, h: 14, ox: 3, oy: 3 };
      default:
        return { w: 30, h: 14, ox: 3, oy: 3 };
    }
  }
}
