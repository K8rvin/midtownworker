import { TILE_SIZE } from '../config';
import type { RoadBand, RoadIntersection, RoadNetwork } from './RoadNetwork';

export type LaneDirection = 'east' | 'west' | 'south' | 'north';

export interface LaneWaypoint {
  x: number;
  y: number;
}

export interface LaneSegment {
  id: string;
  direction: LaneDirection;
  waypoints: LaneWaypoint[];
  links: { straight?: string; left?: string; right?: string };
}

const INTERSECTION_RADIUS = 3;

export class LaneNavigation {
  public readonly segments = new Map<string, LaneSegment>();

  constructor(private network: RoadNetwork) {
    this.build();
  }

  directionToAngle(dir: LaneDirection): number {
    switch (dir) {
      case 'east':
        return 0;
      case 'south':
        return 90;
      case 'west':
        return 180;
      case 'north':
        return 270;
    }
  }

  findNearestSegment(wx: number, wy: number): { segment: LaneSegment; index: number } | null {
    const tx = wx / TILE_SIZE;
    const ty = wy / TILE_SIZE;
    let best: { segment: LaneSegment; index: number; dist: number } | null = null;

    for (const segment of this.segments.values()) {
      for (let i = 0; i < segment.waypoints.length; i++) {
        const wp = segment.waypoints[i];
        const dx = wp.x - wx;
        const dy = wp.y - wy;
        const dist = dx * dx + dy * dy;
        if (!best || dist < best.dist) {
          best = { segment, index: i, dist };
        }
      }
    }

    return best ? { segment: best.segment, index: best.index } : null;
  }

  pickNextSegment(fromId: string, rng = Math.random): LaneSegment | null {
    const current = this.segments.get(fromId);
    if (!current) return null;

    const roll = rng();
    let nextId: string | undefined;
    if (roll < 0.62) nextId = current.links.straight;
    else if (roll < 0.81) nextId = current.links.left;
    else nextId = current.links.right;

    if (!nextId) nextId = current.links.straight ?? current.links.left ?? current.links.right;
    if (!nextId) return current;
    return this.segments.get(nextId) ?? current;
  }

  getSteerDirection(
    wx: number,
    wy: number,
    segment: LaneSegment,
    waypointIndex: number,
    arriveRadius = 16
  ): { dir: { x: number; y: number }; nextIndex: number } | null {
    if (waypointIndex >= segment.waypoints.length) return null;

    const wp = segment.waypoints[waypointIndex];
    const dx = wp.x - wx;
    const dy = wp.y - wy;
    const dist = Math.hypot(dx, dy);

    if (dist < arriveRadius) {
      const nextIndex = waypointIndex + 1;
      if (nextIndex >= segment.waypoints.length) return null;
      const next = segment.waypoints[nextIndex];
      const ndx = next.x - wx;
      const ndy = next.y - wy;
      const len = Math.hypot(ndx, ndy) || 1;
      return { dir: { x: ndx / len, y: ndy / len }, nextIndex };
    }

    return { dir: { x: dx / dist, y: dy / dist }, nextIndex: waypointIndex };
  }

  private build(): void {
    const pendingLinks: {
      segmentId: string;
      direction: LaneDirection;
      intersection: RoadIntersection;
      end: 'start' | 'end';
    }[] = [];

    // Right-hand traffic (y increases south): east on south side, west on north.
    for (const band of this.network.horizontalBands) {
      this.buildHorizontalLane(band, 'east', 1, pendingLinks);
      this.buildHorizontalLane(band, 'west', -1, pendingLinks);
    }
    // Southbound uses west side (right), northbound uses east side.
    for (const band of this.network.verticalBands) {
      this.buildVerticalLane(band, 'south', -1, pendingLinks);
      this.buildVerticalLane(band, 'north', 1, pendingLinks);
    }

    this.resolveLinks(pendingLinks);
  }

  private buildHorizontalLane(
    band: RoadBand,
    direction: 'east' | 'west',
    laneOffset: number,
    pending: {
      segmentId: string;
      direction: LaneDirection;
      intersection: RoadIntersection;
      end: 'start' | 'end';
    }[]
  ): void {
    const y = band.center + laneOffset;
    if (y < 0 || y >= this.network.mapHeight) return;

    const xs =
      direction === 'east'
        ? Array.from({ length: this.network.mapWidth }, (_, i) => i)
        : Array.from({ length: this.network.mapWidth }, (_, i) => this.network.mapWidth - 1 - i);

    let chunk: LaneWaypoint[] = [];
    let segIndex = 0;
    let chunkStartInter: RoadIntersection | null = null;

    const flush = (endInter: RoadIntersection | null) => {
      if (chunk.length < 2) {
        chunk = [];
        chunkStartInter = null;
        return;
      }
      const id = `h${band.center}_${direction}_${segIndex++}`;
      const segment: LaneSegment = { id, direction, waypoints: chunk, links: {} };
      this.segments.set(id, segment);
      if (chunkStartInter) pending.push({ segmentId: id, direction, intersection: chunkStartInter, end: 'start' });
      if (endInter) pending.push({ segmentId: id, direction, intersection: endInter, end: 'end' });
      chunk = [];
      chunkStartInter = null;
    };

    for (const x of xs) {
      if (!this.network.isRoad(x, y)) {
        flush(this.findIntersectionAt(x, band.center));
        continue;
      }

      const inter = this.intersectionAt(x, y, band.center, 'h');
      if (inter && chunk.length > 0) {
        flush(inter);
        chunkStartInter = inter;
      } else if (inter && chunk.length === 0) {
        chunkStartInter = inter;
      }

      chunk.push(this.tileCenter(x, y));
    }
    flush(null);
  }

  private buildVerticalLane(
    band: RoadBand,
    direction: 'south' | 'north',
    laneOffset: number,
    pending: {
      segmentId: string;
      direction: LaneDirection;
      intersection: RoadIntersection;
      end: 'start' | 'end';
    }[]
  ): void {
    const x = band.center + laneOffset;
    if (x < 0 || x >= this.network.mapWidth) return;

    const ys =
      direction === 'south'
        ? Array.from({ length: this.network.mapHeight }, (_, i) => i)
        : Array.from({ length: this.network.mapHeight }, (_, i) => this.network.mapHeight - 1 - i);

    let chunk: LaneWaypoint[] = [];
    let segIndex = 0;
    let chunkStartInter: RoadIntersection | null = null;

    const flush = (endInter: RoadIntersection | null) => {
      if (chunk.length < 2) {
        chunk = [];
        chunkStartInter = null;
        return;
      }
      const id = `v${band.center}_${direction}_${segIndex++}`;
      const segment: LaneSegment = { id, direction, waypoints: chunk, links: {} };
      this.segments.set(id, segment);
      if (chunkStartInter) pending.push({ segmentId: id, direction, intersection: chunkStartInter, end: 'start' });
      if (endInter) pending.push({ segmentId: id, direction, intersection: endInter, end: 'end' });
      chunk = [];
      chunkStartInter = null;
    };

    for (const y of ys) {
      if (!this.network.isRoad(x, y)) {
        flush(this.findIntersectionAt(band.center, y));
        continue;
      }

      const inter = this.intersectionAt(x, y, band.center, 'v');
      if (inter && chunk.length > 0) {
        flush(inter);
        chunkStartInter = inter;
      } else if (inter && chunk.length === 0) {
        chunkStartInter = inter;
      }

      chunk.push(this.tileCenter(x, y));
    }
    flush(null);
  }

  private resolveLinks(
    pending: {
      segmentId: string;
      direction: LaneDirection;
      intersection: RoadIntersection;
      end: 'start' | 'end';
    }[]
  ): void {
    const byKey = new Map<string, { segmentId: string; direction: LaneDirection; end: 'start' | 'end' }[]>();

    for (const item of pending) {
      const key = `${item.intersection.tx},${item.intersection.ty}`;
      const list = byKey.get(key) ?? [];
      list.push(item);
      byKey.set(key, list);
    }

    for (const items of byKey.values()) {
      for (const item of items) {
        const seg = this.segments.get(item.segmentId);
        if (!seg) continue;
        const straight = this.findApproachSegment(items, item.direction, 'straight', item.end);
        const left = this.findApproachSegment(items, item.direction, 'left', item.end);
        const right = this.findApproachSegment(items, item.direction, 'right', item.end);
        if (item.end === 'end') {
          seg.links = { straight: straight?.segmentId, left: left?.segmentId, right: right?.segmentId };
        }
      }
    }

    for (const seg of this.segments.values()) {
      if (!seg.links.straight && !seg.links.left && !seg.links.right) {
        const loop = this.findContinuation(seg);
        if (loop) seg.links.straight = loop.id;
      }
    }
  }

  private findApproachSegment(
    items: { segmentId: string; direction: LaneDirection; end: 'start' | 'end' }[],
    fromDir: LaneDirection,
    turn: 'straight' | 'left' | 'right',
    end: 'start' | 'end'
  ): { segmentId: string } | null {
    const targetDir = this.turnDirection(fromDir, turn);
    const match = items.find((i) => i.direction === targetDir && i.end === (end === 'end' ? 'start' : 'end'));
    return match ? { segmentId: match.segmentId } : null;
  }

  private findContinuation(seg: LaneSegment): LaneSegment | null {
    if (seg.waypoints.length < 2) return null;
    const last = seg.waypoints[seg.waypoints.length - 1];
    const ltx = Math.floor(last.x / TILE_SIZE);
    const lty = Math.floor(last.y / TILE_SIZE);
    let best: LaneSegment | null = null;
    let bestDist = Infinity;
    for (const other of this.segments.values()) {
      if (other.id === seg.id || other.direction !== seg.direction) continue;
      const first = other.waypoints[0];
      const dx = first.x - last.x;
      const dy = first.y - last.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist && dist < TILE_SIZE * TILE_SIZE * 16) {
        bestDist = dist;
        best = other;
      }
    }
    return best;
  }

  private turnDirection(from: LaneDirection, turn: 'straight' | 'left' | 'right'): LaneDirection {
    const order: LaneDirection[] = ['east', 'south', 'west', 'north'];
    const idx = order.indexOf(from);
    if (turn === 'straight') return from;
    if (turn === 'left') return order[(idx + 3) % 4];
    return order[(idx + 1) % 4];
  }

  private intersectionAt(
    tx: number,
    ty: number,
    bandCenter: number,
    axis: 'h' | 'v'
  ): RoadIntersection | null {
    for (const inter of this.network.intersections) {
      if (Math.abs(tx - inter.tx) > INTERSECTION_RADIUS) continue;
      if (axis === 'h') {
        if (Math.abs(ty - bandCenter) <= INTERSECTION_RADIUS + 1) return inter;
      } else if (Math.abs(tx - bandCenter) <= INTERSECTION_RADIUS + 1) {
        if (Math.abs(ty - inter.ty) <= INTERSECTION_RADIUS) return inter;
      }
    }
    return null;
  }

  private findIntersectionAt(tx: number, ty: number): RoadIntersection | null {
    for (const inter of this.network.intersections) {
      if (Math.abs(tx - inter.tx) <= INTERSECTION_RADIUS && Math.abs(ty - inter.ty) <= INTERSECTION_RADIUS) {
        return inter;
      }
    }
    return null;
  }

  private tileCenter(tx: number, ty: number): LaneWaypoint {
    return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
  }
}