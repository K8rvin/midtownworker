import Phaser from 'phaser';
import { COLORS } from '../config';
import { TILESET_COLUMNS, TILESET_TILECOUNT, tilesetFrameKeys } from '../world/TileGids';

/** Always regenerate these — PNG overrides are legacy doodles. */
const FORCE_TILE_KEYS = [
  'tile_grass',
  'tile_road',
  'tile_sidewalk',
  'tile_building',
  'tile_roof',
  'tile_stairs',
  'tile_building_brick',
  'tile_building_brick_b',
  'tile_building_glass',
  'tile_building_industrial',
  'tile_building_warehouse',
  'tile_building_suburban',
  'tile_building_campus',
  'tile_building_old',
  'tile_roof_flat',
  'tile_roof_gravel',
  'tile_roof_metal',
  'tile_roof_green',
  'city_tileset',
];

export class SpriteGenerator {
  private skip = new Set<string>();

  constructor(private scene: Phaser.Scene) {}

  generateAll(skip: ReadonlySet<string> = new Set()): void {
    this.skip = new Set(skip);
    for (const key of FORCE_TILE_KEYS) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      this.skip.delete(key);
    }
    this.genTiles();
    this.genCityTileset();
    this.genPlayer();
    if (this.scene.textures.exists('player2')) this.scene.textures.remove('player2');
    this.genPlayerSheet('player2', 0x00b4ff, 0x5a9ad4, 0x3a6a9a);
    this.genNPCs();
    this.genVehicles();
    this.genObjects();
    this.genLandmarks();
    this.genShops();
    this.genBullet();
  }

  private shouldGen(key: string): boolean {
    return !this.skip.has(key);
  }

  private genTiles(): void {
    // --- Terrain (pixel grit, deterministic) ---
    this.forceTile('tile_grass', (g) => {
      g.fillStyle(0x1a3a2a, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x234d36, 1);
      g.fillRect(1, 1, 30, 30);
      const specs = [0x2d5a40, 0x1e4530, 0x3a6a4a, 0x163828];
      for (let i = 0; i < 24; i++) {
        const x = (i * 7 + 3) % 30;
        const y = (i * 11 + 5) % 30;
        g.fillStyle(specs[i % specs.length], 1);
        g.fillRect(1 + x, 1 + y, 1, 1);
        if (i % 4 === 0) g.fillRect(1 + x, 1 + y, 2, 1);
      }
    });

    this.forceTile('tile_road', (g) => {
      g.fillStyle(0x1a1a28, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x2a2a3c, 1);
      g.fillRect(0, 0, 32, 32);
      // asphalt grit
      for (let i = 0; i < 18; i++) {
        g.fillStyle(i % 2 ? 0x323248 : 0x222234, 1);
        g.fillRect((i * 5) % 31, (i * 9) % 31, 1, 1);
      }
      // center dashed line
      g.fillStyle(0xc8b86a, 1);
      for (let y = 2; y < 30; y += 8) g.fillRect(15, y, 2, 4);
      // edge curbs
      g.fillStyle(0x3a3a50, 1);
      g.fillRect(0, 0, 32, 1);
      g.fillRect(0, 31, 32, 1);
    });

    this.forceTile('tile_sidewalk', (g) => {
      g.fillStyle(0x3a3a4e, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x44445a, 1);
      g.fillRect(1, 1, 14, 14);
      g.fillRect(17, 1, 14, 14);
      g.fillRect(1, 17, 14, 14);
      g.fillRect(17, 17, 14, 14);
      g.fillStyle(0x2e2e40, 1);
      g.fillRect(0, 15, 32, 2);
      g.fillRect(15, 0, 2, 32);
      g.fillStyle(0x505068, 1);
      g.fillRect(2, 2, 1, 1);
      g.fillRect(20, 20, 1, 1);
    });

    this.forceTile('tile_stairs', (g) => {
      g.fillStyle(0x4a4a62, 1);
      g.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 5; i++) {
        g.fillStyle(i % 2 ? 0x6a6a88 : 0x5a5a78, 1);
        g.fillRect(2, 2 + i * 6, 28, 5);
        g.fillStyle(0x3a3a50, 1);
        g.fillRect(2, 6 + i * 6, 28, 1);
      }
      g.fillStyle(0xc8f542, 1);
      g.fillRect(14, 10, 4, 2);
      g.fillRect(13, 12, 6, 2);
      g.fillRect(12, 14, 8, 2);
    });

    // Default building/roof = brick / flat (GID 4 / 5)
    this.drawBuildingBrick('tile_building', false);
    this.drawRoofFlat('tile_roof');

    // Variants
    this.drawBuildingBrick('tile_building_brick', false);
    this.drawBuildingBrick('tile_building_brick_b', true);
    this.drawBuildingGlass('tile_building_glass');
    this.drawBuildingIndustrial('tile_building_industrial');
    this.drawBuildingWarehouse('tile_building_warehouse');
    this.drawBuildingSuburban('tile_building_suburban');
    this.drawBuildingCampus('tile_building_campus');
    this.drawBuildingOld('tile_building_old');
    this.drawRoofFlat('tile_roof_flat');
    this.drawRoofGravel('tile_roof_gravel');
    this.drawRoofMetal('tile_roof_metal');
    this.drawRoofGreen('tile_roof_green');
  }

  private forceTile(key: string, draw: (g: Phaser.GameObjects.Graphics) => void): void {
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.makeTile(key, 32, 32, draw);
  }

  /** Brick facade — dense / mixed midtown. */
  private drawBuildingBrick(key: string, alt: boolean): void {
    this.forceTile(key, (g) => {
      const wall = alt ? 0x5a3a3a : 0x4a3848;
      const wallDark = alt ? 0x3a2828 : 0x322430;
      const mortar = alt ? 0x6a4a4a : 0x5a4858;
      g.fillStyle(wallDark, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(wall, 1);
      g.fillRect(1, 1, 30, 30);
      // brick rows
      for (let row = 0; row < 7; row++) {
        const y = 2 + row * 4;
        g.fillStyle(mortar, 1);
        g.fillRect(1, y + 3, 30, 1);
        const offset = row % 2 === 0 ? 0 : 2;
        for (let col = 0; col < 6; col++) {
          g.fillStyle(wallDark, 1);
          g.fillRect(2 + offset + col * 5, y, 1, 3);
        }
      }
      // cornice
      g.fillStyle(0x2a1a28, 1);
      g.fillRect(0, 0, 32, 3);
      g.fillStyle(0x6a5a68, 1);
      g.fillRect(1, 1, 30, 1);
      // windows 2x2 grid
      const lit = [true, false, true, true, false, true];
      let wi = 0;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const wx = 3 + col * 10;
          const wy = 6 + row * 9;
          g.fillStyle(0x1a1020, 1);
          g.fillRect(wx, wy, 8, 7);
          g.fillStyle(lit[wi++] ? 0xffe8a0 : 0x1a2840, 1);
          g.fillRect(wx + 1, wy + 1, 6, 5);
          g.fillStyle(0x2a2030, 1);
          g.fillRect(wx + 3, wy, 1, 7);
          g.fillRect(wx, wy + 3, 8, 1);
        }
      }
      // door
      g.fillStyle(0x1a1018, 1);
      g.fillRect(12, 24, 8, 8);
      g.fillStyle(0x3a2a20, 1);
      g.fillRect(13, 25, 6, 7);
      g.fillStyle(0xc8a060, 1);
      g.fillRect(17, 28, 1, 1);
    });
  }

  private drawBuildingGlass(key: string): void {
    this.forceTile(key, (g) => {
      g.fillStyle(0x1a2838, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x2a3a4e, 1);
      g.fillRect(1, 1, 30, 30);
      g.fillStyle(0x0a1828, 1);
      g.fillRect(0, 0, 32, 3);
      // glass grid
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const wx = 2 + col * 7;
          const wy = 4 + row * 7;
          const bright = (row + col) % 3 !== 0;
          g.fillStyle(bright ? 0x4a88b8 : 0x1a3048, 1);
          g.fillRect(wx, wy, 6, 6);
          g.fillStyle(0x88c8e8, bright ? 0.35 : 0.15);
          g.fillRect(wx + 1, wy + 1, 2, 2);
        }
      }
      g.fillStyle(0x0a1020, 1);
      g.fillRect(13, 26, 6, 6);
    });
  }

  private drawBuildingIndustrial(key: string): void {
    this.forceTile(key, (g) => {
      g.fillStyle(0x3a3a40, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x4a4a52, 1);
      g.fillRect(1, 1, 30, 30);
      // corrugated stripes
      for (let x = 2; x < 30; x += 3) {
        g.fillStyle(0x3a3a44, 1);
        g.fillRect(x, 2, 1, 28);
      }
      g.fillStyle(0x2a2a30, 1);
      g.fillRect(0, 0, 32, 4);
      // large windows
      g.fillStyle(0x1a2030, 1);
      g.fillRect(3, 6, 12, 8);
      g.fillRect(17, 6, 12, 8);
      g.fillStyle(0x3a5060, 1);
      g.fillRect(4, 7, 10, 6);
      g.fillRect(18, 7, 10, 6);
      // garage door
      g.fillStyle(0x2a2a32, 1);
      g.fillRect(6, 18, 20, 13);
      for (let y = 19; y < 30; y += 3) {
        g.fillStyle(0x3a3a44, 1);
        g.fillRect(7, y, 18, 2);
      }
      g.fillStyle(0x888890, 1);
      g.fillRect(15, 24, 2, 2);
    });
  }

  private drawBuildingWarehouse(key: string): void {
    this.forceTile(key, (g) => {
      g.fillStyle(0x4a4030, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x5a5040, 1);
      g.fillRect(1, 1, 30, 30);
      g.fillStyle(0x3a3428, 1);
      g.fillRect(0, 0, 32, 3);
      // loading bay
      g.fillStyle(0x2a2418, 1);
      g.fillRect(4, 14, 24, 17);
      g.fillStyle(0x4a4030, 1);
      for (let y = 15; y < 30; y += 4) g.fillRect(5, y, 22, 2);
      // high windows
      for (let col = 0; col < 4; col++) {
        g.fillStyle(0x1a2830, 1);
        g.fillRect(3 + col * 7, 5, 5, 6);
        g.fillStyle(0x6a8890, 1);
        g.fillRect(4 + col * 7, 6, 3, 4);
      }
      // chimney hint
      g.fillStyle(0x3a3028, 1);
      g.fillRect(24, 1, 5, 8);
    });
  }

  private drawBuildingSuburban(key: string): void {
    this.forceTile(key, (g) => {
      // grass strip at bottom edge of lot feel
      g.fillStyle(0x2a4a30, 1);
      g.fillRect(0, 28, 32, 4);
      // house body
      g.fillStyle(0x6a5a48, 1);
      g.fillRect(2, 10, 28, 18);
      g.fillStyle(0x5a4a3a, 1);
      g.fillRect(2, 10, 28, 2);
      // roof triangle hint (top-down: darker top band)
      g.fillStyle(0x5a3030, 1);
      g.fillRect(1, 4, 30, 7);
      g.fillStyle(0x4a2828, 1);
      g.fillRect(4, 2, 24, 3);
      g.fillStyle(0x3a2020, 1);
      g.fillRect(10, 1, 12, 2);
      // windows
      g.fillStyle(0xffe8a0, 1);
      g.fillRect(5, 14, 6, 6);
      g.fillRect(21, 14, 6, 6);
      g.fillStyle(0x2a2018, 1);
      g.fillRect(7, 14, 1, 6);
      g.fillRect(23, 14, 1, 6);
      g.fillRect(5, 16, 6, 1);
      g.fillRect(21, 16, 6, 1);
      // door
      g.fillStyle(0x3a2818, 1);
      g.fillRect(13, 18, 6, 10);
      g.fillStyle(0xc8a060, 1);
      g.fillRect(17, 23, 1, 1);
      // bush
      g.fillStyle(0x2d6a3a, 1);
      g.fillRect(3, 26, 4, 3);
      g.fillRect(25, 26, 4, 3);
    });
  }

  private drawBuildingCampus(key: string): void {
    this.forceTile(key, (g) => {
      g.fillStyle(0x3a4850, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0xc8d0d4, 1);
      g.fillRect(1, 1, 30, 30);
      g.fillStyle(0xa8b0b8, 1);
      g.fillRect(0, 0, 32, 3);
      // clean window grid
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const wx = 3 + col * 10;
          const wy = 5 + row * 8;
          g.fillStyle(0x2a5068, 1);
          g.fillRect(wx, wy, 8, 6);
          g.fillStyle(0x88c0d8, 1);
          g.fillRect(wx + 1, wy + 1, 6, 4);
        }
      }
      g.fillStyle(0x4a5860, 1);
      g.fillRect(12, 28, 8, 4);
    });
  }

  private drawBuildingOld(key: string): void {
    this.forceTile(key, (g) => {
      g.fillStyle(0x4a3830, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x6a5040, 1);
      g.fillRect(1, 1, 30, 30);
      // weathered streaks
      for (let i = 0; i < 6; i++) {
        g.fillStyle(0x5a4030, 1);
        g.fillRect(3 + i * 5, 2, 1, 28);
      }
      g.fillStyle(0x3a2820, 1);
      g.fillRect(0, 0, 32, 4);
      // arched window feel
      for (let col = 0; col < 3; col++) {
        const wx = 3 + col * 10;
        g.fillStyle(0x1a1810, 1);
        g.fillRect(wx, 8, 8, 10);
        g.fillStyle(0x3a4830, 1);
        g.fillRect(wx + 1, 9, 6, 8);
        g.fillStyle(0x2a2018, 1);
        g.fillRect(wx + 3, 8, 2, 10);
      }
      // shop door
      g.fillStyle(0x2a1a10, 1);
      g.fillRect(11, 22, 10, 10);
      g.fillStyle(0x5a4030, 1);
      g.fillRect(12, 23, 8, 8);
      // awning
      g.fillStyle(0x8a3030, 1);
      g.fillRect(8, 20, 16, 3);
      g.fillStyle(0xc8a040, 1);
      g.fillRect(8, 20, 16, 1);
    });
  }

  private drawRoofFlat(key: string): void {
    this.forceTile(key, (g) => {
      g.fillStyle(0x3a3a52, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x4a4a62, 1);
      g.fillRect(1, 1, 30, 30);
      g.fillStyle(0x2a2a3a, 1);
      for (let i = 0; i < 32; i += 8) {
        g.fillRect(i, 0, 1, 32);
        g.fillRect(0, i, 32, 1);
      }
      // AC units
      g.fillStyle(0x5a5a70, 1);
      g.fillRect(4, 4, 8, 6);
      g.fillRect(20, 18, 8, 6);
      g.fillStyle(0x3a3a50, 1);
      g.fillRect(5, 5, 6, 2);
      g.fillRect(21, 19, 6, 2);
    });
  }

  private drawRoofGravel(key: string): void {
    this.forceTile(key, (g) => {
      g.fillStyle(0x4a4840, 1);
      g.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 40; i++) {
        g.fillStyle(i % 3 === 0 ? 0x5a5848 : 0x3a3830, 1);
        g.fillRect((i * 7) % 31, (i * 11) % 31, 1, 1);
      }
      g.fillStyle(0x6a6858, 1);
      g.fillRect(10, 10, 12, 8);
      g.fillStyle(0x2a2820, 1);
      g.fillRect(12, 12, 8, 4);
    });
  }

  private drawRoofMetal(key: string): void {
    this.forceTile(key, (g) => {
      g.fillStyle(0x4a5058, 1);
      g.fillRect(0, 0, 32, 32);
      for (let y = 0; y < 32; y += 4) {
        g.fillStyle(y % 8 === 0 ? 0x5a6068 : 0x3a4048, 1);
        g.fillRect(0, y, 32, 3);
      }
      g.fillStyle(0x2a3038, 1);
      g.fillRect(14, 6, 4, 20);
      g.fillStyle(0x6a7078, 1);
      g.fillRect(6, 22, 8, 6);
    });
  }

  private drawRoofGreen(key: string): void {
    this.forceTile(key, (g) => {
      g.fillStyle(0x2a4a30, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x3a6a40, 1);
      g.fillRect(1, 1, 30, 30);
      for (let i = 0; i < 20; i++) {
        g.fillStyle(i % 2 ? 0x4a7a50 : 0x2a5a38, 1);
        g.fillRect((i * 5 + 2) % 30, (i * 7 + 3) % 30, 2, 2);
      }
      g.fillStyle(0x5a4a30, 1);
      g.fillRect(20, 4, 8, 6);
    });
  }

  /** Combined spritesheet for Phaser Tilemap (21 frames: base + zones + variants). */
  private genCityTileset(): void {
    if (this.scene.textures.exists('city_tileset')) {
      this.scene.textures.remove('city_tileset');
    }
    const frameKeys = tilesetFrameKeys();
    const canvas = document.createElement('canvas');
    canvas.width = TILESET_COLUMNS * 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const zoneColors = [COLORS.yakuza, COLORS.rednecks, COLORS.scientists];

    for (let i = 0; i < TILESET_TILECOUNT; i++) {
      const key = frameKeys[i];
      const dx = i * 32;
      if (key && this.scene.textures.exists(key)) {
        const src = this.scene.textures.get(key).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
        ctx.drawImage(src, 0, 0, 32, 32, dx, 0, 32, 32);
      } else if (i >= 6 && i <= 8) {
        // zone swatches
        const c = zoneColors[i - 6];
        ctx.fillStyle = `#${c.toString(16).padStart(6, '0')}`;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(dx, 0, 32, 32);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = '#333344';
        ctx.fillRect(dx, 0, 32, 32);
      }
    }

    this.scene.textures.addCanvas('city_tileset', canvas);
  }

  private genPlayer(): void {
    // Always regenerate — PNG legacy sheets break face-up walk frame mapping.
    this.genPlayerSheet('player', COLORS.player, 0x9ac830, 0x8ab830);
  }

  private genPlayerSheet(
    key: string,
    bodyColor: number,
    armColor: number,
    trimColor: number
  ): void {
    const frameW = 28;
    const frameH = 28;
    const walkFrames = 6;
    const walkRows = 4;
    const walkAxes: ('v_up' | 'v_down' | 'h_left' | 'h_right')[] = [
      'v_up',
      'v_down',
      'h_left',
      'h_right',
    ];
    const canvas = document.createElement('canvas');
    canvas.width = frameW * walkFrames;
    canvas.height = frameH * walkRows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let row = 0; row < walkRows; row++) {
      for (let phase = 0; phase < walkFrames; phase++) {
        const g = this.scene.make.graphics({ x: 0, y: 0 });
        this.drawPlayerFaceUpWalk(g, walkAxes[row], phase, bodyColor, armColor, trimColor);
        const idx = row * walkFrames + phase;
        const tmpKey = `__${key}_f${idx}`;
        g.generateTexture(tmpKey, frameW, frameH);
        const src = this.scene.textures.get(tmpKey).getSourceImage() as HTMLCanvasElement;
        ctx.drawImage(src, 0, 0, frameW, frameH, phase * frameW, row * frameH, frameW, frameH);
        g.destroy();
        this.scene.textures.remove(tmpKey);
      }
    }

    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    this.scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: frameH,
    });
  }

  private walkCycle(phase: number, frames = 6) {
    const t = (phase / frames) * Math.PI * 2;
    return {
      legL: Math.sin(t) * 5.5,
      legR: Math.sin(t + Math.PI) * 5.5,
      armL: Math.sin(t + Math.PI) * 1,
      armR: Math.sin(t) * 1,
      bodyBob: Math.abs(Math.sin(t * 2)) * 0.5,
    };
  }

  private armVerticalPose(
    shoulderX: number,
    shoulderY: number,
    swing: number,
    side: -1 | 1,
    torsoCx: number
  ): { shoulder: { x: number; y: number }; elbow: { x: number; y: number }; hand: { x: number; y: number } } {
    const verticalLift = swing * 1.9;
    const elbowX =
      side === -1
        ? shoulderX + (torsoCx - shoulderX) * 0.38
        : shoulderX - (shoulderX - torsoCx) * 0.38;

    return {
      shoulder: { x: shoulderX, y: shoulderY },
      elbow: { x: elbowX, y: shoulderY + 2.0 + verticalLift * 0.35 },
      hand: { x: shoulderX + side * 0.75, y: shoulderY + 0.6 + verticalLift * 0.7 },
    };
  }

  private drawDirectionalHead(
    g: Phaser.GameObjects.Graphics,
    axis: 'v_up' | 'v_down' | 'h_left' | 'h_right',
    bodyY: number,
    torsoCx: number
  ): void {
    let hx = torsoCx;
    let hy = bodyY - 8;
    let hairW = 5;
    let hairH = 3;
    let showEyes: 'front' | 'back' | 'left' | 'right' = 'front';

    switch (axis) {
      case 'v_up':
        hx = torsoCx;
        hy = bodyY - 9;
        showEyes = 'front';
        break;
      case 'v_down':
        hx = torsoCx;
        hy = bodyY - 6.5;
        hairW = 6;
        hairH = 4;
        showEyes = 'back';
        break;
      case 'h_left':
        hx = torsoCx;
        hy = bodyY - 8;
        showEyes = 'left';
        break;
      case 'h_right':
        hx = torsoCx;
        hy = bodyY - 8;
        showEyes = 'right';
        break;
    }

    g.fillStyle(0xffcc99, 1);
    g.fillCircle(hx, hy, 4.5);
    g.fillStyle(0x2a2a40, 1);
    g.fillRect(hx - hairW / 2, hy - 4.5, hairW, hairH);

    if (showEyes === 'front') {
      g.fillRect(hx - 1, hy - 1, 1.5, 1.5);
      g.fillRect(hx + 1, hy, 1.5, 1.5);
    } else if (showEyes === 'back') {
      g.fillStyle(0x3a2a20, 1);
      g.fillRect(hx - 2, hy - 2, 4, 2);
    } else if (showEyes === 'left') {
      g.fillRect(hx - 1.5, hy - 0.5, 1.5, 1.5);
    } else {
      g.fillRect(hx + 0.2, hy - 0.5, 1.5, 1.5);
    }
  }

  private armHorizontalPose(
    shoulderX: number,
    shoulderY: number,
    swing: number,
    side: -1 | 1,
    dir: 'left' | 'right',
    torsoCx: number
  ): { shoulder: { x: number; y: number }; elbow: { x: number; y: number }; hand: { x: number; y: number } } {
    const dirBias = dir === 'left' ? -1.2 : 1.2;
    const inwardT = 0.58;
    const elbowX =
      side === -1
        ? shoulderX + (torsoCx - shoulderX) * inwardT + dirBias + swing * dirBias * 0.2
        : shoulderX - (shoulderX - torsoCx) * inwardT + dirBias + swing * dirBias * 0.2;
    const handX = Math.max(torsoCx - 4.5, Math.min(torsoCx + 4.5, elbowX + dirBias * 0.65 + side * swing * 0.45));

    return {
      shoulder: { x: shoulderX, y: shoulderY },
      elbow: { x: elbowX, y: shoulderY + 2.3 + Math.abs(swing) * 0.25 },
      hand: { x: handX, y: shoulderY + 1.0 + swing * 0.35 },
    };
  }

  private drawArmSegment(
    g: Phaser.GameObjects.Graphics,
    pose: {
      shoulder: { x: number; y: number };
      elbow: { x: number; y: number };
      hand: { x: number; y: number };
    },
    armColor: number
  ): void {
    g.lineStyle(2, armColor, 1);
    g.lineBetween(pose.shoulder.x, pose.shoulder.y, pose.elbow.x, pose.elbow.y);
    g.lineBetween(pose.elbow.x, pose.elbow.y, pose.hand.x, pose.hand.y);
    g.fillStyle(0xffcc99, 1);
    g.fillCircle(pose.hand.x, pose.hand.y, 1.8);
  }

  /** Rows: v_up=W, v_down=S, h_left=A, h_right=D. */
  private drawPlayerFaceUpWalk(
    g: Phaser.GameObjects.Graphics,
    axis: 'v_up' | 'v_down' | 'h_left' | 'h_right',
    phase: number,
    bodyColor = COLORS.player,
    armColor = 0x9ac830,
    trimColor = 0x8ab830
  ): void {
    const cx = 14;
    const cy = 14;
    const cycle = this.walkCycle(phase);
    const bodyY = cy + cycle.bodyBob;
    const isVertical = axis === 'v_up' || axis === 'v_down';
    const shoulderSpread = isVertical ? 4.5 : 2;
    const shoulderY = bodyY - (isVertical ? 1 : 2);

    let leftPose;
    let rightPose;
    if (isVertical) {
      leftPose = this.armVerticalPose(cx - shoulderSpread, shoulderY, cycle.armL, -1, cx);
      rightPose = this.armVerticalPose(cx + shoulderSpread, shoulderY, cycle.armR, 1, cx);
    } else {
      const dir = axis === 'h_left' ? 'left' : 'right';
      leftPose = this.armHorizontalPose(cx - shoulderSpread, shoulderY, cycle.armL, -1, dir, cx);
      rightPose = this.armHorizontalPose(cx + shoulderSpread, shoulderY, cycle.armR, 1, dir, cx);
    }
    const backFirst = cycle.armL < cycle.armR;

    g.fillStyle(0x000000, 0.38);
    g.fillEllipse(cx, bodyY + 9, 10, 4);

    const shoe = (x: number, y: number) => {
      g.lineStyle(2.5, 0x2a3a5c, 1);
      g.lineBetween(cx, bodyY + 1, x, y);
      g.fillStyle(0x1a1a28, 1);
      g.fillCircle(x, y, 2.5);
      g.fillStyle(0x9999aa, 1);
      g.fillCircle(x, y, 1.2);
    };

    const torso = () => {
      g.fillStyle(0x2a3a5c, 1);
      g.fillRoundedRect(cx - 4, bodyY - 3, 8, 10, 2);
      g.fillStyle(bodyColor, 1);
      g.fillRoundedRect(cx - 5, bodyY - 5, 10, 11, 3);
      g.fillStyle(trimColor, 0.4);
      g.fillRect(cx - 4, bodyY - 4, 8, 3);
    };

    if (isVertical) {
      shoe(cx - 5, bodyY + 4 + cycle.legL);
      shoe(cx + 5, bodyY + 4 + cycle.legR);
    } else {
      shoe(cx + cycle.legL, bodyY + 5);
      shoe(cx + cycle.legR, bodyY + 5);
    }

    const drawBackArm = () => this.drawArmSegment(g, backFirst ? leftPose : rightPose, armColor);
    const drawFrontArm = () => this.drawArmSegment(g, backFirst ? rightPose : leftPose, armColor);

    drawBackArm();
    torso();
    drawFrontArm();
    this.drawDirectionalHead(g, axis, bodyY, cx);
  }

  /** 0=left, 1=down, 2=right, 3=up. 4 фазы шага. */
  private drawPlayerPose(
    g: Phaser.GameObjects.Graphics,
    dir: 0 | 1 | 2 | 3,
    phase: number,
    bodyColor = COLORS.player,
    armColor = 0x9ac830,
    trimColor = 0x8ab830
  ): void {
    const cx = 14;
    const cy = 14;
    const fwdA = phase === 1 ? 3 : phase === 3 ? -3 : 0;
    const fwdB = phase === 1 ? -4 : phase === 3 ? 4 : 0;
    const armA = phase === 1 ? 4 : phase === 3 ? -4 : 0;
    const armB = phase === 1 ? -4 : phase === 3 ? 4 : 0;

    g.fillStyle(0x000000, 0.38);
    g.fillEllipse(cx, cy + 9, 10, 4);

    const shoe = (x: number, y: number) => {
      g.lineStyle(2.5, 0x2a3a5c, 1);
      g.lineBetween(cx, cy + 1, x, y);
      g.fillStyle(0x1a1a28, 1);
      g.fillCircle(x, y, 2.5);
      g.fillStyle(0x9999aa, 1);
      g.fillCircle(x, y, 1.2);
    };

    const arm = (x1: number, y1: number, x2: number, y2: number) => {
      g.lineStyle(2, armColor, 1);
      g.lineBetween(x1, y1, x2, y2);
      g.fillStyle(0xffcc99, 1);
      g.fillCircle(x2, y2, 1.8);
    };

    const torso = (hx: number, hy: number, hw: number, hh: number) => {
      g.fillStyle(0x2a3a5c, 1);
      g.fillRoundedRect(hx - hw / 2 + 1, hy - hh / 2 + 2, hw - 2, hh - 3, 2);
      g.fillStyle(bodyColor, 1);
      g.fillRoundedRect(hx - hw / 2, hy - hh / 2, hw, hh, 3);
      g.fillStyle(trimColor, 0.4);
      g.fillRect(hx - hw / 2 + 1, hy - hh / 2 + 1, hw - 2, 3);
    };

    const head = (x: number, y: number) => {
      g.fillStyle(0xffcc99, 1);
      g.fillCircle(x, y, 4.5);
      g.fillStyle(0x2a2a40, 1);
      g.fillRect(x - 3, y - 4, 5, 3);
      g.fillRect(x - 1, y - 1, 1.5, 1.5);
      g.fillRect(x + 1, y, 1.5, 1.5);
    };

    if (dir === 2) {
      shoe(cx + fwdA, cy - 6);
      shoe(cx + fwdB, cy + 6);
      arm(cx - 2, cy - 4, cx - 6, cy - 8 + armB);
      arm(cx - 2, cy + 4, cx - 6, cy + 8 + armA);
      torso(cx, cy, 9, 11);
      head(cx + 8, cy);
    } else if (dir === 0) {
      shoe(cx - fwdA, cy - 6);
      shoe(cx - fwdB, cy + 6);
      arm(cx + 2, cy - 4, cx + 6, cy - 8 + armB);
      arm(cx + 2, cy + 4, cx + 6, cy + 8 + armA);
      torso(cx, cy, 9, 11);
      head(cx - 8, cy);
    } else if (dir === 1) {
      shoe(cx - 6, cy + fwdA);
      shoe(cx + 6, cy + fwdB);
      arm(cx - 4, cy - 2, cx - 8 + armB, cy - 6);
      arm(cx + 4, cy - 2, cx + 8 + armA, cy - 6);
      torso(cx, cy, 11, 9);
      head(cx, cy + 8);
    } else {
      shoe(cx - 6, cy - fwdA);
      shoe(cx + 6, cy - fwdB);
      arm(cx - 4, cy + 2, cx - 8 + armB, cy + 6);
      arm(cx + 4, cy + 2, cx + 8 + armA, cy + 6);
      torso(cx, cy, 11, 9);
      head(cx, cy - 8);
    }
  }

  private genNPCs(): void {
    const types: { key: string; body: number; accent?: number; police?: boolean; target?: boolean }[] = [
      { key: 'npc_civilian', body: COLORS.neutral },
      { key: 'npc_yakuza', body: COLORS.yakuza, accent: 0x1a1a28 },
      { key: 'npc_rednecks', body: COLORS.rednecks, accent: 0x5a3018 },
      { key: 'npc_scientists', body: COLORS.scientists, accent: 0x0a4028 },
      { key: 'npc_police', body: COLORS.police, police: true },
      { key: 'npc_target', body: 0xaa44cc, target: true },
    ];
    // Always regenerate walk sheets so ped/NPC animation works (PNG static overrides break frames).
    for (const t of types) {
      this.genNpcWalkSheet(t.key, t.body, t.accent ?? 0x2a3a5c, !!t.police, !!t.target);
    }
  }

  /** 4 dirs × 4 frames — same row order as player: up, down, left, right. */
  private genNpcWalkSheet(
    key: string,
    bodyColor: number,
    pantsColor: number,
    police: boolean,
    target: boolean
  ): void {
    const frameW = 24;
    const frameH = 28;
    const walkFrames = 4;
    const walkRows = 4;
    const axes: Array<'v_up' | 'v_down' | 'h_left' | 'h_right'> = [
      'v_up',
      'v_down',
      'h_left',
      'h_right',
    ];
    const canvas = document.createElement('canvas');
    canvas.width = frameW * walkFrames;
    canvas.height = frameH * walkRows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let row = 0; row < walkRows; row++) {
      for (let phase = 0; phase < walkFrames; phase++) {
        const g = this.scene.make.graphics({ x: 0, y: 0 });
        this.drawNpcWalkFrame(g, axes[row], phase, bodyColor, pantsColor, police, target);
        const idx = row * walkFrames + phase;
        const tmpKey = `__${key}_f${idx}`;
        g.generateTexture(tmpKey, frameW, frameH);
        const src = this.scene.textures.get(tmpKey).getSourceImage() as HTMLCanvasElement;
        ctx.drawImage(src, 0, 0, frameW, frameH, phase * frameW, row * frameH, frameW, frameH);
        g.destroy();
        this.scene.textures.remove(tmpKey);
      }
    }

    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    this.scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: frameH,
    });
  }

  private drawNpcWalkFrame(
    g: Phaser.GameObjects.Graphics,
    axis: 'v_up' | 'v_down' | 'h_left' | 'h_right',
    phase: number,
    bodyColor: number,
    pantsColor: number,
    police: boolean,
    target: boolean
  ): void {
    const cx = 12;
    const cy = 13;
    const t = (phase / 4) * Math.PI * 2;
    const legL = Math.sin(t) * 3.5;
    const legR = Math.sin(t + Math.PI) * 3.5;
    const bob = Math.abs(Math.sin(t * 2)) * 0.6;

    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(cx, 24, 8, 3.5);

    const legOff =
      axis === 'h_left' || axis === 'h_right'
        ? { lx: legL * 0.3, ly: Math.abs(legL) * 0.4, rx: legR * 0.3, ry: Math.abs(legR) * 0.4 }
        : { lx: -3 + legL * 0.15, ly: 7 + Math.max(0, -legL) * 0.3, rx: 3 + legR * 0.15, ry: 7 + Math.max(0, -legR) * 0.3 };

    g.lineStyle(2.2, pantsColor, 1);
    g.lineBetween(cx - 2, cy + 3 + bob, cx + legOff.lx, cy + legOff.ly + bob);
    g.lineBetween(cx + 2, cy + 3 + bob, cx + legOff.rx, cy + legOff.ry + bob);
    g.fillStyle(0x1a1a28, 1);
    g.fillCircle(cx + legOff.lx, cy + legOff.ly + bob, 1.8);
    g.fillCircle(cx + legOff.rx, cy + legOff.ry + bob, 1.8);

    g.fillStyle(pantsColor, 1);
    g.fillRoundedRect(cx - 3.5, cy + 1 + bob, 7, 4.5, 2);
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(cx - 4.5, cy - 4 + bob, 9, 9, 2.5);
    if (police) {
      g.fillStyle(0x1a1a28, 1);
      g.fillRect(cx - 3.5, cy - 3 + bob, 7, 2);
      g.fillStyle(0x303040, 1);
      g.fillRect(cx - 1, cy - 1 + bob, 2, 5);
    }

    // Arms swing
    const armSwing = Math.sin(t) * 2.5;
    g.lineStyle(2, bodyColor, 1);
    if (axis === 'h_left') {
      g.lineBetween(cx, cy - 1 + bob, cx - 6, cy + 2 + bob + armSwing);
      g.lineBetween(cx, cy - 1 + bob, cx - 2, cy + 4 + bob - armSwing);
    } else if (axis === 'h_right') {
      g.lineBetween(cx, cy - 1 + bob, cx + 6, cy + 2 + bob + armSwing);
      g.lineBetween(cx, cy - 1 + bob, cx + 2, cy + 4 + bob - armSwing);
    } else {
      g.lineBetween(cx - 4, cy - 1 + bob, cx - 5, cy + 4 + bob + armSwing);
      g.lineBetween(cx + 4, cy - 1 + bob, cx + 5, cy + 4 + bob - armSwing);
    }

    const hy = cy - 8 + bob + (axis === 'v_down' ? 1 : axis === 'v_up' ? -0.5 : 0);
    g.fillStyle(0xffcc99, 1);
    g.fillCircle(cx, hy, 3.8);
    g.fillStyle(0x2a2a40, 1);
    g.fillRect(cx - 2.5, hy - 3.5, 5, 2.5);
    if (axis !== 'v_down') {
      g.fillStyle(0x1a1a28, 1);
      if (axis === 'h_left') g.fillCircle(cx - 1.5, hy, 0.9);
      else if (axis === 'h_right') g.fillCircle(cx + 1.5, hy, 0.9);
      else {
        g.fillCircle(cx - 1.2, hy, 0.8);
        g.fillCircle(cx + 1.2, hy, 0.8);
      }
    }

    if (target) {
      g.lineStyle(1.5, 0xff2d55, 0.85);
      g.strokeCircle(cx, cy + 1 + bob, 10);
    }
  }

  private genVehicles(): void {
    // Always regen so new types appear even if PNG mode is on
    for (const k of [
      'vehicle_sedan',
      'vehicle_sports',
      'vehicle_truck',
      'vehicle_van',
      'vehicle_taxi',
      'vehicle_police',
      'vehicle_bicycle',
      'vehicle_moped',
      'vehicle_motorcycle',
    ]) {
      if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    }
    this.genCarTopDown('vehicle_sedan', 0x3a7cc9, 0x2a5a96, 'sedan');
    this.genCarTopDown('vehicle_sports', 0xe04030, 0xa02018, 'sports');
    this.genCarTopDown('vehicle_truck', 0x9a7a50, 0x6a5030, 'truck');
    this.genCarTopDown('vehicle_van', 0x6a7a80, 0x4a5a60, 'van');
    this.genCarTopDown('vehicle_taxi', 0xf1c40f, 0xc9a000, 'sedan');
    this.genCarTopDown('vehicle_police', 0xf0f0f0, 0x303040, 'police');
    this.genTwoWheeler('vehicle_bicycle', 0x2ecc71, 0x1a8a40, 'bicycle');
    this.genTwoWheeler('vehicle_moped', 0xf1c40f, 0xb8960a, 'moped');
    this.genTwoWheeler('vehicle_motorcycle', 0x9b59b6, 0x6a3a88, 'motorcycle');
  }

  private genTwoWheeler(
    key: string,
    bodyColor: number,
    darkColor: number,
    variant: 'bicycle' | 'moped' | 'motorcycle'
  ): void {
    const w = variant === 'motorcycle' ? 30 : 26;
    const h = variant === 'bicycle' ? 12 : 14;
    this.makeTexture(key, w, h, (g) => {
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(w / 2, h - 1, w - 8, 4);
      // wheels
      g.fillStyle(0x151520, 1);
      g.fillCircle(5, h / 2, 4);
      g.fillCircle(w - 5, h / 2, 4);
      g.fillStyle(0x444455, 1);
      g.fillCircle(5, h / 2, 2);
      g.fillCircle(w - 5, h / 2, 2);
      // frame / body
      g.fillStyle(bodyColor, 1);
      if (variant === 'bicycle') {
        g.fillRect(6, h / 2 - 1, w - 12, 2);
        g.fillStyle(darkColor, 1);
        g.fillRect(w / 2 - 1, 2, 2, h / 2);
        g.fillRect(w - 10, 2, 6, 2);
      } else {
        g.fillRoundedRect(7, 3, w - 14, h - 6, 3);
        g.fillStyle(darkColor, 1);
        g.fillRect(w - 10, h / 2 - 3, 5, 6);
        g.fillStyle(0xffee88, 0.9);
        g.fillCircle(w - 3, h / 2, 1.5);
        if (variant === 'motorcycle') {
          g.fillStyle(0x222233, 1);
          g.fillRect(10, 2, 8, 3);
        }
      }
    });
  }

  /** Вид сверху, нос машины смотрит вправо (угол 0°). */
  private genCarTopDown(
    key: string,
    bodyColor: number,
    darkColor: number,
    variant: 'sedan' | 'sports' | 'truck' | 'police' | 'van'
  ): void {
    const w = variant === 'truck' || variant === 'van' ? 40 : variant === 'sports' ? 34 : 36;
    const h = variant === 'truck' || variant === 'van' ? 22 : variant === 'sports' ? 18 : 20;

    this.makeTexture(key, w, h, (g) => {
      const cx = h / 2;
      const drawWheel = (wx: number, wy: number) => {
        g.fillStyle(0x151520, 1);
        g.fillCircle(wx, wy, 3.5);
        g.fillStyle(0x333344, 1);
        g.fillCircle(wx, wy, 2);
      };

      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(w / 2, h - 1, w - 6, 5);

      if (variant === 'truck' || variant === 'van') {
        g.fillStyle(darkColor, 1);
        g.fillRoundedRect(4, 4, 14, h - 8, 2);
        g.fillStyle(bodyColor, 1);
        g.fillRoundedRect(16, 5, w - 20, h - 10, 2);
        g.fillStyle(0x88bbee, 0.85);
        g.fillRect(w - 10, cx - 3, 6, 6);
        g.fillStyle(0xffee88, 0.9);
        g.fillCircle(w - 3, 5, 2);
        g.fillCircle(w - 3, h - 5, 2);
        g.fillStyle(0xff3333, 0.9);
        g.fillCircle(5, 5, 2);
        g.fillCircle(5, h - 5, 2);
        drawWheel(12, 3);
        drawWheel(12, h - 3);
        drawWheel(w - 10, 3);
        drawWheel(w - 10, h - 3);
      } else if (variant === 'sports') {
        g.fillStyle(bodyColor, 1);
        g.fillRoundedRect(6, 4, w - 12, h - 8, 4);
        g.fillStyle(darkColor, 1);
        g.fillTriangle(6, 4, 6, h - 4, 2, cx);
        g.fillStyle(0x66aaee, 0.9);
        g.fillRect(w - 12, cx - 4, 7, 8);
        g.fillStyle(0x222233, 0.6);
        g.fillRect(10, cx - 2, 8, 4);
        g.fillStyle(darkColor, 1);
        g.fillRect(5, cx - 1, 4, 2);
        g.fillStyle(0xffffaa, 1);
        g.fillCircle(w - 2, 5, 2);
        g.fillCircle(w - 2, h - 5, 2);
        g.fillStyle(0xff2222, 1);
        g.fillCircle(3, 5, 1.5);
        g.fillCircle(3, h - 5, 1.5);
        drawWheel(11, 2);
        drawWheel(11, h - 2);
        drawWheel(w - 11, 2);
        drawWheel(w - 11, h - 2);
      } else {
        const paint = variant === 'police' ? 0xf5f5f5 : bodyColor;
        const accent = variant === 'police' ? 0x2a2a40 : darkColor;
        g.fillStyle(paint, 1);
        g.fillRoundedRect(8, 3, w - 16, h - 6, 3);
        g.fillStyle(accent, 0.5);
        g.fillRect(8, cx - 1, w - 16, 2);
        g.fillStyle(0x77bbee, 0.9);
        g.fillRect(w - 13, cx - 4, 8, 8);
        g.fillStyle(0x5588bb, 0.7);
        g.fillRect(10, cx - 3, 7, 6);
        g.fillStyle(0xffffcc, 1);
        g.fillCircle(w - 2, 4, 2);
        g.fillCircle(w - 2, h - 4, 2);
        g.fillStyle(0xff3333, 1);
        g.fillCircle(3, 4, 1.5);
        g.fillCircle(3, h - 4, 1.5);
        if (variant === 'police') {
          g.fillStyle(0xff0000, 1);
          g.fillRect(cx - 5, 2, 5, 3);
          g.fillStyle(0x0000ff, 1);
          g.fillRect(cx, 2, 5, 3);
        }
        drawWheel(12, 2);
        drawWheel(12, h - 2);
        drawWheel(w - 12, 2);
        drawWheel(w - 12, h - 2);
      }
    });
  }

  private genObjects(): void {
    if (this.shouldGen('payphone')) this.makeTexture('payphone', 16, 24, (g) => {
      g.fillStyle(0x333344, 1);
      g.fillRect(4, 0, 8, 24);
      g.fillStyle(0x00bfff, 1);
      g.fillRect(5, 2, 6, 10);
      g.fillStyle(0x222233, 1);
      g.fillRect(6, 14, 4, 6);
      g.fillStyle(0xc8f542, 1);
      g.fillCircle(8, 22, 2);
    });

    if (this.shouldGen('package')) this.makeTexture('package', 14, 14, (g) => {
      g.fillStyle(0xcc8844, 1);
      g.fillRect(1, 1, 12, 12);
      g.lineStyle(2, 0xff69b4, 1);
      g.lineBetween(1, 1, 13, 13);
      g.lineBetween(13, 1, 1, 13);
    });

    if (this.shouldGen('flag')) this.makeTexture('flag', 12, 20, (g) => {
      g.fillStyle(0x888888, 1);
      g.fillRect(1, 0, 2, 20);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(3, 2, 11, 6, 3, 10);
    });

    if (this.shouldGen('blockpost')) this.makeTexture('blockpost', 48, 24, (g) => {
      g.fillStyle(0xffd600, 1);
      g.fillRect(0, 8, 48, 6);
      g.fillStyle(0x303040, 1);
      g.fillRect(4, 4, 6, 16);
      g.fillRect(38, 4, 6, 16);
      g.fillStyle(0xff2d55, 1);
      g.fillRect(14, 2, 20, 10);
      g.fillStyle(0xffffff, 1);
      g.fillRect(18, 4, 12, 2);
    });
  }

  private genLandmarks(): void {
    const kinds = [
      'tree',
      'fountain',
      'crane',
      'lab_dome',
      'torii',
      'clock_tower',
      'dock',
      'billboard',
      'skyline',
    ] as const;

    for (const kind of kinds) {
      const key = `lm_${kind}`;
      if (!this.shouldGen(key)) continue;
      this.makeTexture(key, 32, 32, (g) => this.drawLandmark(g, kind));
    }
  }

  private drawLandmark(g: Phaser.GameObjects.Graphics, kind: string): void {
    switch (kind) {
      case 'tree':
        g.fillStyle(0x5c3d2e, 1);
        g.fillRect(14, 20, 4, 12);
        g.fillStyle(0x2d6a4f, 1);
        g.fillCircle(16, 14, 10);
        g.fillStyle(0x40916c, 0.7);
        g.fillCircle(12, 12, 6);
        g.fillCircle(20, 12, 6);
        break;
      case 'fountain':
        g.fillStyle(0x6b7280, 1);
        g.fillCircle(16, 22, 10);
        g.fillStyle(0x4a90c8, 0.85);
        g.fillCircle(16, 20, 7);
        g.fillStyle(0x88ccff, 0.6);
        g.fillRect(15, 6, 2, 10);
        g.fillCircle(16, 6, 3);
        break;
      case 'crane':
        g.fillStyle(0xffd600, 1);
        g.fillRect(4, 28, 24, 3);
        g.fillStyle(0x606878, 1);
        g.fillRect(6, 10, 4, 20);
        g.fillRect(6, 10, 22, 3);
        g.fillRect(26, 10, 2, 14);
        g.lineStyle(1, 0x303040, 1);
        g.lineBetween(27, 24, 20, 30);
        break;
      case 'lab_dome':
        g.fillStyle(0x3a4a60, 1);
        g.fillRect(6, 18, 20, 14);
        g.fillStyle(0x88ccff, 0.5);
        g.fillCircle(16, 16, 11);
        g.fillStyle(0x00e676, 0.35);
        g.fillCircle(16, 16, 8);
        g.fillStyle(0xc8f542, 1);
        g.fillRect(14, 8, 4, 6);
        break;
      case 'torii':
        g.fillStyle(0x8b1a1a, 1);
        g.fillRect(4, 8, 4, 22);
        g.fillRect(24, 8, 4, 22);
        g.fillRect(4, 8, 24, 4);
        g.fillRect(6, 14, 20, 3);
        g.fillStyle(0x1a1a28, 1);
        g.fillRect(14, 18, 4, 12);
        break;
      case 'clock_tower':
        g.fillStyle(0x6b5344, 1);
        g.fillRect(10, 6, 12, 26);
        g.fillStyle(0xf0e6d2, 1);
        g.fillCircle(16, 14, 5);
        g.lineStyle(1, 0x303040, 1);
        g.lineBetween(16, 14, 16, 10);
        g.lineBetween(16, 14, 19, 14);
        g.fillStyle(0x4a3728, 1);
        g.fillTriangle(16, 2, 10, 8, 22, 8);
        break;
      case 'dock':
        g.fillStyle(0x4a6a8a, 0.7);
        g.fillRect(0, 22, 32, 10);
        g.fillStyle(0x6b5344, 1);
        g.fillRect(2, 14, 28, 4);
        g.fillRect(4, 10, 3, 8);
        g.fillRect(12, 10, 3, 8);
        g.fillRect(20, 10, 3, 8);
        g.fillStyle(0xffd600, 1);
        g.fillCircle(28, 12, 2);
        break;
      case 'billboard':
        g.fillStyle(0x505060, 1);
        g.fillRect(14, 16, 4, 16);
        g.fillStyle(0x2a2a40, 1);
        g.fillRect(2, 4, 28, 14);
        g.fillStyle(0xff2d55, 1);
        g.fillRect(4, 6, 24, 10);
        g.fillStyle(0xffffff, 1);
        g.fillRect(8, 9, 16, 2);
        g.fillRect(8, 13, 10, 2);
        break;
      case 'skyline':
        g.fillStyle(0x252538, 1);
        g.fillRect(2, 12, 8, 20);
        g.fillRect(12, 6, 8, 26);
        g.fillRect(22, 10, 8, 22);
        g.fillStyle(0xffee88, 0.8);
        g.fillRect(14, 10, 3, 3);
        g.fillRect(15, 18, 2, 2);
        g.fillRect(24, 14, 2, 2);
        g.fillStyle(0x00b4ff, 0.5);
        g.fillRect(4, 16, 2, 4);
        break;
    }
  }

  private genShops(): void {
    if (this.shouldGen('shop_weapon')) this.makeTexture('shop_weapon', 24, 24, (g) => {
      g.fillStyle(0x331111, 1);
      g.fillRect(0, 0, 24, 24);
      g.fillStyle(0xff4444, 1);
      g.fillRect(4, 8, 16, 4);
      g.fillRect(10, 4, 4, 16);
      g.fillStyle(0xffd600, 1);
      g.fillCircle(12, 12, 3);
    });

    if (this.shouldGen('shop_vehicle')) this.makeTexture('shop_vehicle', 24, 24, (g) => {
      g.fillStyle(0x113311, 1);
      g.fillRect(0, 0, 24, 24);
      g.fillStyle(0x44ff44, 1);
      g.fillRect(3, 8, 18, 8);
      g.fillStyle(0x88ccff, 0.8);
      g.fillRect(6, 9, 6, 4);
      g.fillStyle(0x222233, 1);
      g.fillCircle(7, 17, 2);
      g.fillCircle(17, 17, 2);
    });

    if (this.shouldGen('shop_hospital')) this.makeTexture('shop_hospital', 24, 24, (g) => {
      g.fillStyle(0x113333, 1);
      g.fillRect(0, 0, 24, 24);
      g.fillStyle(0xffffff, 1);
      g.fillRect(8, 4, 8, 16);
      g.fillRect(4, 8, 16, 8);
      g.fillStyle(0xff2d55, 1);
      g.fillRect(9, 9, 6, 6);
    });

    if (this.shouldGen('shop_grocery')) this.makeTexture('shop_grocery', 24, 24, (g) => {
      g.fillStyle(0x1a3320, 1);
      g.fillRect(0, 0, 24, 24);
      g.fillStyle(0x7ee787, 1);
      g.fillCircle(8, 10, 4);
      g.fillCircle(16, 10, 4);
      g.fillStyle(0xffd600, 1);
      g.fillRect(6, 16, 12, 4);
    });

    if (this.shouldGen('shop_furniture')) this.makeTexture('shop_furniture', 24, 24, (g) => {
      g.fillStyle(0x332a1a, 1);
      g.fillRect(0, 0, 24, 24);
      g.fillStyle(0xb8860b, 1);
      g.fillRect(4, 12, 16, 4);
      g.fillRect(5, 16, 3, 6);
      g.fillRect(16, 16, 3, 6);
      g.fillStyle(0x9b59b6, 1);
      g.fillRect(4, 6, 10, 5);
    });
  }

  private genBullet(): void {
    if (!this.shouldGen('bullet')) return;
    this.makeTexture('bullet', 10, 4, (g) => {
      g.fillStyle(0xffff66, 0.5);
      g.fillRect(0, 0, 8, 4);
      g.fillStyle(0xffff00, 1);
      g.fillRect(1, 1, 5, 2);
      g.fillStyle(0xff8800, 1);
      g.fillRect(6, 1, 3, 2);
    });
  }

  private makeTile(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
    this.makeTexture(key, w, h, draw);
  }

  private makeTexture(
    key: string,
    w: number,
    h: number,
    draw: (g: Phaser.GameObjects.Graphics) => void
  ): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}