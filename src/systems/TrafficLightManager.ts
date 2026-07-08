import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import type { RoadIntersection, RoadNetwork } from '../world/RoadNetwork';

type TrafficPhase = 'ns' | 'ew';
type LightState = 'green' | 'yellow' | 'red';

interface TrafficLightPole {
  container: Phaser.GameObjects.Container;
  axis: 'ns' | 'ew';
  bulbs: Phaser.GameObjects.Arc[];
}

export class TrafficLightManager {
  private poles: TrafficLightPole[] = [];
  private phase: TrafficPhase = 'ns';
  private state: LightState = 'green';
  private timer = 0;
  private readonly greenDuration = 9;
  private readonly yellowDuration = 2.5;

  constructor(
    private scene: Phaser.Scene,
    private network: RoadNetwork
  ) {
    this.spawnLights();
  }

  update(dt: number): void {
    this.timer += dt;
    const limit = this.state === 'green' ? this.greenDuration : this.yellowDuration;
    if (this.timer < limit) return;

    this.timer = 0;
    if (this.state === 'green') {
      this.state = 'yellow';
    } else {
      this.state = 'green';
      this.phase = this.phase === 'ns' ? 'ew' : 'ns';
    }
    this.refreshBulbs();
  }

  shouldStop(wx: number, wy: number, angleDeg: number): boolean {
    const axis = this.network.getMovementAxis(angleDeg);
    const allowed = this.getAllowedAxis(axis);
    if (allowed === 'go') return false;

    const tx = Math.floor(wx / TILE_SIZE);
    const ty = Math.floor(wy / TILE_SIZE);

    for (const inter of this.network.intersections) {
      if (!inter.major) continue;
      if (Math.abs(tx - inter.tx) <= 2 && Math.abs(ty - inter.ty) <= 2) return false;
      if (!this.network.isApproachingIntersection(tx, ty, inter, axis)) continue;
      return true;
    }
    return false;
  }

  destroy(): void {
    for (const pole of this.poles) pole.container.destroy(true);
    this.poles = [];
  }

  private getAllowedAxis(axis: 'ns' | 'ew'): 'go' | 'stop' {
    if (this.state === 'green' && this.phase === axis) return 'go';
    if (this.state === 'yellow' && this.phase === axis) return 'go';
    return 'stop';
  }

  private spawnLights(): void {
    for (const inter of this.network.intersections) {
      if (!inter.major) continue;
      this.addPole(inter, 0, -5, 'ns');
      this.addPole(inter, 0, 5, 'ns');
      this.addPole(inter, -5, 0, 'ew');
      this.addPole(inter, 5, 0, 'ew');
    }
    this.refreshBulbs();
  }

  private addPole(inter: RoadIntersection, dx: number, dy: number, axis: 'ns' | 'ew'): void {
    const wx = inter.tx * TILE_SIZE + TILE_SIZE / 2 + dx * TILE_SIZE;
    const wy = inter.ty * TILE_SIZE + TILE_SIZE / 2 + dy * TILE_SIZE;
    const container = this.scene.add.container(wx, wy);
    container.setDepth(3);

    const post = this.scene.add.rectangle(0, 4, 4, 14, 0x3a3a50);
    const bulbs: Phaser.GameObjects.Arc[] = [];
    const offsets =
      axis === 'ns'
        ? [
            { x: -5, y: -4 },
            { x: 0, y: -4 },
            { x: 5, y: -4 },
          ]
        : [
            { x: -4, y: -5 },
            { x: -4, y: 0 },
            { x: -4, y: 5 },
          ];

    for (const off of offsets) {
      const bulb = this.scene.add.circle(off.x, off.y, 2.5, 0x333344);
      bulbs.push(bulb);
    }

    container.add([post, ...bulbs]);
    this.poles.push({ container, axis, bulbs });
  }

  private refreshBulbs(): void {
    for (const pole of this.poles) {
      const colors = this.bulbColors(pole.axis);
      pole.bulbs[0].setFillStyle(colors[0]);
      pole.bulbs[1].setFillStyle(colors[1]);
      pole.bulbs[2].setFillStyle(colors[2]);
    }
  }

  private bulbColors(axis: 'ns' | 'ew'): [number, number, number] {
    const off = 0x1a1a28;
    const red = 0xff2d55;
    const yellow = 0xffd600;
    const green = 0x00e676;

    if (this.phase === axis) {
      if (this.state === 'green') return [off, off, green];
      return [off, yellow, off];
    }
    if (this.state === 'green') return [red, off, off];
    return [red, yellow, off];
  }
}