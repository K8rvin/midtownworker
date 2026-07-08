import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getAudio } from '../systems/AudioManager';

export const MENU_COLORS = {
  void: 0x06060c,
  panel: 0x10101a,
  panelEdge: 0x1e1e2e,
  accent: 0xc8f542,
  hot: 0xff2d55,
  cool: 0x00e676,
  text: 0xc8f542,
  muted: 0x6b7280,
  neonBlue: 0x00b4ff,
};

export function createMenuBackdrop(scene: Phaser.Scene, alpha = 1): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0);

  const bg = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, MENU_COLORS.void, alpha);
  root.add(bg);

  const grid = scene.add.graphics();
  grid.lineStyle(1, MENU_COLORS.panelEdge, 0.18);
  for (let x = 0; x < GAME_WIDTH; x += 48) grid.lineBetween(x, 0, x, GAME_HEIGHT);
  for (let y = 0; y < GAME_HEIGHT; y += 48) grid.lineBetween(0, y, GAME_WIDTH, y);
  root.add(grid);

  const glow = scene.add.graphics();
  glow.fillStyle(MENU_COLORS.hot, 0.06);
  glow.fillCircle(GAME_WIDTH * 0.2, GAME_HEIGHT * 0.3, 180);
  glow.fillStyle(MENU_COLORS.neonBlue, 0.05);
  glow.fillCircle(GAME_WIDTH * 0.82, GAME_HEIGHT * 0.68, 220);
  root.add(glow);

  const scan = scene.add.graphics();
  scan.fillStyle(0x000000, 0.12);
  for (let y = 0; y < GAME_HEIGHT; y += 4) scan.fillRect(0, y, GAME_WIDTH, 1);
  root.add(scan);

  const frame = scene.add.graphics();
  frame.lineStyle(2, MENU_COLORS.accent, 0.35);
  frame.strokeRect(28, 28, GAME_WIDTH - 56, GAME_HEIGHT - 56);
  frame.lineStyle(1, MENU_COLORS.hot, 0.5);
  frame.strokeRect(34, 34, GAME_WIDTH - 68, GAME_HEIGHT - 68);
  root.add(frame);

  return root;
}

export function createMenuPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number
): Phaser.GameObjects.Container {
  const panel = scene.add.container(x, y);
  const shadow = scene.add.rectangle(4, 6, w, h, 0x000000, 0.35);
  const body = scene.add
    .rectangle(0, 0, w, h, MENU_COLORS.panel, 0.94)
    .setStrokeStyle(2, MENU_COLORS.accent, 0.45);
  const accent = scene.add.rectangle(-w / 2 + 3, 0, 4, h - 16, MENU_COLORS.hot, 0.85).setOrigin(0, 0.5);
  panel.add([shadow, body, accent]);
  return panel;
}

export function createMenuTitle(
  scene: Phaser.Scene,
  title: string,
  subtitle?: string,
  accentColor = '#c8f542',
  centerY = 130
): { title: Phaser.GameObjects.Text; subtitle?: Phaser.GameObjects.Text } {
  const titleText = scene.add
    .text(GAME_WIDTH / 2, subtitle ? centerY - 28 : centerY, title, {
      fontFamily: 'monospace',
      fontSize: subtitle ? '48px' : '58px',
      color: accentColor,
      stroke: '#0a0a12',
      strokeThickness: 6,
    })
    .setOrigin(0.5);

  if (!subtitle) return { title: titleText };

  const subtitleText = scene.add
    .text(GAME_WIDTH / 2, centerY + 22, subtitle, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ff6b6b',
      letterSpacing: 6,
    })
    .setOrigin(0.5);

  return { title: titleText, subtitle: subtitleText };
}

export function createMenuDivider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  depth = 2
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  g.lineStyle(1, MENU_COLORS.accent, 0.25);
  g.lineBetween(x - width / 2, y, x + width / 2, y);
  g.lineStyle(1, MENU_COLORS.hot, 0.45);
  g.lineBetween(x - width / 4, y + 2, x + width / 4, y + 2);
  return g;
}

export interface MenuScrollArea {
  content: Phaser.GameObjects.Container;
  destroy: () => void;
}

export function createMenuScrollArea(
  scene: Phaser.Scene,
  opts: {
    x: number;
    top: number;
    width: number;
    height: number;
    contentHeight: number;
    depth?: number;
  }
): MenuScrollArea {
  const { x, top, width, height, contentHeight, depth = 2 } = opts;
  const maxScroll = Math.max(0, contentHeight - height);
  let scroll = 0;

  const content = scene.add.container(x, top).setDepth(depth);

  const maskShape = scene.make.graphics({ x: 0, y: 0 });
  maskShape.fillStyle(0xffffff);
  maskShape.fillRect(x - width / 2, top, width, height);
  const mask = maskShape.createGeometryMask();
  content.setMask(mask);

  const scrollbar = scene.add.graphics().setDepth(depth + 1);
  const drawScrollbar = () => {
    scrollbar.clear();
    if (maxScroll <= 0) return;
    const trackH = height - 8;
    const thumbH = Math.max(28, (height / contentHeight) * trackH);
    const thumbY = top + 4 + (scroll / maxScroll) * (trackH - thumbH);
    scrollbar.fillStyle(MENU_COLORS.accent, 0.15);
    scrollbar.fillRect(x + width / 2 - 10, top + 4, 5, trackH);
    scrollbar.fillStyle(MENU_COLORS.accent, 0.65);
    scrollbar.fillRect(x + width / 2 - 10, thumbY, 5, thumbH);
  };

  const applyScroll = (delta: number) => {
    if (maxScroll <= 0) return;
    scroll = Phaser.Math.Clamp(scroll + delta, 0, maxScroll);
    content.y = top - scroll;
    drawScrollbar();
  };

  const wheelHandler = (
    pointer: Phaser.Input.Pointer,
    _over: Phaser.GameObjects.GameObject[],
    _dx: number,
    dy: number
  ) => {
    if (
      pointer.x < x - width / 2 ||
      pointer.x > x + width / 2 ||
      pointer.y < top ||
      pointer.y > top + height
    ) {
      return;
    }
    applyScroll(dy * 0.45);
  };

  scene.input.on('wheel', wheelHandler);
  drawScrollbar();

  if (maxScroll > 0) {
    scene.add
      .text(x, top + height + 6, 'колёсико мыши — прокрутка', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1);
  }

  return {
    content,
    destroy: () => {
      scene.input.off('wheel', wheelHandler);
      maskShape.destroy();
      scrollbar.destroy();
    },
  };
}

export function createMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 320,
  height = 46
): Phaser.GameObjects.Container {
  const btn = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, height, MENU_COLORS.panel, 0.95)
    .setStrokeStyle(1, MENU_COLORS.accent, 0.55)
    .setInteractive({ useHandCursor: true });

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: height < 44 ? '17px' : '20px',
      color: '#c8f542',
    })
    .setOrigin(0.5);

  const underline = scene.add.rectangle(0, 18, width - 40, 2, MENU_COLORS.hot, 0).setOrigin(0.5);

  btn.add([bg, text, underline]);

  bg.on('pointerover', () => {
    bg.setStrokeStyle(2, MENU_COLORS.hot, 1);
    text.setColor('#ff2d55');
    underline.setAlpha(0.8);
    btn.setScale(1.02);
  });
  bg.on('pointerout', () => {
    bg.setStrokeStyle(1, MENU_COLORS.accent, 0.55);
    text.setColor('#c8f542');
    underline.setAlpha(0);
    btn.setScale(1);
  });
  bg.on('pointerdown', () => {
    getAudio(scene).playSfx('ui');
    onClick();
  });

  return btn;
}

export function createStatLines(
  scene: Phaser.Scene,
  lines: string[],
  startY: number
): Phaser.GameObjects.Text[] {
  return lines.map((line, i) =>
    scene.add
      .text(GAME_WIDTH / 2, startY + i * 38, line, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
  );
}