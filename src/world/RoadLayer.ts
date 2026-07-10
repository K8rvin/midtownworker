import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import cityLayout from '../data/city-layout.json';
import { TileType, type CityMap } from './CityMap';
import { RoadNetwork, type RoadBand, type RoadIntersection } from './RoadNetwork';

/** Yellow double solid — separates opposing traffic. */
const YELLOW = 0xffd54a;
/** White — dashed lane dividers, stop lines, zebra. */
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

  private drawRoadMarkings(gfx: Phaser.GameObjects.Graphics): void {
    for (const band of this.network.horizontalBands) {
      this.drawHorizontalMarkings(gfx, band);
    }
    for (const band of this.network.verticalBands) {
      this.drawVerticalMarkings(gfx, band);
    }
  }

  /** True if this tile is inside a cross of two roads (no longitudinal paint). */
  private isIntersectionTile(tx: number, ty: number): boolean {
    if (!this.network.isRoad(tx, ty)) return true;
    if (this.network.centerLineAt(tx, ty) === 'both') return true;
    if (this.network.findMajorIntersection(tx, ty, 2)) return true;
    for (const inter of this.network.intersections) {
      const half = Math.floor(bandWidth(inter) / 2);
      if (Math.abs(tx - inter.tx) <= half && Math.abs(ty - inter.ty) <= half) return true;
    }
    return false;
  }

  /**
   * Road band pixel extents.
   * Tiles [center-half .. center+half] → pixels [outer, outer+(2*half+1)*T].
   * Yellow mid is geometric center of the center tile.
   */
  private bandExtentsH(band: RoadBand): {
    top: number;
    bottom: number;
    mid: number;
    northH: number;
    southH: number;
  } {
    const top = (band.center - band.half) * TILE_SIZE;
    const bottom = (band.center + band.half + 1) * TILE_SIZE;
    const mid = band.center * TILE_SIZE + TILE_SIZE / 2;
    return { top, bottom, mid, northH: mid - top, southH: bottom - mid };
  }

  private bandExtentsV(band: RoadBand): {
    left: number;
    right: number;
    mid: number;
    westW: number;
    eastW: number;
  } {
    const left = (band.center - band.half) * TILE_SIZE;
    const right = (band.center + band.half + 1) * TILE_SIZE;
    const mid = band.center * TILE_SIZE + TILE_SIZE / 2;
    return { left, right, mid, westW: mid - left, eastW: right - mid };
  }

  private drawHorizontalMarkings(gfx: Phaser.GameObjects.Graphics, band: RoadBand): void {
    const { mid } = this.bandExtentsH(band);
    const yGap = 3;
    gfx.lineStyle(2, YELLOW, band.major ? 0.92 : 0.78);
    for (let x = 0; x < this.cityMap.mapWidth; x++) {
      if (this.isIntersectionTile(x, band.center)) continue;
      if (!this.network.isRoad(x, band.center)) continue;
      const px = x * TILE_SIZE;
      gfx.lineBetween(px + 1, mid - yGap, px + TILE_SIZE - 1, mid - yGap);
      gfx.lineBetween(px + 1, mid + yGap, px + TILE_SIZE - 1, mid + yGap);
    }

    this.drawEqualDashesH(gfx, band);
  }

  /**
   * Equal-width same-direction lanes.
   * North half [top, mid] and south half [mid, bottom] are equal in pixels
   * (each is (half+0.5)*TILE_SIZE). Split each half into `lanes` equal parts.
   * lanes = half (width 5 → half 2 → 2 lanes each way).
   */
  private drawEqualDashesH(gfx: Phaser.GameObjects.Graphics, band: RoadBand): void {
    const lanes = band.half;
    if (lanes < 2) return;

    const { top, mid, northH, southH } = this.bandExtentsH(band);
    gfx.lineStyle(2, WHITE, 0.55);
    const dash = 14;
    const gap = 12;

    for (let i = 1; i < lanes; i++) {
      // Equal fractions of each half (not tile boundaries — those are uneven with center tile)
      const northY = top + (northH * i) / lanes;
      const southY = mid + (southH * i) / lanes;

      for (const worldY of [northY, southY]) {
        const sampleTy =
          worldY < mid ? Math.max(band.center - band.half, band.center - 1) : Math.min(band.center + band.half, band.center + 1);
        for (let x = 0; x < this.cityMap.mapWidth; x++) {
          if (this.isIntersectionTile(x, sampleTy)) continue;
          if (!this.network.isRoad(x, sampleTy)) continue;
          const px = x * TILE_SIZE;
          for (let d = 2; d < TILE_SIZE - 2; d += dash + gap) {
            const x0 = px + d;
            const x1 = Math.min(px + d + dash, px + TILE_SIZE - 2);
            if (x1 > x0) gfx.lineBetween(x0, worldY, x1, worldY);
          }
        }
      }
    }
  }

  private drawVerticalMarkings(gfx: Phaser.GameObjects.Graphics, band: RoadBand): void {
    const { mid } = this.bandExtentsV(band);
    const xGap = 3;
    gfx.lineStyle(2, YELLOW, band.major ? 0.92 : 0.78);
    for (let y = 0; y < this.cityMap.mapHeight; y++) {
      if (this.isIntersectionTile(band.center, y)) continue;
      if (!this.network.isRoad(band.center, y)) continue;
      const py = y * TILE_SIZE;
      gfx.lineBetween(mid - xGap, py + 1, mid - xGap, py + TILE_SIZE - 1);
      gfx.lineBetween(mid + xGap, py + 1, mid + xGap, py + TILE_SIZE - 1);
    }

    this.drawEqualDashesV(gfx, band);
  }

  private drawEqualDashesV(gfx: Phaser.GameObjects.Graphics, band: RoadBand): void {
    const lanes = band.half;
    if (lanes < 2) return;

    const { left, mid, westW, eastW } = this.bandExtentsV(band);
    gfx.lineStyle(2, WHITE, 0.55);
    const dash = 14;
    const gap = 12;

    for (let i = 1; i < lanes; i++) {
      const westX = left + (westW * i) / lanes;
      const eastX = mid + (eastW * i) / lanes;

      for (const worldX of [westX, eastX]) {
        const sampleTx =
          worldX < mid ? Math.max(band.center - band.half, band.center - 1) : Math.min(band.center + band.half, band.center + 1);
        for (let y = 0; y < this.cityMap.mapHeight; y++) {
          if (this.isIntersectionTile(sampleTx, y)) continue;
          if (!this.network.isRoad(sampleTx, y)) continue;
          const py = y * TILE_SIZE;
          for (let d = 2; d < TILE_SIZE - 2; d += dash + gap) {
            const y0 = py + d;
            const y1 = Math.min(py + d + dash, py + TILE_SIZE - 2);
            if (y1 > y0) gfx.lineBetween(worldX, y0, worldX, y1);
          }
        }
      }
    }
  }

  private drawStopLines(gfx: Phaser.GameObjects.Graphics): void {
    gfx.lineStyle(3, WHITE, 0.8);
    for (const inter of this.network.intersections) {
      const half = Math.floor(bandWidth(inter) / 2);
      const stopDist = half + 1;

      this.drawStopLineSpan(gfx, inter.tx - half, inter.tx + half, inter.ty - stopDist, inter.ty - stopDist, 'h');
      this.drawStopLineSpan(gfx, inter.tx - half, inter.tx + half, inter.ty + stopDist, inter.ty + stopDist, 'h');
      this.drawStopLineSpan(gfx, inter.tx - stopDist, inter.tx - stopDist, inter.ty - half, inter.ty + half, 'v');
      this.drawStopLineSpan(gfx, inter.tx + stopDist, inter.tx + stopDist, inter.ty - half, inter.ty + half, 'v');
    }
  }

  private drawStopLineSpan(
    gfx: Phaser.GameObjects.Graphics,
    tx0: number,
    tx1: number,
    ty0: number,
    ty1: number,
    axis: 'h' | 'v'
  ): void {
    let any = false;
    for (let tx = Math.min(tx0, tx1); tx <= Math.max(tx0, tx1); tx++) {
      for (let ty = Math.min(ty0, ty1); ty <= Math.max(ty0, ty1); ty++) {
        if (this.network.isRoad(tx, ty)) any = true;
      }
    }
    if (!any) return;

    if (axis === 'h') {
      const y = ty0 * TILE_SIZE + TILE_SIZE / 2;
      const x0 = Math.min(tx0, tx1) * TILE_SIZE + 4;
      const x1 = (Math.max(tx0, tx1) + 1) * TILE_SIZE - 4;
      gfx.lineBetween(x0, y, x1, y);
    } else {
      const x = tx0 * TILE_SIZE + TILE_SIZE / 2;
      const y0 = Math.min(ty0, ty1) * TILE_SIZE + 4;
      const y1 = (Math.max(ty0, ty1) + 1) * TILE_SIZE - 4;
      gfx.lineBetween(x, y0, x, y1);
    }
  }

  /**
   * Zebra stays strictly on Road tiles (never sidewalk).
   * Stripe long-axis is perpendicular to vehicle travel (classic piano keys):
   * - N/S traffic → vertical bars (arrayed left→right across the carriageway)
   * - E/W traffic → horizontal bars (arrayed top→bottom across the carriageway)
   */
  private drawCrosswalks(gfx: Phaser.GameObjects.Graphics): void {
    for (const inter of this.network.intersections) {
      const half = Math.floor(bandWidth(inter) / 2);
      // One tile past stop line (stop = half+1), depth 1–2 tiles — road band only
      const zebraDist = half + 2;
      const zebraDepth = 2;

      // North approach — cars travel N/S → stripes ⊥ travel = vertical ('ns')
      this.drawZebraOnRoad(
        gfx,
        inter.tx - half,
        inter.tx + half,
        inter.ty - zebraDist - zebraDepth + 1,
        inter.ty - zebraDist,
        'ns'
      );
      // South
      this.drawZebraOnRoad(
        gfx,
        inter.tx - half,
        inter.tx + half,
        inter.ty + zebraDist,
        inter.ty + zebraDist + zebraDepth - 1,
        'ns'
      );
      // West approach — cars travel E/W → stripes ⊥ travel = horizontal ('ew')
      this.drawZebraOnRoad(
        gfx,
        inter.tx - zebraDist - zebraDepth + 1,
        inter.tx - zebraDist,
        inter.ty - half,
        inter.ty + half,
        'ew'
      );
      // East
      this.drawZebraOnRoad(
        gfx,
        inter.tx + zebraDist,
        inter.tx + zebraDist + zebraDepth - 1,
        inter.ty - half,
        inter.ty + half,
        'ew'
      );
    }
  }

  /**
   * Paint zebra only on Road tiles inside the box (skip sidewalk/building).
   * Bars are drawn per-row/col of road so they never bleed onto curb.
   * @param barDir 'ns' = vertical bars — N/S roads; 'ew' = horizontal — E/W roads
   */
  private drawZebraOnRoad(
    gfx: Phaser.GameObjects.Graphics,
    tx0: number,
    tx1: number,
    ty0: number,
    ty1: number,
    barDir: 'ns' | 'ew'
  ): void {
    const minTx = Math.min(tx0, tx1);
    const maxTx = Math.max(tx0, tx1);
    const minTy = Math.min(ty0, ty1);
    const maxTy = Math.max(ty0, ty1);

    // Collect road-only tiles
    const roadTiles: { tx: number; ty: number }[] = [];
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (this.cityMap.tiles[ty]?.[tx] === TileType.Road) {
          roadTiles.push({ tx, ty });
        }
      }
    }
    if (roadTiles.length === 0) return;

    let usedMinTx = Infinity;
    let usedMaxTx = -Infinity;
    let usedMinTy = Infinity;
    let usedMaxTy = -Infinity;
    for (const t of roadTiles) {
      usedMinTx = Math.min(usedMinTx, t.tx);
      usedMaxTx = Math.max(usedMaxTx, t.tx);
      usedMinTy = Math.min(usedMinTy, t.ty);
      usedMaxTy = Math.max(usedMaxTy, t.ty);
    }

    const left = usedMinTx * TILE_SIZE;
    const right = (usedMaxTx + 1) * TILE_SIZE;
    const top = usedMinTy * TILE_SIZE;
    const bottom = (usedMaxTy + 1) * TILE_SIZE;
    const w = right - left;
    const h = bottom - top;
    if (w < 8 || h < 8) return;

    // Road mask set for pixel clip (only paint inside road tiles)
    const roadSet = new Set(roadTiles.map((t) => `${t.tx},${t.ty}`));
    const isRoadPx = (px: number, py: number) => {
      const tx = Math.floor(px / TILE_SIZE);
      const ty = Math.floor(py / TILE_SIZE);
      return roadSet.has(`${tx},${ty}`);
    };

    gfx.fillStyle(WHITE, 0.72);
    const bar = 9;
    const gap = 6;
    const pad = 2;

    if (barDir === 'ew') {
      // Horizontal bars: long axis E↔W — clip segments to road columns
      for (let y = top + pad; y < bottom - pad; y += bar + gap) {
        const bh = Math.min(bar, bottom - pad - y);
        if (bh <= 1) continue;
        // Walk x and merge consecutive road spans
        let runStart: number | null = null;
        for (let x = left + pad; x <= right - pad; x++) {
          const on = x < right - pad && isRoadPx(x, y + bh / 2);
          if (on && runStart === null) runStart = x;
          if ((!on || x === right - pad) && runStart !== null) {
            const runEnd = on && x === right - pad ? x : x - 1;
            const rw = runEnd - runStart + 1;
            if (rw > 2) gfx.fillRect(runStart, y, rw, bh);
            runStart = null;
          }
        }
      }
    } else {
      // Vertical bars: long axis N↔S — clip segments to road rows
      for (let x = left + pad; x < right - pad; x += bar + gap) {
        const bw = Math.min(bar, right - pad - x);
        if (bw <= 1) continue;
        let runStart: number | null = null;
        for (let y = top + pad; y <= bottom - pad; y++) {
          const on = y < bottom - pad && isRoadPx(x + bw / 2, y);
          if (on && runStart === null) runStart = y;
          if ((!on || y === bottom - pad) && runStart !== null) {
            const runEnd = on && y === bottom - pad ? y : y - 1;
            const rh = runEnd - runStart + 1;
            if (rh > 2) gfx.fillRect(x, runStart, bw, rh);
            runStart = null;
          }
        }
      }
    }
  }
}

function bandWidth(inter: RoadIntersection): number {
  return inter.major ? cityLayout.majorRoads.width : cityLayout.minorRoads.width;
}
