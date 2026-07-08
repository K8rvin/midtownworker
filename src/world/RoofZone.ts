import { TileType } from './CityMap';

export interface RoofZone {
  id: string;
  stairs: { tx: number; ty: number };
  walkTiles: Set<string>;
}

const tileKey = (tx: number, ty: number) => `${tx},${ty}`;

export function buildRoofZones(
  tiles: TileType[][],
  mapW: number,
  mapH: number,
  stairsList: { x: number; y: number }[]
): RoofZone[] {
  const zones: RoofZone[] = [];

  for (let i = 0; i < stairsList.length; i++) {
    const sx = stairsList[i].x;
    const sy = stairsList[i].y;
    if (sx < 0 || sy < 0 || sx >= mapW || sy >= mapH) continue;

    const footprint = new Set<string>();
    const queue: { tx: number; ty: number }[] = [{ tx: sx, ty: sy }];
    const visited = new Set([tileKey(sx, sy)]);

    while (queue.length > 0) {
      const { tx, ty } = queue.shift()!;
      const tile = tiles[ty]?.[tx];
      if (tile === TileType.Building || tile === TileType.Stairs) {
        footprint.add(tileKey(tx, ty));
      }
      if (tile !== TileType.Building && tile !== TileType.Stairs) continue;

      for (const [nx, ny] of neighbors4(tx, ty)) {
        if (nx < 0 || ny < 0 || nx >= mapW || ny >= mapH) continue;
        const nk = tileKey(nx, ny);
        if (visited.has(nk)) continue;
        const nt = tiles[ny][nx];
        if (nt === TileType.Building || nt === TileType.Stairs) {
          visited.add(nk);
          queue.push({ tx: nx, ty: ny });
        }
      }
    }

    const walkTiles = new Set<string>();
    walkTiles.add(tileKey(sx, sy));

    for (const k of footprint) {
      const [fx, fy] = k.split(',').map(Number);
      for (const [nx, ny] of neighbors4(fx, fy)) {
        if (nx < 0 || ny < 0 || nx >= mapW || ny >= mapH) continue;
        if (tiles[ny][nx] === TileType.Roof) {
          walkTiles.add(tileKey(nx, ny));
        }
      }
    }

    if (walkTiles.size > 0) {
      zones.push({ id: `roof_${i}`, stairs: { tx: sx, ty: sy }, walkTiles });
    }
  }

  return zones;
}

export function isTileInZone(zone: RoofZone, tx: number, ty: number): boolean {
  return zone.walkTiles.has(tileKey(tx, ty));
}

export function clampToZone(
  zone: RoofZone,
  wx: number,
  wy: number,
  tileSize: number
): { x: number; y: number } {
  const tx = Math.floor(wx / tileSize);
  const ty = Math.floor(wy / tileSize);
  if (isTileInZone(zone, tx, ty)) return { x: wx, y: wy };

  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;
  for (const k of zone.walkTiles) {
    const [rtx, rty] = k.split(',').map(Number);
    const cx = rtx * tileSize + tileSize / 2;
    const cy = rty * tileSize + tileSize / 2;
    const dist = (wx - cx) ** 2 + (wy - cy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = { x: cx, y: cy };
    }
  }
  return best ?? { x: wx, y: wy };
}

export function findRoofZoneAt(
  zones: RoofZone[],
  tx: number,
  ty: number,
  radius = 0
): RoofZone | null {
  for (const zone of zones) {
    if (isTileInZone(zone, tx, ty)) return zone;
    if (radius > 0) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (isTileInZone(zone, tx + dx, ty + dy)) return zone;
        }
      }
    }
    if (zone.stairs.tx === tx && zone.stairs.ty === ty) return zone;
  }
  return null;
}

function neighbors4(tx: number, ty: number): [number, number][] {
  return [
    [tx + 1, ty],
    [tx - 1, ty],
    [tx, ty + 1],
    [tx, ty - 1],
  ];
}