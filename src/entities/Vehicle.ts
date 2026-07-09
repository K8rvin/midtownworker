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
  hp: number;
  price: number;
}

export class Vehicle {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public config: VehicleConfig;
  public hp: number;
  public occupied = false;
  public isTraffic = false;
  public active = true;
  public state: VehicleState;
  public pathFollower = new PathFollower();
  private textureKey: string;
  private steerSmoothed = 0;
  private readonly steerSmoothRate = 6;
  private readonly steerDecayRate = 16;
  private laneSegmentId: string | null = null;
  private laneWaypointIndex = 0;
  private trafficStuckTimer = 0;

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
    body.setDrag(isTraffic ? 30 : 120, isTraffic ? 30 : 120);
    body.setMaxVelocity(config.maxSpeed, config.maxSpeed);

    this.state = { x, y, angle: 0, speed: 0, vx: 0, vy: 0 };
  }

  syncFromPhysics(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    this.state.x = this.sprite.x;
    this.state.y = this.sprite.y;

    const blocked = body.blocked.up || body.blocked.down || body.blocked.left || body.blocked.right;
    if (blocked && !this.isTraffic) {
      this.state.speed *= 0.35;
      const rad = Phaser.Math.DegToRad(this.state.angle);
      this.state.vx = Math.cos(rad) * this.state.speed;
      this.state.vy = Math.sin(rad) * this.state.speed;
      body.setVelocity(this.state.vx, this.state.vy);
    } else {
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      const actualSpeed = Math.sqrt(vx * vx + vy * vy);
      if (actualSpeed > 1) {
        this.state.speed = actualSpeed * Math.sign(this.state.speed || 1);
      }
    }
  }

  updateDriving(throttle: number, steer: number, dt: number): void {
    this.syncFromPhysics();

    const steerTarget = Math.abs(steer) < 0.04 ? 0 : steer;
    const rate = steerTarget === 0 ? this.steerDecayRate : this.steerSmoothRate;
    const steerBlend = 1 - Math.exp(-rate * dt);
    this.steerSmoothed = Phaser.Math.Linear(this.steerSmoothed, steerTarget, steerBlend);

    this.state = VehiclePhysics.update(
      this.state,
      {
        maxSpeed: this.config.maxSpeed,
        acceleration: this.config.acceleration,
        handling: this.config.handling,
        friction: 2.5,
      },
      throttle,
      steer,
      dt,
      this.steerSmoothed
    );

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(this.state.vx, this.state.vy);
    }
    this.sprite.setAngle(this.state.angle);
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
    this.sprite.setAngle(this.state.angle);
    this.trafficStuckTimer = 0;
  }

  updateTraffic(
    dt: number,
    navigation?: NavigationGrid,
    trafficLights?: TrafficLightManager,
    laneNav?: LaneNavigation
  ): void {
    if (!this.isTraffic) return;

    if (laneNav) {
      if (!this.laneSegmentId || !laneNav.segments.has(this.laneSegmentId)) {
        const nearest = laneNav.findNearestSegment(this.sprite.x, this.sprite.y);
        if (nearest) this.initLaneDriving(nearest.segment, laneNav, this.sprite.x, this.sprite.y);
      }
      if (this.laneSegmentId) {
        this.updateLaneTraffic(dt, trafficLights, laneNav, navigation);
        return;
      }
    }

    if (navigation) {
      this.updateRoadPathTraffic(dt, navigation, trafficLights);
      return;
    }

    const throttle = 0.7;
    const steer = Math.sin(this.sprite.scene.time.now / 1000) * 0.2;
    this.updateDriving(throttle, steer, dt);
  }

  private updateRoadPathTraffic(
    dt: number,
    navigation: NavigationGrid,
    trafficLights?: TrafficLightManager
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
    this.updateDriving(throttle, steer, dt);
    this.tickTrafficStuck(dt, throttle);
  }

  private updateLaneTraffic(
    dt: number,
    trafficLights: TrafficLightManager | undefined,
    laneNav: LaneNavigation,
    navigation?: NavigationGrid
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
        if (navigation) this.updateRoadPathTraffic(dt, navigation, trafficLights);
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

    this.updateDriving(throttle, steer, dt);
    this.tickTrafficStuck(dt, throttle);
  }

  private tickTrafficStuck(dt: number, throttle: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    const actualSpeed = body ? Math.hypot(body.velocity.x, body.velocity.y) : 0;
    if (throttle > 0.2 && actualSpeed < 18) {
      this.trafficStuckTimer += dt;
    } else {
      this.trafficStuckTimer = 0;
    }
    if (this.trafficStuckTimer < 1.4) return;

    this.trafficStuckTimer = 0;
    this.laneWaypointIndex += 1;
    const rad = Phaser.Math.DegToRad(this.state.angle);
    const nudge = TILE_SIZE * 0.6;
    this.sprite.setPosition(this.sprite.x + Math.cos(rad) * nudge, this.sprite.y + Math.sin(rad) * nudge);
    this.state.speed = Math.max(this.state.speed, this.config.maxSpeed * 0.3);
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
    this.sprite.destroy();
  }

  stopMovement(): void {
    this.state.speed = 0;
    this.state.vx = 0;
    this.state.vy = 0;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);
  }

  getType(): string {
    return this.config.id;
  }

  private getHitbox(type: string): { w: number; h: number; ox: number; oy: number } {
    switch (type) {
      case 'truck':
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