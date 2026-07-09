import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { PathFollower } from '../world/PathFollower';
import type { NavigationGrid } from '../world/NavigationGrid';
import { walkFrameIndex } from './walkAnim';

const PEDESTRIAN_TINTS = [0xffffff, 0xd4e4ff, 0xffe0cc, 0xe8ffd4, 0xffd4f0, 0xfff0c8];

export class Pedestrian {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public active = true;
  public pathFollower = new PathFollower();
  private retargetTimer = 0;
  private readonly speed: number;
  private waitTimer = 0;
  private stuckTimer = 0;
  private wanderTimer = 0;
  private wanderDir = { x: 0, y: 1 };
  private animTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, speed = 42) {
    this.speed = speed;
    this.sprite = scene.physics.add.sprite(x, y, 'npc_civilian', 0);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDepth(3);
    this.sprite.setScale(0.88);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setTint(Phaser.Utils.Array.GetRandom(PEDESTRIAN_TINTS));
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 14);
    body.setOffset(5, 8);
    this.retargetTimer = Phaser.Math.FloatBetween(0, 0.5);
    this.pickWanderDir();
  }

  update(dt: number, navigation: NavigationGrid, vehicles: { sprite: Phaser.Physics.Arcade.Sprite }[]): void {
    if (!this.active || !this.sprite.active || !this.sprite.body) return;

    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this.sprite.setVelocity(0, 0);
      this.syncWalkFrame(dt);
      return;
    }

    const flee = this.fleeFromVehicles(vehicles);
    if (flee) {
      this.sprite.setVelocity(flee.x * this.speed * 1.4, flee.y * this.speed * 1.4);
      this.retargetTimer = 0.2;
      this.stuckTimer = 0;
      this.wanderTimer = 0;
      this.syncWalkFrame(dt);
      return;
    }

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const actualSpeed = Math.hypot(body.velocity.x, body.velocity.y);
    if (actualSpeed < 6) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
    }

    if (this.stuckTimer > 0.5) {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.pickWanderDir();
        this.wanderTimer = Phaser.Math.FloatBetween(0.6, 1.1);
        this.pathFollower.clear();
        this.retargetTimer = 0;
      }
      this.sprite.setVelocity(this.wanderDir.x * this.speed, this.wanderDir.y * this.speed);
      if (this.stuckTimer > 1.2) {
        this.stuckTimer = 0;
        this.pickNewDestination(navigation);
      }
      this.syncWalkFrame(dt);
      return;
    }

    this.pathFollower.tickRetarget(dt);
    this.retargetTimer -= dt;

    if (this.retargetTimer <= 0 || !this.pathFollower.hasPath()) {
      this.pickNewDestination(navigation);
    }

    const dir = this.pathFollower.getSteerDirection(this.sprite.x, this.sprite.y, TILE_SIZE, 12);
    if (dir) {
      this.sprite.setVelocity(dir.x * this.speed, dir.y * this.speed);
    } else if (!this.pathFollower.hasPath()) {
      this.pickNewDestination(navigation);
    } else {
      this.sprite.setVelocity(0, 0);
      this.waitTimer = Phaser.Math.FloatBetween(0.1, 0.25);
      this.pathFollower.clear();
      this.retargetTimer = 0;
    }
    this.syncWalkFrame(dt);
  }

  private syncWalkFrame(dt: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const vx = body?.velocity.x ?? 0;
    const vy = body?.velocity.y ?? 0;
    this.animTime += dt;
    this.sprite.setFrame(walkFrameIndex(vx, vy, this.animTime, 4, 8));
  }

  destroy(): void {
    this.active = false;
    this.sprite.destroy();
  }

  private pickWanderDir(): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.wanderDir = { x: Math.cos(angle), y: Math.sin(angle) };
  }

  private pickNewDestination(navigation: NavigationGrid): void {
    const start = navigation.worldToTile(this.sprite.x, this.sprite.y, TILE_SIZE);
    if (!navigation.isSidewalk(start.tx, start.ty)) {
      const nearest = this.nearestSidewalk(navigation, start);
      if (nearest) {
        this.pathFollower.setPath(navigation.findSidewalkPath(start, nearest));
      }
      this.retargetTimer = 0.6;
      return;
    }

    for (let attempt = 0; attempt < 14; attempt++) {
      const dest = this.findNearbySidewalkTile(navigation, start, 24);
      if (!dest) break;
      const path = navigation.findSidewalkPath(start, dest);
      if (path && path.length > 1) {
        this.pathFollower.setPath(path);
        this.retargetTimer = Phaser.Math.FloatBetween(8, 18);
        return;
      }
    }

    this.retargetTimer = 0.35;
    this.pathFollower.clear();
    this.pickWanderDir();
    this.wanderTimer = 0.5;
  }

  private findNearbySidewalkTile(
    navigation: NavigationGrid,
    start: { tx: number; ty: number },
    radius: number
  ): { tx: number; ty: number } | null {
    const tiles: { tx: number; ty: number }[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const tx = start.tx + dx;
        const ty = start.ty + dy;
        if (!navigation.isSidewalk(tx, ty)) continue;
        if (dx === 0 && dy === 0) continue;
        tiles.push({ tx, ty });
      }
    }
    if (tiles.length === 0) return navigation.findRandomSidewalkTile();
    return Phaser.Utils.Array.GetRandom(tiles);
  }

  private nearestSidewalk(
    navigation: NavigationGrid,
    start: { tx: number; ty: number }
  ): { tx: number; ty: number } | null {
    let best: { tx: number; ty: number } | null = null;
    let bestDist = Infinity;
    for (let dy = -8; dy <= 8; dy++) {
      for (let dx = -8; dx <= 8; dx++) {
        const tx = start.tx + dx;
        const ty = start.ty + dy;
        if (!navigation.isSidewalk(tx, ty)) continue;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = { tx, ty };
        }
      }
    }
    return best;
  }

  private fleeFromVehicles(
    vehicles: { sprite: Phaser.Physics.Arcade.Sprite }[]
  ): { x: number; y: number } | null {
    for (const v of vehicles) {
      if (!v.sprite.active) continue;
      const body = v.sprite.body as Phaser.Physics.Arcade.Body | null;
      const speed = body ? Math.hypot(body.velocity.x, body.velocity.y) : 0;
      if (speed < 25) continue;
      const dist = Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        v.sprite.x,
        v.sprite.y
      );
      if (dist > 56) continue;
      const awayX = this.sprite.x - v.sprite.x;
      const awayY = this.sprite.y - v.sprite.y;
      const len = Math.hypot(awayX, awayY) || 1;
      return { x: awayX / len, y: awayY / len };
    }
    return null;
  }
}