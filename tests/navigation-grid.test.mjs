const MAP_W = 10;
const MAP_H = 10;
const TileType = { Grass: 0, Road: 1, Sidewalk: 2, Building: 3, Roof: 4, Stairs: 5 };

function makeGrid() {
  const tiles = [];
  for (let y = 0; y < MAP_H; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      tiles[y][x] = x === 5 ? TileType.Road : TileType.Building;
    }
  }
  return tiles;
}

function findPath(tiles, start, end, roadsOnly) {
  const walk = (t) =>
    roadsOnly
      ? t === TileType.Road
      : t === TileType.Road || t === TileType.Sidewalk || t === TileType.Grass || t === TileType.Stairs;

  const key = (c) => `${c.tx},${c.ty}`;
  const open = [start];
  const cameFrom = new Map();
  const gScore = new Map([[key(start), 0]]);

  const dirs = [{ tx: 0, ty: -1 }, { tx: 1, ty: 0 }, { tx: 0, ty: 1 }, { tx: -1, ty: 0 }];

  while (open.length) {
    open.sort((a, b) => (gScore.get(key(a)) ?? 99) - (gScore.get(key(b)) ?? 99));
    const cur = open.shift();
    if (cur.tx === end.tx && cur.ty === end.ty) {
      const path = [cur];
      let k = key(cur);
      while (cameFrom.has(k)) {
        const p = cameFrom.get(k);
        path.unshift(p);
        k = key(p);
      }
      return path;
    }
    for (const d of dirs) {
      const next = { tx: cur.tx + d.tx, ty: cur.ty + d.ty };
      if (next.tx < 0 || next.ty < 0 || next.tx >= MAP_W || next.ty >= MAP_H) continue;
      if (!walk(tiles[next.ty][next.tx])) continue;
      const tentative = (gScore.get(key(cur)) ?? 99) + 1;
      if (tentative < (gScore.get(key(next)) ?? 99)) {
        cameFrom.set(key(next), cur);
        gScore.set(key(next), tentative);
        if (!open.some((c) => c.tx === next.tx && c.ty === next.ty)) open.push(next);
      }
    }
  }
  return null;
}

const tiles = makeGrid();
const path = findPath(tiles, { tx: 5, ty: 0 }, { tx: 5, ty: 9 }, true);
if (!path || path.length !== 10) throw new Error(`Road path failed: ${path?.length}`);

const blocked = findPath(tiles, { tx: 0, ty: 0 }, { tx: 9, ty: 9 }, true);
if (blocked) throw new Error('Should not path through buildings on roads-only');

console.log('Navigation grid checks passed');