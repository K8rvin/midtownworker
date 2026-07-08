import Phaser from 'phaser';
import { COLORS } from '../config';

export class SpriteGenerator {
  private skip = new Set<string>();

  constructor(private scene: Phaser.Scene) {}

  generateAll(skip: ReadonlySet<string> = new Set()): void {
    this.skip = new Set(skip);
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
    if (this.shouldGen('tile_grass')) this.makeTile('tile_grass', 32, 32, (g) => {
      g.fillStyle(COLORS.grass, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x254d3a, 0.5);
      for (let i = 0; i < 8; i++) {
        g.fillRect(Phaser.Math.Between(0, 28), Phaser.Math.Between(0, 28), 2, 2);
      }
    });

    if (this.shouldGen('tile_road')) this.makeTile('tile_road', 32, 32, (g) => {
      g.fillStyle(0x222236, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(COLORS.road, 1);
      g.fillRect(1, 1, 30, 30);
      g.fillStyle(COLORS.roadLine, 0.55);
      g.fillRect(14, 0, 4, 32);
      g.fillStyle(0xd4c878, 0.35);
      for (let y = 4; y < 32; y += 10) g.fillRect(15, y, 2, 5);
      g.fillStyle(0x555577, 0.35);
      g.fillRect(0, 0, 32, 2);
      g.fillRect(0, 30, 32, 2);
    });

    if (this.shouldGen('tile_sidewalk')) this.makeTile('tile_sidewalk', 32, 32, (g) => {
      g.fillStyle(COLORS.sidewalk, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x4a4a60, 0.5);
      g.fillRect(0, 0, 32, 1);
      g.fillRect(0, 15, 32, 1);
      g.fillRect(0, 31, 32, 1);
    });

    if (this.shouldGen('tile_building')) this.makeTile('tile_building', 32, 32, (g) => {
      g.fillStyle(0x252538, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(COLORS.building, 1);
      g.fillRect(2, 4, 28, 28);
      g.fillStyle(0x2a2a40, 1);
      g.fillRect(0, 0, 32, 4);
      const neon = [0xff2d55, 0x00e676, 0x00b4ff, 0xffd600];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const lit = (row + col) % 2 === 0;
          g.fillStyle(lit ? 0xffee88 : 0x1a1a28, lit ? 0.85 : 1);
          g.fillRect(4 + col * 9, 8 + row * 7, 6, 5);
          if (lit && col === 1 && row === 0) {
            g.fillStyle(neon[row], 0.5);
            g.fillRect(3, 6, 26, 2);
          }
        }
      }
      g.fillStyle(0x1a1a28, 1);
      g.fillRect(12, 24, 8, 8);
    });

    if (this.shouldGen('tile_roof')) this.makeTile('tile_roof', 32, 32, (g) => {
      g.fillStyle(COLORS.buildingRoof, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x3a3a55, 0.6);
      g.lineStyle(1, 0x3a3a55, 0.8);
      for (let i = 0; i < 32; i += 8) {
        g.lineBetween(i, 0, i, 32);
        g.lineBetween(0, i, 32, i);
      }
      g.fillStyle(0x666688, 1);
      g.fillRect(4, 4, 6, 10);
      g.fillRect(22, 4, 6, 10);
    });

    if (this.shouldGen('tile_stairs')) this.makeTile('tile_stairs', 32, 32, (g) => {
      g.fillStyle(0x5a5a7a, 1);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x7a7a9a, 1);
      for (let i = 0; i < 5; i++) {
        g.fillRect(2, 2 + i * 6, 28, 4);
      }
      g.fillStyle(0xc8f542, 1);
      g.fillTriangle(16, 8, 10, 20, 22, 20);
    });
  }

  /** Combined spritesheet for Phaser Tilemap (6 terrain + 3 zone markers). */
  private genCityTileset(): void {
    if (!this.shouldGen('city_tileset')) return;
    const terrain = [
      'tile_grass',
      'tile_road',
      'tile_sidewalk',
      'tile_building',
      'tile_roof',
      'tile_stairs',
    ];
    const canvas = document.createElement('canvas');
    canvas.width = 288;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let i = 0; i < terrain.length; i++) {
      if (!this.scene.textures.exists(terrain[i])) continue;
      const src = this.scene.textures.get(terrain[i]).getSourceImage() as HTMLCanvasElement;
      ctx.drawImage(src, 0, 0, 32, 32, i * 32, 0, 32, 32);
    }

    const zoneColors = [COLORS.yakuza, COLORS.rednecks, COLORS.scientists];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `#${zoneColors[i].toString(16).padStart(6, '0')}`;
      ctx.globalAlpha = 0.35;
      ctx.fillRect((6 + i) * 32, 0, 32, 32);
      ctx.globalAlpha = 1;
    }

    if (this.scene.textures.exists('city_tileset')) {
      this.scene.textures.remove('city_tileset');
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
    for (const t of types) {
      if (!this.shouldGen(t.key)) continue;
      this.makeTexture(t.key, 24, 28, (g) => {
        this.drawNpcStanding(g, t.body, t.accent ?? 0x2a3a5c, !!t.police, !!t.target);
      });
    }
  }

  /** NPC смотрит вниз (к камере), статичная поза. */
  private drawNpcStanding(
    g: Phaser.GameObjects.Graphics,
    bodyColor: number,
    pantsColor: number,
    police: boolean,
    target: boolean
  ): void {
    const cx = 12;
    const cy = 13;

    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(cx, 23, 9, 4);

    const foot = (x: number) => {
      g.lineStyle(2, pantsColor, 1);
      g.lineBetween(cx, cy + 4, x, 21);
      g.fillStyle(0x1a1a28, 1);
      g.fillCircle(x, 21, 2.2);
    };
    foot(cx - 4);
    foot(cx + 4);

    g.lineStyle(2, bodyColor, 1);
    g.lineBetween(cx - 5, cy, cx - 7, cy + 5);
    g.lineBetween(cx + 5, cy, cx + 7, cy + 5);
    g.fillStyle(0xffcc99, 1);
    g.fillCircle(cx - 7, cy + 5, 1.6);
    g.fillCircle(cx + 7, cy + 5, 1.6);

    g.fillStyle(pantsColor, 1);
    g.fillRoundedRect(cx - 4, cy + 1, 8, 5, 2);
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(cx - 5, cy - 4, 10, 10, 3);
    if (police) {
      g.fillStyle(0x1a1a28, 1);
      g.fillRect(cx - 4, cy - 3, 8, 2);
      g.fillStyle(0x303040, 1);
      g.fillRect(cx - 1, cy - 1, 2, 6);
    }

    g.fillStyle(0xffcc99, 1);
    g.fillCircle(cx, cy - 8, 4);
    g.fillStyle(0x2a2a40, 1);
    g.fillRect(cx - 3, cy - 11, 5, 3);
    g.fillRect(cx - 1, cy - 8, 1.5, 1.5);
    g.fillRect(cx + 1, cy - 7, 1.5, 1.5);

    if (target) {
      g.lineStyle(2, 0xff2d55, 0.9);
      g.strokeCircle(cx, cy + 2, 11);
      g.fillStyle(0xff2d55, 0.25);
      g.fillCircle(cx, cy + 2, 11);
    }
  }

  private genVehicles(): void {
    if (this.shouldGen('vehicle_sedan')) this.genCarTopDown('vehicle_sedan', 0x3a7cc9, 0x2a5a96, 'sedan');
    if (this.shouldGen('vehicle_sports')) this.genCarTopDown('vehicle_sports', 0xe04030, 0xa02018, 'sports');
    if (this.shouldGen('vehicle_truck')) this.genCarTopDown('vehicle_truck', 0x9a7a50, 0x6a5030, 'truck');
    if (this.shouldGen('vehicle_police')) this.genCarTopDown('vehicle_police', 0xf0f0f0, 0x303040, 'police');
  }

  /** Вид сверху, нос машины смотрит вправо (угол 0°). */
  private genCarTopDown(
    key: string,
    bodyColor: number,
    darkColor: number,
    variant: 'sedan' | 'sports' | 'truck' | 'police'
  ): void {
    const w = variant === 'truck' ? 40 : variant === 'sports' ? 34 : 36;
    const h = variant === 'truck' ? 22 : variant === 'sports' ? 18 : 20;

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

      if (variant === 'truck') {
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