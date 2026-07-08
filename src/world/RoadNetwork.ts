import cityLayout from '../data/city-layout.json';
import { TileType } from './CityMap';

export interface RoadBand {
  center: number;
  half: number;
  major: boolean;
}

export interface RoadIntersection {
  tx: number;
  ty: number;
  major: boolean;
}

export class RoadNetwork {
  public readonly horizontalBands: RoadBand[] = [];
  public readonly verticalBands: RoadBand[] = [];
  public readonly intersections: RoadIntersection[] = [];

  constructor(
    private tiles: TileType[][],
    public readonly mapWidth: number,
    public readonly mapHeight: number
  ) {
    this.buildBands();
    this.findIntersections();
  }

  isRoad(tx: number, ty: number): boolean {
    if (ty < 0 || tx < 0 || ty >= this.mapHeight || tx >= this.mapWidth) return false;
    return this.tiles[ty][tx] === TileType.Road;
  }

  isInHorizontalBand(ty: number, band: RoadBand): boolean {
    return ty >= band.center - band.half && ty <= band.center + band.half;
  }

  isInVerticalBand(tx: number, band: RoadBand): boolean {
    return tx >= band.center - band.half && tx <= band.center + band.half;
  }

  centerLineAt(tx: number, ty: number): 'h' | 'v' | 'both' | null {
    let onH = false;
    let onV = false;
    for (const band of this.horizontalBands) {
      if (this.isInHorizontalBand(ty, band) && ty === band.center) onH = true;
    }
    for (const band of this.verticalBands) {
      if (this.isInVerticalBand(tx, band) && tx === band.center) onV = true;
    }
    if (onH && onV) return 'both';
    if (onH) return 'h';
    if (onV) return 'v';
    return null;
  }

  findMajorIntersection(tx: number, ty: number, radius = 3): RoadIntersection | null {
    for (const inter of this.intersections) {
      if (!inter.major) continue;
      if (Math.abs(tx - inter.tx) <= radius && Math.abs(ty - inter.ty) <= radius) {
        return inter;
      }
    }
    return null;
  }

  getMovementAxis(angleDeg: number): 'ns' | 'ew' {
    const rad = (angleDeg * Math.PI) / 180;
    return Math.abs(Math.cos(rad)) > Math.abs(Math.sin(rad)) ? 'ew' : 'ns';
  }

  isApproachingIntersection(
    tx: number,
    ty: number,
    inter: RoadIntersection,
    axis: 'ns' | 'ew'
  ): boolean {
    const dx = tx - inter.tx;
    const dy = ty - inter.ty;
    if (axis === 'ew') {
      return Math.abs(dy) <= 2 && Math.abs(dx) >= 2 && Math.abs(dx) <= 6;
    }
    return Math.abs(dx) <= 2 && Math.abs(dy) >= 2 && Math.abs(dy) <= 6;
  }

  private buildBands(): void {
    const major = cityLayout.majorRoads;
    const minor = cityLayout.minorRoads;
    const majorHalf = Math.floor(major.width / 2);
    const minorHalf = Math.floor(minor.width / 2);

    for (const center of major.centers) {
      this.horizontalBands.push({ center, half: majorHalf, major: true });
      this.verticalBands.push({ center, half: majorHalf, major: true });
    }
    for (const center of minor.centers) {
      this.horizontalBands.push({ center, half: minorHalf, major: false });
      this.verticalBands.push({ center, half: minorHalf, major: false });
    }
  }

  private findIntersections(): void {
    const majorCenters = cityLayout.majorRoads.centers;
    const minorCenters = cityLayout.minorRoads.centers;
    const seen = new Set<string>();

    const add = (tx: number, ty: number, major: boolean) => {
      if (!this.isRoad(tx, ty)) return;
      const key = `${tx},${ty}`;
      if (seen.has(key)) return;
      seen.add(key);
      this.intersections.push({ tx, ty, major });
    };

    for (const cx of majorCenters) {
      for (const cy of majorCenters) add(cx, cy, true);
    }
    for (const cx of majorCenters) {
      for (const cy of minorCenters) add(cx, cy, false);
    }
    for (const cx of minorCenters) {
      for (const cy of majorCenters) add(cx, cy, false);
    }
  }
}