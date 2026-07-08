import cityLayout from '../data/city-layout.json';
import districtThemes from '../data/district-themes.json';

export interface DistrictBounds {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DistrictTheme {
  building: number;
  roof: number;
  sidewalk: number;
  grass: number;
  minimap: number;
}

const themes = districtThemes as Record<string, DistrictTheme>;

export function getDistrictList(): DistrictBounds[] {
  return (cityLayout.districts as DistrictBounds[]).map((d) => ({
    id: d.id,
    name: d.name,
    x: d.x,
    y: d.y,
    w: d.w,
    h: d.h,
  }));
}

export function buildDistrictGrid(mapW: number, mapH: number): (string | null)[][] {
  const grid: (string | null)[][] = [];
  for (let y = 0; y < mapH; y++) {
    grid[y] = [];
    for (let x = 0; x < mapW; x++) grid[y][x] = null;
  }

  for (const district of cityLayout.districts as DistrictBounds[]) {
    for (let dy = 0; dy < district.h; dy++) {
      for (let dx = 0; dx < district.w; dx++) {
        const tx = district.x + dx;
        const ty = district.y + dy;
        if (tx >= mapW || ty >= mapH) continue;
        grid[ty][tx] = district.id;
      }
    }
  }

  return grid;
}

export function getDistrictTheme(districtId: string | null): DistrictTheme {
  if (!districtId) return themes.default;
  return themes[districtId] ?? themes.default;
}

export function getDistrictAt(grid: (string | null)[][], tx: number, ty: number): string | null {
  if (ty < 0 || tx < 0 || ty >= grid.length || tx >= (grid[0]?.length ?? 0)) return null;
  return grid[ty][tx];
}