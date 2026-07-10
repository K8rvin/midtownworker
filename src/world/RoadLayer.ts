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
    // Major intersection footprint
    if (this.network.findMajorIntersection(tx, ty, 2)) return true;
    // Any intersection of bands (minor×major etc.)
    for (const inter of this.network.intersections) {
      const half = Math.floor(bandWidth(inter) / 2);
      if (Math.abs(tx - inter.tx) <= half && Math.abs(ty - inter.ty) <= half) return true;
    }
    return false;
  }

  private drawHorizontalMarkings(gfx: Phaser.GameObjects.Graphics, band: RoadBand): void {
    // Double yellow at geometric center of the band (opposing traffic)
    const cy = band.center * TILE_SIZE + TILE_SIZE / 2;
    const yGap = 3;
    gfx.lineStyle(2, YELLOW, band.major ? 0.92 : 0.78);
    for (let x = 0; x < this.cityMap.mapWidth; x++) {
      if (this.isIntersectionTile(x, band.center)) continue;
      if (!this.network.isRoad(x, band.center)) continue;
      const px = x * TILE_SIZE;
      gfx.lineBetween(px + 1, cy - yGap, px + TILE_SIZE - 1, cy - yGap);
      gfx.lineBetween(px + 1, cy + yGap, px + TILE_SIZE - 1, cy + yGap);
    }

    // White dashed: split each direction half into equal lanes (only if 2+ lanes)
    this.drawSameDirectionDashesH(gfx, band);
  }

  /**
   * Lanes per direction = band.half (width 3 → 1, width 5 → 2).
   * Dividers at equal fractions of each half-road.
   */
  private drawSameDirectionDashesH(gfx: Phaser.GameObjects.Graphics, band: RoadBand): void {
    const lanes = band.half; // tiles on each side of center
    if (lanes < 2) return; // one lane each way — no dashed divider

    gfx.lineStyle(2, WHITE, 0.55);
    const dash = 14;
    const gap = 12;

    // Negative half (north of center): tiles [center-half .. center-1]
    // Positive half (south): tiles [center+1 .. center+half]
    for (let i = 1; i < lanes; i++) {
      const frac = i / lanes;
      // North: from outer edge toward center
      const northY = (band.center - band.half) * TILE_SIZE + frac * band.half * TILE_SIZE;
      // South: from inner edge (after center tile) toward outer
      const southY = (band.center + 1) * TILE_SIZE + frac * band.half * TILE_SIZE;

      for (const worldY of [northY, southY]) {
        for (let x = 0; x < this.cityMap.mapWidth; x++) {
          // Sample a travel tile on this side of the center
          const sampleTy =
            worldY < band.center * TILE_SIZE + TILE_SIZE / 2
              ? band.center - 1
              : band.center + 1;
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
    const cx = band.center * TILE_SIZE + TILE_SIZE / 2;
    const xGap = 3;
    gfx.lineStyle(2, YELLOW, band.major ? 0.92 : 0.78);
    for (let y = 0; y < this.cityMap.mapHeight; y++) {
      if (this.isIntersectionTile(band.center, y)) continue;
      if (!this.network.isRoad(band.center, y)) continue;
      const py = y * TILE_SIZE;
      gfx.lineBetween(cx - xGap, py + 1, cx - xGap, py + TILE_SIZE - 1);
      gfx.lineBetween(cx + xGap, py + 1, cx + xGap, py + TILE_SIZE - 1);
    }

    this.drawSameDirectionDashesV(gfx, band);
  }

  private drawSameDirectionDashesV(gfx: Phaser.GameObjects.Graphics, band: RoadBand): void {
    const lanes = band.half;
    if (lanes < 2) return;

    gfx.lineStyle(2, WHITE, 0.55);
    const dash = 14;
    const gap = 12;

    for (let i = 1; i < lanes; i++) {
      const frac = i / lanes;
      // West of center (negative tx)
      const westX = (band.center - band.half) * TILE_SIZE + frac * band.half * TILE_SIZE;
      // East of center
      const eastX = (band.center + 1) * TILE_SIZE + frac * band.half * TILE_SIZE;

      for (const worldX of [westX, eastX]) {
        for (let y = 0; y < this.cityMap.mapHeight; y++) {
          const sampleTx =
            worldX < band.center * TILE_SIZE + TILE_SIZE / 2
              ? band.center - 1
              : band.center + 1;
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

  /**
   * Stop line between intersection and zebra (closer to junction than crosswalk).
   */
  private drawStopLines(gfx: Phaser.GameObjects.Graphics): void {
    gfx.lineStyle(3, WHITE, 0.8);
    for (const inter of this.network.intersections) {
      const half = Math.floor(bandWidth(inter) / 2);
      // One tile outside intersection box
      const stopDist = half + 1;

      // N/S approaches on vertical road — stop line runs E-W across full road width
      this.drawStopLineSpan(
        gfx,
        inter.tx - half,
        inter.tx + half,
        inter.ty - stopDist,
        inter.ty - stopDist,
        'h'
      );
      this.drawStopLineSpan(
        gfx,
        inter.tx - half,
        inter.tx + half,
        inter.ty + stopDist,
        inter.ty + stopDist,
        'h'
      );
      // E/W approaches on horizontal road — stop line runs N-S
      this.drawStopLineSpan(
        gfx,
        inter.tx - stopDist,
        inter.tx - stopDist,
        inter.ty - half,
        inter.ty + half,
        'v'
      );
      this.drawStopLineSpan(
        gfx,
        inter.tx + stopDist,
        inter.tx + stopDist,
        inter.ty - half,
        inter.ty + half,
        'v'
      );
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
   * Crosswalk further from the junction than the stop line.
   * Bars are rotated 90° vs previous (parallel to vehicle traffic / classic zebra stripes
   * laid so each stripe runs across the pedestrian path).
   *
   * N/S road approach: stripes are vertical (N-S), arrayed across road width (E-W).
   * E/W road approach: stripes are horizontal (E-W), arrayed across road height (N-S).
   */
  private drawCrosswalks(gfx: Phaser.GameObjects.Graphics): void {
    for (const inter of this.network.intersections) {
      const half = Math.floor(bandWidth(inter) / 2);
      // Further from intersection than stop line (stop = half+1)
      const zebraInner = half + 2; // tile closest to junction
      const zebraDepth = 2; // tiles along the approach
      const zebraOuter = zebraInner + zebraDepth - 1;

      // North approach (vertical road): rows further north, full road width
      this.drawZebraBox(
        gfx,
        inter.tx - half,
        inter.tx + half,
        inter.ty - zebraOuter,
        inter.ty - zebraInner,
        'ns' // bars elongate N-S (90° from previous horizontal bars)
      );
      // South
      this.drawZebraBox(
        gfx,
        inter.tx - half,
        inter.tx + half,
        inter.ty + zebraInner,
        inter.ty + zebraOuter,
        'ns'
      );
      // West approach (horizontal road): columns further west, full road height
      this.drawZebraBox(
        gfx,
        inter.tx - zebraOuter,
        inter.tx - zebraInner,
        inter.ty - half,
        inter.ty + half,
        'ew' // bars elongate E-W (90° from previous vertical bars)
      );
      // East
      this.drawZebraBox(
        gfx,
        inter.tx + zebraInner,
        inter.tx + zebraOuter,
        inter.ty - half,
        inter.ty + half,
        'ew'
      );
    }
  }

  /**
   * @param barDir 'ns' = tall vertical stripes (arrayed left→right across box)
   *               'ew' = wide horizontal stripes (arrayed top→bottom across box)
   */
  private drawZebraBox(
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

    // Must touch at least one road tile
    let anyRoad = false;
    for (let ty = minTy; ty <= maxTy && !anyRoad; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (this.network.isRoad(tx, ty)) {
          anyRoad = true;
          break;
        }
      }
    }
    if (!anyRoad) return;

    const left = minTx * TILE_SIZE + 2;
    const right = (maxTx + 1) * TILE_SIZE - 2;
    const top = minTy * TILE_SIZE + 2;
    const bottom = (maxTy + 1) * TILE_SIZE - 2;
    const w = right - left;
    const h = bottom - top;
    if (w < 8 || h < 8) return;

    gfx.fillStyle(WHITE, 0.6);
    const bar = 6;
    const gap = 5;

    if (barDir === 'ns') {
      // Vertical stripes filling the box height, stepped across width
      for (let x = left; x < right; x += bar + gap) {
        const bw = Math.min(bar, right - x);
        if (bw > 1) gfx.fillRect(x, top, bw, h);
      }
    } else {
      // Horizontal stripes filling the box width, stepped across height
      for (let y = top; y < bottom; y += bar + gap) {
        const bh = Math.min(bar, bottom - y);
        if (bh > 1) gfx.fillRect(left, y, w, bh);
      }
    }
  }
}

function bandWidth(inter: RoadIntersection): number {
  return inter.major ? cityLayout.majorRoads.width : cityLayout.minorRoads.width;
}
