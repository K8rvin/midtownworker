import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../config';
import { TileType, type CityMap } from '../world/CityMap';
import type { QuestManager } from '../systems/QuestManager';
import type { PoliceManager } from '../systems/PoliceManager';
import shopsData from '../data/shops.json';
import { shopMarkerColor } from '../systems/ShopManager';
import cityLayout from '../data/city-layout.json';

export interface FullMapContext {
  playerX: number;
  playerY: number;
  wantedLevel: number;
}

export class FullMapOverlay {
  private container: Phaser.GameObjects.Container | null = null;

  constructor(
    private scene: Phaser.Scene,
    private cityMap: CityMap,
    private questManager: QuestManager,
    private policeManager: PoliceManager
  ) {}

  isVisible(): boolean {
    return this.container !== null;
  }

  show(ctx: FullMapContext): void {
    this.hide();

    const mapW = this.cityMap.mapWidth;
    const mapH = this.cityMap.mapHeight;
    const scale = Math.min(8, Math.floor(640 / Math.max(mapW, mapH)));
    const ox = GAME_WIDTH / 2 - (mapW * scale) / 2;
    const oy = GAME_HEIGHT / 2 - (mapH * scale) / 2;
    const depth = 150;

    this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(depth);

    const bg = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82);
    const mapName = this.cityMap.mapId === 'port' ? 'ПОРТ' : 'КАРТА ГОРОДА';
    const title = this.scene.add
      .text(GAME_WIDTH / 2, 36, mapName, {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#c8f542',
      })
      .setOrigin(0.5);

    const mapGfx = this.scene.add.graphics();
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const gang = this.cityMap.gangZones[y][x];
        const tile = this.cityMap.tiles[y][x];
        let color = 0x1a1a2e;
        if (tile === TileType.Road) color = 0x2d2d44;
        else if (tile === TileType.Building) color = 0x3d3d5c;
        else if (gang === 'yakuza') color = 0xff2d55;
        else if (gang === 'rednecks') color = 0xff6b35;
        else if (gang === 'scientists') color = 0x00e676;
        mapGfx.fillStyle(color, tile === TileType.Building ? 1 : 0.45);
        mapGfx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }

    const districtLabels: Phaser.GameObjects.Text[] = [];
    if (this.cityMap.mapId === 'city') {
      for (const district of cityLayout.districts) {
        const cx = district.x + district.w / 2;
        const cy = district.y + district.h / 2;
        const label = this.scene.add
          .text(ox + cx * scale, oy + cy * scale, district.name, {
            fontFamily: 'monospace',
            fontSize: Math.max(7, scale - 1) + 'px',
            color: '#c8f542',
            align: 'center',
          })
          .setOrigin(0.5)
          .setAlpha(0.75);
        districtLabels.push(label);
      }
    }

    const icons = this.scene.add.graphics();
    const toMap = (wx: number, wy: number) => ({
      x: ox + (wx / (mapW * TILE_SIZE)) * (mapW * scale),
      y: oy + (wy / (mapH * TILE_SIZE)) * (mapH * scale),
    });

    for (const obj of this.cityMap.objects) {
      const wx = obj.x * TILE_SIZE + 16;
      const wy = obj.y * TILE_SIZE + 16;
      const p = toMap(wx, wy);
      if (obj.type === 'payphone') {
        icons.fillStyle(0x00b4ff, 1);
        icons.fillCircle(p.x, p.y, 3);
      } else if (obj.type === 'shop') {
        const shop = (shopsData as { id: string; type: string }[]).find((s) => s.id === obj.data?.shopId);
        const color = shopMarkerColor(shop?.type ?? '');
        icons.fillStyle(color, 1);
        icons.fillRect(p.x - 2, p.y - 2, 4, 4);
      } else if (obj.type === 'flag') {
        icons.fillStyle(0xffffff, 0.9);
        icons.fillTriangle(p.x, p.y - 4, p.x - 3, p.y + 2, p.x + 3, p.y + 2);
      }
    }

    for (const loc of this.cityMap.blockposts) {
      const p = toMap(loc.tx * TILE_SIZE + 16, loc.ty * TILE_SIZE + 16);
      icons.lineStyle(1, 0xffd600, 1);
      icons.strokeRect(p.x - 3, p.y - 3, 6, 6);
    }

    const questMarkers = this.questManager.getMinimapMarkers();
    for (const m of questMarkers) {
      const p = toMap(m.x, m.y);
      icons.fillStyle(0xff2d55, 1);
      icons.fillCircle(p.x, p.y, 4);
    }

    for (const m of this.questManager.getMinimapGiverMarkers(this.cityMap.mapId)) {
      const p = toMap(m.x, m.y);
      icons.fillStyle(0xff69b4, 1);
      icons.fillTriangle(p.x, p.y - 4, p.x - 3, p.y + 2, p.x + 3, p.y + 2);
    }

    if (ctx.wantedLevel > 0) {
      for (const cop of this.policeManager.policeNPCs) {
        if (!cop.active) continue;
        const p = toMap(cop.sprite.x, cop.sprite.y);
        icons.fillStyle(0xffd600, 0.9);
        icons.fillCircle(p.x, p.y, 2);
      }
      for (const pv of this.policeManager.policeVehicles) {
        if (!pv.active) continue;
        const p = toMap(pv.sprite.x, pv.sprite.y);
        icons.fillStyle(0xffd600, 1);
        icons.fillRect(p.x - 2, p.y - 2, 5, 3);
      }
    }

    const player = toMap(ctx.playerX, ctx.playerY);
    icons.fillStyle(0xc8f542, 1);
    icons.fillCircle(player.x, player.y, 5);
    icons.lineStyle(2, 0xffffff, 1);
    icons.strokeCircle(player.x, player.y, 5);

    const legend = this.scene.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 52,
        '● Вы  ◆ Квест  ▲ Заказчик  ■ Магазин  ○ Таксофон  □ Блокпост  ○ Копы (при розыске)',
        { fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }
      )
      .setOrigin(0.5);

    const hint = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, '[ M ] Закрыть', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#9ca3af',
      })
      .setOrigin(0.5);

    this.container.add([bg, title, mapGfx, ...districtLabels, icons, legend, hint]);
  }

  hide(): void {
    this.container?.destroy();
    this.container = null;
  }
}