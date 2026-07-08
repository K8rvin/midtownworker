import { TileType } from './CityMap';

export interface TileCoord {
  tx: number;
  ty: number;
}

const CARDINAL: TileCoord[] = [
  { tx: 0, ty: -1 },
  { tx: 1, ty: 0 },
  { tx: 0, ty: 1 },
  { tx: -1, ty: 0 },
];

export class NavigationGrid {
  private roadGrid: boolean[][];
  private walkGrid: boolean[][];
  private sidewalkGrid: boolean[][];
  private mapWidth: number;
  private mapHeight: number;

  constructor(private tiles: TileType[][]) {
    this.mapHeight = tiles.length;
    this.mapWidth = tiles[0]?.length ?? 0;
    this.roadGrid = [];
    this.walkGrid = [];
    this.sidewalkGrid = [];
    for (let y = 0; y < this.mapHeight; y++) {
      this.roadGrid[y] = [];
      this.walkGrid[y] = [];
      this.sidewalkGrid[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        const t = tiles[y][x];
        this.roadGrid[y][x] = t === TileType.Road;
        this.sidewalkGrid[y][x] = t === TileType.Sidewalk;
        this.walkGrid[y][x] =
          t === TileType.Road || t === TileType.Sidewalk || t === TileType.Grass || t === TileType.Stairs;
      }
    }
  }

  isRoad(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return false;
    return this.roadGrid[ty][tx];
  }

  isWalkable(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return false;
    return this.walkGrid[ty][tx];
  }

  isSidewalk(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return false;
    return this.sidewalkGrid[ty][tx];
  }

  findPath(start: TileCoord, end: TileCoord, useRoadsOnly = false): TileCoord[] | null {
    const grid = useRoadsOnly ? this.roadGrid : this.walkGrid;
    return this.findPathOnGrid(start, end, grid);
  }

  findSidewalkPath(start: TileCoord, end: TileCoord): TileCoord[] | null {
    return this.findPathOnGrid(start, end, this.sidewalkGrid);
  }

  findRandomSidewalkTile(rng: () => number = Math.random): TileCoord | null {
    const tiles: TileCoord[] = [];
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.sidewalkGrid[y][x]) tiles.push({ tx: x, ty: y });
      }
    }
    if (tiles.length === 0) return null;
    return tiles[Math.floor(rng() * tiles.length)];
  }

  listSidewalkTiles(): TileCoord[] {
    const tiles: TileCoord[] = [];
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.sidewalkGrid[y][x]) tiles.push({ tx: x, ty: y });
      }
    }
    return tiles;
  }

  private findPathOnGrid(
    start: TileCoord,
    end: TileCoord,
    grid: boolean[][]
  ): TileCoord[] | null {
    if (!this.inBounds(end.tx, end.ty)) return null;
    if (!grid[end.ty][end.tx]) return null;

    const key = (c: TileCoord) => `${c.tx},${c.ty}`;
    const open: TileCoord[] = [start];
    const cameFrom = new Map<string, TileCoord>();
    const gScore = new Map<string, number>();
    gScore.set(key(start), 0);
    const fScore = new Map<string, number>();
    fScore.set(key(start), this.heuristic(start, end));

    while (open.length > 0) {
      open.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
      const current = open.shift()!;
      if (current.tx === end.tx && current.ty === end.ty) {
        return this.reconstruct(cameFrom, current);
      }

      for (const dir of CARDINAL) {
        const next = { tx: current.tx + dir.tx, ty: current.ty + dir.ty };
        if (!this.inBounds(next.tx, next.ty) || !grid[next.ty][next.tx]) continue;

        const tentative = (gScore.get(key(current)) ?? Infinity) + 1;
        const nextKey = key(next);
        if (tentative < (gScore.get(nextKey) ?? Infinity)) {
          cameFrom.set(nextKey, current);
          gScore.set(nextKey, tentative);
          fScore.set(nextKey, tentative + this.heuristic(next, end));
          if (!open.some((c) => c.tx === next.tx && c.ty === next.ty)) open.push(next);
        }
      }
    }
    return null;
  }

  findRandomRoadTile(rng: () => number = Math.random): TileCoord | null {
    const roads: TileCoord[] = [];
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.roadGrid[y][x]) roads.push({ tx: x, ty: y });
      }
    }
    if (roads.length === 0) return null;
    return roads[Math.floor(rng() * roads.length)];
  }

  worldToTile(wx: number, wy: number, tileSize: number): TileCoord {
    return { tx: Math.floor(wx / tileSize), ty: Math.floor(wy / tileSize) };
  }

  private reconstruct(cameFrom: Map<string, TileCoord>, current: TileCoord): TileCoord[] {
    const path = [current];
    let key = `${current.tx},${current.ty}`;
    while (cameFrom.has(key)) {
      const prev = cameFrom.get(key)!;
      path.unshift(prev);
      key = `${prev.tx},${prev.ty}`;
    }
    return path;
  }

  private heuristic(a: TileCoord, b: TileCoord): number {
    return Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);
  }

  private inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.mapWidth && ty < this.mapHeight;
  }
}