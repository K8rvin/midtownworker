import Phaser from 'phaser';
import type { TileCoord } from './NavigationGrid';

export class PathFollower {
  private path: TileCoord[] = [];
  private waypointIndex = 0;
  private retargetTimer = 0;

  setPath(path: TileCoord[] | null): void {
    this.path = path ?? [];
    this.waypointIndex = this.path.length > 1 ? 1 : 0;
  }

  clear(): void {
    this.path = [];
    this.waypointIndex = 0;
  }

  hasPath(): boolean {
    return this.path.length > 0 && this.waypointIndex < this.path.length;
  }

  getRetargetTimer(): number {
    return this.retargetTimer;
  }

  setRetargetTimer(v: number): void {
    this.retargetTimer = v;
  }

  tickRetarget(dt: number): void {
    this.retargetTimer -= dt;
  }

  /**
   * Returns normalized direction toward current waypoint in world space.
   */
  getSteerDirection(
    wx: number,
    wy: number,
    tileSize: number,
    arriveRadius = 14
  ): { x: number; y: number } | null {
    if (!this.hasPath()) return null;

    const wp = this.path[this.waypointIndex];
    const tx = wp.tx * tileSize + tileSize / 2;
    const ty = wp.ty * tileSize + tileSize / 2;
    const dist = Phaser.Math.Distance.Between(wx, wy, tx, ty);

    if (dist < arriveRadius) {
      this.waypointIndex++;
      if (!this.hasPath()) return null;
      const next = this.path[this.waypointIndex];
      const nx = next.tx * tileSize + tileSize / 2;
      const ny = next.ty * tileSize + tileSize / 2;
      const len = Math.hypot(nx - wx, ny - wy) || 1;
      return { x: (nx - wx) / len, y: (ny - wy) / len };
    }

    return { x: (tx - wx) / dist, y: (ty - wy) / dist };
  }
}