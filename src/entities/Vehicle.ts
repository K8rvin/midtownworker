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
    body.setDrag(120, 120);
    body.setMaxVelocity(config.maxSpeed, config.maxSpeed);

    this.state = { x, y, angle: 0, speed: 0, vx: 0, vy: 0 };
  }

  syncFromPhysics(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    this.state.x = this.sprite.x;
    this.state.y = this.sprite.y;

    const blocked = body.blocked.up || body.blocked.down || body.blocked.left || body.blocked.right;
    if (blocked) {
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
    this.laneWaypointIndex = nearest?.segment.id === segment.id ? nearest.index : 0;
    this.state.angle = laneNav.directionToAngle(segment.direction);
    this.sprite.setAngle(this.state.angle);
  }

  updateTraffic(
    dt: number,
    navigation?: NavigationGrid,
    trafficLights?: TrafficLightManager,
    laneNav?: LaneNavigation
  ): void {
    if (!this.isTraffic) return;

    if (laneNav && this.laneSegmentId) {
      this.updateLaneTraffic(dt, trafficLights, laneNav);
      return;
    }

    if (navigation) {
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
      let throttle = 0.5;
      let steer = 0;
      if (dir) {
        const targetAngle = Phaser.Math.RadToDeg(Math.atan2(dir.y, dir.x));
        const diff = Phaser.Math.Angle.WrapDegrees(targetAngle - this.state.angle);
        steer = Phaser.Math.Clamp(diff / 40, -1, 1);
        throttle = 0.65;
      }
      if (trafficLights?.shouldStop(this.sprite.x, this.sprite.y, this.state.angle)) {
        throttle = 0;
      }
      this.updateDriving(throttle, steer, dt);
      return;
    }

    const throttle = 0.6;
    const steer = Math.sin(this.sprite.scene.time.now / 1000) * 0.3;
    this.updateDriving(throttle, steer, dt);
  }

  private updateLaneTraffic(
    dt: number,
    trafficLights: TrafficLightManager | undefined,
    laneNav: LaneNavigation
  ): void {
    const segment = laneNav.segments.get(this.laneSegmentId!);
    if (!segment) return;

    let steerResult = laneNav.getSteerDirection(
      this.sprite.x,
      this.sprite.y,
      segment,
      this.laneWaypointIndex,
      18
    );

    if (!steerResult) {
      const next = laneNav.pickNextSegment(segment.id);
      if (!next) {
        this.updateDriving(0, 0, dt);
        return;
      }
      this.laneSegmentId = next.id;
      this.laneWaypointIndex = 0;
      this.state.angle = laneNav.directionToAngle(next.direction);
      steerResult = laneNav.getSteerDirection(
        this.sprite.x,
        this.sprite.y,
        next,
        0,
        18
      );
      if (!steerResult) {
        this.updateDriving(0.4, 0, dt);
        return;
      }
    }

    this.laneWaypointIndex = steerResult.nextIndex;
    const targetAngle = Phaser.Math.RadToDeg(Math.atan2(steerResult.dir.y, steerResult.dir.x));
    const diff = Phaser.Math.Angle.WrapDegrees(targetAngle - this.state.angle);
    const steer = Phaser.Math.Clamp(diff / 35, -1, 1);
    let throttle = 0.6;

    if (trafficLights?.shouldStop(this.sprite.x, this.sprite.y, this.state.angle)) {
      throttle = 0;
    }

    this.updateDriving(throttle, steer, dt);
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