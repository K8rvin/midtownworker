import Phaser from 'phaser';
import { GAME_WIDTH, TILE_SIZE, LIFE_SIM } from '../config';
import { TileType, type CityMap } from '../world/CityMap';
import type { QuestManager } from '../systems/QuestManager';
import shopsData from '../data/shops.json';
import { shopMarkerColor } from '../systems/ShopManager';
import { getDistrictAt, getDistrictTheme, buildDistrictGrid } from '../world/DistrictGrid';
import cityLayout from '../data/city-layout.json';

export const MINIMAP_VIEWPORT_TILES = 40;

interface MinimapMarker {
  x: number;
  y: number;
  kind: 'target' | 'objective' | 'giver';
}

interface EdgeArrow {
  x: number;
  y: number;
  angle: number;
  kind: MinimapMarker['kind'];
}

export class Minimap {
  private container: Phaser.GameObjects.Container;
  private mapGfx: Phaser.GameObjects.Graphics;
  private questMarkers: Phaser.GameObjects.Graphics;
  private playerDot: Phaser.GameObjects.Arc;
  private player2Dot: Phaser.GameObjects.Arc | null = null;
  private readonly size = 140;
  private readonly offsetX = GAME_WIDTH - 140 - 16;
  private readonly offsetY = 64;
  private readonly viewportTiles = MINIMAP_VIEWPORT_TILES;
  private tileScale: number;
  private mapWidth: number;
  private mapHeight: number;
  private blockposts: CityMap['blockposts'];
  private districtGrid: (string | null)[][];
  private cityMap: CityMap;
  private viewTx = 0;
  private viewTy = 0;

  constructor(
    private scene: Phaser.Scene,
    cityMap: CityMap,
    private questManager: QuestManager
  ) {
    this.cityMap = cityMap;
    this.mapWidth = cityMap.mapWidth;
    this.mapHeight = cityMap.mapHeight;
    this.blockposts = cityMap.blockposts;
    this.districtGrid =
      cityMap.districtGrid.length > 0
        ? cityMap.districtGrid
        : buildDistrictGrid(this.mapWidth, this.mapHeight);
    this.tileScale = this.size / this.viewportTiles;

    this.container = scene.add.container(this.offsetX, this.offsetY).setScrollFactor(0).setDepth(100);

    const bg = scene.add.rectangle(0, 0, this.size, this.size, 0x0d0d14, 0.9).setOrigin(0);
    bg.setStrokeStyle(2, 0xc8f542);

    this.mapGfx = scene.add.graphics();
    this.questMarkers = scene.add.graphics();
    this.playerDot = scene.add.circle(this.size / 2, this.size / 2, 3, 0xc8f542);
    this.playerDot.setStrokeStyle(1, 0xffffff);
    this.player2Dot = scene.add.circle(0, 0, 3, 0x00b4ff);
    this.player2Dot.setStrokeStyle(1, 0xffffff);
    this.player2Dot.setVisible(false);

    const crosshair = scene.add.graphics();
    crosshair.lineStyle(1, 0xc8f542, 0.35);
    crosshair.lineBetween(this.size / 2 - 5, this.size / 2, this.size / 2 + 5, this.size / 2);
    crosshair.lineBetween(this.size / 2, this.size / 2 - 5, this.size / 2, this.size / 2 + 5);

    this.container.add([bg, this.mapGfx, this.questMarkers, crosshair, this.playerDot, this.player2Dot]);

    scene.add
      .text(this.offsetX + this.size / 2, this.offsetY - 12, 'КАРТА', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    scene.add
      .text(
        this.offsetX + this.size / 2,
        this.offsetY + this.size + 10,
        LIFE_SIM
          ? '▶ сюжет  ◆ курьер  ■ магазин  ◎ задания'
          : '▶ цель  ▲ заказчик  ◎ таксофон  ■ магазин',
        {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: '#6b7280',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(
    px: number,
    py: number,
    p2x?: number,
    p2y?: number,
    lifeMarkers?: { x: number; y: number; kind: MinimapMarker['kind'] }[] | null
  ): void {
    const playerTx = px / TILE_SIZE;
    const playerTy = py / TILE_SIZE;
    this.viewTx = Phaser.Math.Clamp(playerTx - this.viewportTiles / 2, 0, Math.max(0, this.mapWidth - this.viewportTiles));
    this.viewTy = Phaser.Math.Clamp(playerTy - this.viewportTiles / 2, 0, Math.max(0, this.mapHeight - this.viewportTiles));

    this.redrawViewport();

    if (this.player2Dot && p2x !== undefined && p2y !== undefined) {
      this.player2Dot.setVisible(true);
      const p2 = this.worldToMinimap(p2x, p2y);
      this.player2Dot.setPosition(p2.x, p2.y);
    } else if (this.player2Dot) {
      this.player2Dot.setVisible(false);
    }

    this.questMarkers.clear();
    const markers: MinimapMarker[] = LIFE_SIM
      ? (lifeMarkers ?? [])
      : this.questManager.getAllMinimapMarkers(this.cityMap.mapId);
    const edgeArrows: EdgeArrow[] = [];

    for (const m of markers) {
      const pos = this.worldToMinimap(m.x, m.y);
      if (this.isInsideViewport(pos.x, pos.y, 6)) {
        this.drawMarkerDot(pos.x, pos.y, m.kind);
        if (m.kind === 'target') {
          this.questMarkers.fillStyle(0xff2d55, 0.2);
          this.questMarkers.fillCircle(pos.x, pos.y, 7);
        }
      } else {
        const arrow = this.edgeArrowFor(pos.x, pos.y, m.kind);
        if (arrow) edgeArrows.push(arrow);
      }
    }

    for (const bp of this.blockposts) {
      const wx = bp.tx * TILE_SIZE + TILE_SIZE / 2;
      const wy = bp.ty * TILE_SIZE + TILE_SIZE / 2;
      const pos = this.worldToMinimap(wx, wy);
      if (!this.isInsideViewport(pos.x, pos.y, 4)) continue;
      this.questMarkers.fillStyle(0xffd600, 0.85);
      this.questMarkers.fillRect(pos.x - 2, pos.y - 2, 4, 4);
    }

    for (const arrow of edgeArrows) {
      this.drawEdgeArrow(arrow);
    }
  }

  destroy(): void {
    this.container.destroy();
  }

  private worldToMinimap(wx: number, wy: number): { x: number; y: number } {
    const tx = wx / TILE_SIZE;
    const ty = wy / TILE_SIZE;
    return {
      x: (tx - this.viewTx) * this.tileScale,
      y: (ty - this.viewTy) * this.tileScale,
    };
  }

  private isInsideViewport(x: number, y: number, margin = 0): boolean {
    return x >= margin && y >= margin && x <= this.size - margin && y <= this.size - margin;
  }

  private edgeArrowFor(mx: number, my: number, kind: MinimapMarker['kind']): EdgeArrow | null {
    const cx = this.size / 2;
    const cy = this.size / 2;
    const dx = mx - cx;
    const dy = my - cy;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;

    const margin = 7;
    const half = this.size / 2 - margin;
    const scale = half / Math.max(Math.abs(dx), Math.abs(dy));
    return {
      x: cx + dx * scale,
      y: cy + dy * scale,
      angle: Math.atan2(dy, dx),
      kind,
    };
  }

  private drawEdgeArrow(arrow: EdgeArrow): void {
    const color = arrow.kind === 'target' ? 0xff2d55 : arrow.kind === 'giver' ? 0xff69b4 : 0xffa500;
    const gfx = this.questMarkers;
    const size = arrow.kind === 'target' ? 7 : 6;
    const cos = Math.cos(arrow.angle);
    const sin = Math.sin(arrow.angle);
    const tipX = arrow.x + cos * size;
    const tipY = arrow.y + sin * size;
    const baseX = arrow.x - cos * size * 0.5;
    const baseY = arrow.y - sin * size * 0.5;
    const perpX = -sin * size * 0.45;
    const perpY = cos * size * 0.45;

    gfx.fillStyle(color, 0.95);
    gfx.fillTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );
    gfx.lineStyle(1, 0xffffff, 0.6);
    gfx.strokeTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY
    );
  }

  private drawMarkerDot(x: number, y: number, kind: MinimapMarker['kind']): void {
    if (kind === 'target') {
      this.questMarkers.fillStyle(0xff2d55, 1);
      this.questMarkers.fillCircle(x, y, 4);
      this.questMarkers.lineStyle(1, 0xffffff, 1);
      this.questMarkers.strokeCircle(x, y, 4);
      return;
    }
    if (kind === 'giver') {
      this.questMarkers.fillStyle(0xff69b4, 1);
      this.questMarkers.fillTriangle(x, y - 4, x - 3, y + 2, x + 3, y + 2);
      this.questMarkers.lineStyle(1, 0xffffff, 0.7);
      this.questMarkers.strokeTriangle(x, y - 4, x - 3, y + 2, x + 3, y + 2);
      return;
    }
    this.questMarkers.fillStyle(0xffa500, 0.9);
    this.questMarkers.fillRect(x - 2, y - 2, 4, 4);
  }

  private redrawViewport(): void {
    const gfx = this.mapGfx;
    gfx.clear();

    const x0 = Math.floor(this.viewTx);
    const y0 = Math.floor(this.viewTy);
    const x1 = Math.min(this.mapWidth, x0 + this.viewportTiles);
    const y1 = Math.min(this.mapHeight, y0 + this.viewportTiles);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const tile = this.cityMap.tiles[y][x];
        const px = (x - this.viewTx) * this.tileScale;
        const py = (y - this.viewTy) * this.tileScale;
        const districtId = getDistrictAt(this.districtGrid, x, y);
        const theme = getDistrictTheme(districtId);
        const { color, alpha } = this.districtColorForTile(tile, theme);

        gfx.fillStyle(color, alpha);
        gfx.fillRect(px, py, Math.ceil(this.tileScale) + 0.5, Math.ceil(this.tileScale) + 0.5);

        if (tile === TileType.Building) {
          gfx.lineStyle(1, theme.roof, 0.45);
          gfx.strokeRect(px + 0.5, py + 0.5, Math.ceil(this.tileScale) - 1, Math.ceil(this.tileScale) - 1);
        }
      }
    }

    const major = cityLayout.majorRoads.centers;
    for (const cx of major) {
      for (const cy of major) {
        if (cx < x0 || cx >= x1 || cy < y0 || cy >= y1) continue;
        const px = (cx + 0.5 - this.viewTx) * this.tileScale;
        const py = (cy + 0.5 - this.viewTy) * this.tileScale;
        gfx.fillStyle(0xffd600, 0.7);
        gfx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
    }

    for (const obj of this.cityMap.objects) {
      if (obj.x < x0 || obj.x >= x1 || obj.y < y0 || obj.y >= y1) continue;
      const px = (obj.x + 0.5 - this.viewTx) * this.tileScale;
      const py = (obj.y + 0.5 - this.viewTy) * this.tileScale;

      if (obj.type === 'payphone') {
        gfx.fillStyle(0x00bfff, 0.35);
        gfx.fillCircle(px, py, 4);
        gfx.lineStyle(1.5, 0x00bfff, 1);
        gfx.strokeCircle(px, py, 3);
        gfx.fillStyle(0x00bfff, 1);
        gfx.fillCircle(px, py, 1.5);
      } else if (obj.type === 'shop') {
        const shop = (shopsData as { id: string; type: string }[]).find((s) => s.id === obj.data?.shopId);
        const color = shopMarkerColor(shop?.type ?? '');
        gfx.fillStyle(color, 0.85);
        gfx.fillRect(px - 2, py - 2, 4, 4);
        gfx.lineStyle(1, 0xffffff, 0.7);
        gfx.strokeRect(px - 2, py - 2, 4, 4);
      } else if (obj.type === 'landmark') {
        gfx.fillStyle(0xc8f542, 0.9);
        gfx.fillCircle(px, py, 3);
      } else if (obj.type === 'tree') {
        gfx.fillStyle(0x2d6a4f, 0.9);
        gfx.fillCircle(px, py, 2);
      }
    }
  }

  private districtColorForTile(
    tile: TileType,
    theme: ReturnType<typeof getDistrictTheme>
  ): { color: number; alpha: number } {
    switch (tile) {
      case TileType.Road:
        return { color: 0x3d3d55, alpha: 1 };
      case TileType.Stairs:
        return { color: 0x5a5a7a, alpha: 1 };
      case TileType.Grass:
        return { color: theme.grass, alpha: 0.75 };
      case TileType.Sidewalk:
        return { color: theme.sidewalk, alpha: 0.85 };
      case TileType.Building:
        return { color: theme.building, alpha: 1 };
      case TileType.Roof:
        return { color: theme.roof, alpha: 0.9 };
      default:
        return { color: theme.minimap, alpha: 0.5 };
    }
  }
}