import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import cityLayout from '../data/city-layout.json';
import { TileType, type CityMap } from './CityMap';
import { RoadNetwork, type RoadBand } from './RoadNetwork';

/** Yellow double solid — separates opposing traffic. */
const YELLOW = 0xffd54a;
/** White dashed — same-direction lane dividers. */
const WHITE = 0xe8e8f0;

export class RoadLayer {
  private container: Phaser.GameObjects.Container;
  private network: RoadNetwork;

  constructor(
    private scene: Phaser.Scene,
    private cityMap: CityMap
  ) {
    this.network = new RoadNetwork(cityMap.tiles, cityMap.mapWidth, cityMap.mapHeight);
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1);
    this.draw();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  getNetwork(): RoadNetwork {
    return this.network;
  }

  private draw(): void {
    const gfx = this.scene.add.graphics();
    this.container.add(gfx);
    this.drawRoadMarkings(gfx);
    this.drawStopLines(gfx);
    this.drawCrosswalks(gfx);
  }

  /**
   * Standard markings along the road axis (never perpendicular to traffic):
   * - double solid yellow at band center (oncoming split)
   * - white dashed between lanes when the road is wide enough
   */
  private drawRoadMarkings(gfx: Phaser.GameObjects.Graphics): void {
    for (const band of this.network.horizontalBands) {
      this.drawHorizontalMarkings(gfx, band);
    }
    for (const band of this.network.verticalBands) {
      this.drawVerticalMarkings(gfx, band);
    }
  }

  private skipMarkingTile(tx: number, ty: number): boolean {
    if (!this.network.isRoad(tx, ty)) return true;
    // No longitudinal paint in the middle of an intersection
    if (this.network.centerLineAt(tx, ty) === 'both') return true;
    if (this.network.findMajorIntersection(tx, ty, 2)) return true;
    return false;
  }

  private drawHorizontalMarkings(gfx: Phaser.GameObjects.Graphics, band: RoadBand): void {
    const cy = band.center * TILE_SIZE + TILE_SIZE / 2;
    // Double solid yellow — two lines parallel to east-west traffic
    const gap = 3; // px between the two yellow lines
    gfx.lineStyle(2, YELLOW, band.major ? 0.9 : 0.75);
    for (let x = 0; x < this.cityMap.mapWidth; x++) {
      if (this.skipMarkingTile(x, band.center)) continue;
      const px = x * TILE_SIZE;
      // Continuous solid (slight inset so tiles connect cleanly)
      gfx.lineBetween(px + 1, cy - gap, px + TILE_SIZE - 1, cy - gap);
      gfx.lineBetween(px + 1, cy + gap, px + TILE_SIZE - 1, cy + gap);
    }

    // White dashed between travel lane and outer shoulder (major roads, parallel to traffic)
    if (band.half >= 2) {
      // Boundary between center-1 / center-2 and center+1 / center+2
      this.drawDashedAlongH(gfx, band, (band.center - 1) * TILE_SIZE);
      this.drawDashedAlongH(gfx, band, (band.center + 1) * TILE_SIZE);
    }
  }

  private drawDashedAlongH(gfx: Phaser.GameObjects.Graphics, band: RoadBand, worldY: number): void {
    const dash = 14;
    const gap = 12;
    gfx.lineStyle(2, WHITE, 0.5);
    const sampleTy = band.center;
    for (let x = 0; x < this.cityMap.mapWidth; x++) {
      if (this.skipMarkingTile(x, sampleTy)) continue;
      const px = x * TILE_SIZE;
      for (let d = 2; d < TILE_SIZE - 2; d += dash + gap) {
        const x0 = px + d;
        const x1 = Math.min(px + d + dash, px + TILE_SIZE - 2);
        if (x1 > x0) gfx.lineBetween(x0, worldY, x1, worldY);
      }
    }
  }

  private drawVerticalMarkings(gfx: Phaser.GameObjects.Graphics, band: RoadBand): void {
    const cx = band.center * TILE_SIZE + TILE_SIZE / 2;
    const gap = 3;
    gfx.lineStyle(2, YELLOW, band.major ? 0.9 : 0.75);
    for (let y = 0; y < this.cityMap.mapHeight; y++) {
      if (this.skipMarkingTile(band.center, y)) continue;
      const py = y * TILE_SIZE;
      gfx.lineBetween(cx - gap, py + 1, cx - gap, py + TILE_SIZE - 1);
      gfx.lineBetween(cx + gap, py + 1, cx + gap, py + TILE_SIZE - 1);
    }

    if (band.half >= 2) {
      this.drawDashedAlongV(gfx, band, (band.center - 1) * TILE_SIZE);
      this.drawDashedAlongV(gfx, band, (band.center + 1) * TILE_SIZE);
    }
  }

  private drawDashedAlongV(gfx: Phaser.GameObjects.Graphics, band: RoadBand, worldX: number): void {
    const dash = 14;
    const gap = 12;
    gfx.lineStyle(2, WHITE, 0.5);
    const sampleTx = band.center;
    for (let y = 0; y < this.cityMap.mapHeight; y++) {
      if (this.skipMarkingTile(sampleTx, y)) continue;
      const py = y * TILE_SIZE;
      for (let d = 2; d < TILE_SIZE - 2; d += dash + gap) {
        const y0 = py + d;
        const y1 = Math.min(py + d + dash, py + TILE_SIZE - 2);
        if (y1 > y0) gfx.lineBetween(worldX, y0, worldX, y1);
      }
    }
  }

  /** White stop line before major intersections (perpendicular — correct for stop). */
  private drawStopLines(gfx: Phaser.GameObjects.Graphics): void {
    for (const inter of this.network.intersections) {
      if (!inter.major) continue;
      const half = Math.floor(cityLayoutHalf(inter) / 2);
      const px = inter.tx * TILE_SIZE;
      const py = inter.ty * TILE_SIZE;
      gfx.lineStyle(3, WHITE, 0.75);
      // North approach
      this.stopLineIfRoad(gfx, inter.tx, inter.ty - half - 1, 'h', px, py - half * TILE_SIZE);
      // South
      this.stopLineIfRoad(gfx, inter.tx, inter.ty + half + 1, 'h', px, py + (half + 1) * TILE_SIZE);
      // West
      this.stopLineIfRoad(gfx, inter.tx - half - 1, inter.ty, 'v', px - half * TILE_SIZE, py);
      // East
      this.stopLineIfRoad(gfx, inter.tx + half + 1, inter.ty, 'v', px + (half + 1) * TILE_SIZE, py);
    }
  }

  private stopLineIfRoad(
    gfx: Phaser.GameObjects.Graphics,
    tx: number,
    ty: number,
    axis: 'h' | 'v',
    wx: number,
    wy: number
  ): void {
    if (!this.network.isRoad(tx, ty)) return;
    if (axis === 'h') {
      gfx.lineBetween(wx + 4, wy + TILE_SIZE / 2, wx + TILE_SIZE - 4, wy + TILE_SIZE / 2);
    } else {
      gfx.lineBetween(wx + TILE_SIZE / 2, wy + 4, wx + TILE_SIZE / 2, wy + TILE_SIZE - 4);
    }
  }

  /** Zebra crosswalks at intersection approaches (white bars across the road). */
  private drawCrosswalks(gfx: Phaser.GameObjects.Graphics): void {
    for (const inter of this.network.intersections) {
      const r = inter.major ? 3 : 2;
      // Approach tiles: bars run ACROSS the road (perp to traffic) — correct for zebra
      this.drawZebra(gfx, inter.tx, inter.ty - r, 'h');
      this.drawZebra(gfx, inter.tx, inter.ty + r, 'h');
      this.drawZebra(gfx, inter.tx - r, inter.ty, 'v');
      this.drawZebra(gfx, inter.tx + r, inter.ty, 'v');
    }
  }

  private drawZebra(gfx: Phaser.GameObjects.Graphics, tx: number, ty: number, roadAxis: 'h' | 'v'): void {
    const tile = this.cityMap.tiles[ty]?.[tx];
    if (tile !== TileType.Road) return;
    const px = tx * TILE_SIZE;
    const py = ty * TILE_SIZE;
    gfx.fillStyle(WHITE, 0.5);
    const bar = 5;
    const gap = 4;
    if (roadAxis === 'h') {
      // Horizontal road: zebra bars are vertical strips
      for (let i = 0, x = px + 3; x < px + TILE_SIZE - 3; i++, x += bar + gap) {
        gfx.fillRect(x, py + 6, bar, TILE_SIZE - 12);
      }
    } else {
      // Vertical road: zebra bars are horizontal strips
      for (let i = 0, y = py + 3; y < py + TILE_SIZE - 3; i++, y += bar + gap) {
        gfx.fillRect(px + 6, y, TILE_SIZE - 12, bar);
      }
    }
  }
}

function cityLayoutHalf(inter: { major: boolean }): number {
  return inter.major ? cityLayout.majorRoads.width : cityLayout.minorRoads.width;
}
