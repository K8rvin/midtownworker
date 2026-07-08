import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import cityLayout from '../data/city-layout.json';
import { TileType, type CityMap } from './CityMap';
import { RoadNetwork } from './RoadNetwork';

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
    this.drawCenterLines(gfx);
    this.drawIntersections(gfx);
    this.drawCrosswalks(gfx);
  }

  private drawCenterLines(gfx: Phaser.GameObjects.Graphics): void {
    const dash = 10;
    const gap = 8;
    const lineColor = 0xd4c878;
    const minorColor = 0xb8b8c8;

    for (const band of this.network.horizontalBands) {
      const y = band.center;
      gfx.lineStyle(2, band.major ? lineColor : minorColor, band.major ? 0.7 : 0.45);
      for (let x = 0; x < this.cityMap.mapWidth; x++) {
        if (!this.network.isRoad(x, y)) continue;
        if (this.network.centerLineAt(x, y) === 'both') continue;
        if (this.network.findMajorIntersection(x, y, 3)) continue;
        const px = x * TILE_SIZE;
        const cy = y * TILE_SIZE + TILE_SIZE / 2;
        for (let d = 4; d < TILE_SIZE - 4; d += dash + gap) {
          gfx.lineBetween(px + d, cy, px + d + dash, cy);
        }
      }
    }

    for (const band of this.network.verticalBands) {
      const x = band.center;
      gfx.lineStyle(2, band.major ? lineColor : minorColor, band.major ? 0.7 : 0.45);
      for (let y = 0; y < this.cityMap.mapHeight; y++) {
        if (!this.network.isRoad(x, y)) continue;
        if (this.network.centerLineAt(x, y) === 'both') continue;
        if (this.network.findMajorIntersection(x, y, 3)) continue;
        const py = y * TILE_SIZE;
        const cx = x * TILE_SIZE + TILE_SIZE / 2;
        for (let d = 4; d < TILE_SIZE - 4; d += dash + gap) {
          gfx.lineBetween(cx, py + d, cx, py + d + dash);
        }
      }
    }
  }

  private drawIntersections(gfx: Phaser.GameObjects.Graphics): void {
    for (const inter of this.network.intersections) {
      if (!inter.major) continue;
      const px = inter.tx * TILE_SIZE;
      const py = inter.ty * TILE_SIZE;
      const half = Math.floor(cityLayoutHalf(inter) / 2) * TILE_SIZE;

      gfx.fillStyle(0x2a2a40, 0.35);
      gfx.fillRect(px - half, py - half, half * 2 + TILE_SIZE, half * 2 + TILE_SIZE);

      gfx.lineStyle(3, 0xf0f0f0, 0.85);
      gfx.lineBetween(px - half, py + TILE_SIZE / 2, px - half + TILE_SIZE * 1.5, py + TILE_SIZE / 2);
      gfx.lineBetween(px + half - TILE_SIZE * 1.5, py + TILE_SIZE / 2, px + half + TILE_SIZE, py + TILE_SIZE / 2);
      gfx.lineBetween(px + TILE_SIZE / 2, py - half, px + TILE_SIZE / 2, py - half + TILE_SIZE * 1.5);
      gfx.lineBetween(px + TILE_SIZE / 2, py + half - TILE_SIZE * 1.5, px + TILE_SIZE / 2, py + half + TILE_SIZE);
    }
  }

  private drawCrosswalks(gfx: Phaser.GameObjects.Graphics): void {
    const stripe = 4;
    for (const inter of this.network.intersections) {
      const r = inter.major ? 4 : 3;
      this.drawCrosswalkArm(gfx, inter.tx, inter.ty - r, 'h', stripe);
      this.drawCrosswalkArm(gfx, inter.tx, inter.ty + r, 'h', stripe);
      this.drawCrosswalkArm(gfx, inter.tx - r, inter.ty, 'v', stripe);
      this.drawCrosswalkArm(gfx, inter.tx + r, inter.ty, 'v', stripe);
    }
  }

  private drawCrosswalkArm(
    gfx: Phaser.GameObjects.Graphics,
    tx: number,
    ty: number,
    axis: 'h' | 'v',
    stripe: number
  ): void {
    const tile = this.cityMap.tiles[ty]?.[tx];
    if (tile !== TileType.Road && tile !== TileType.Sidewalk) return;
    const px = tx * TILE_SIZE;
    const py = ty * TILE_SIZE;
    gfx.fillStyle(0xf5f5f5, 0.55);
    if (axis === 'h') {
      for (let i = 0; i < 5; i++) {
        gfx.fillRect(px + 4 + i * stripe * 2, py + 8, stripe, TILE_SIZE - 16);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        gfx.fillRect(px + 8, py + 4 + i * stripe * 2, TILE_SIZE - 16, stripe);
      }
    }
  }
}

function cityLayoutHalf(inter: { major: boolean }): number {
  return inter.major ? cityLayout.majorRoads.width : cityLayout.minorRoads.width;
}