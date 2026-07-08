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
  accentColor = '#c8f542'
): { title: Phaser.GameObjects.Text; subtitle?: Phaser.GameObjects.Text } {
  const titleText = scene.add
    .text(GAME_WIDTH / 2, subtitle ? 130 : 150, title, {
      fontFamily: 'monospace',
      fontSize: '58px',
      color: accentColor,
      stroke: '#0a0a12',
      strokeThickness: 6,
    })
    .setOrigin(0.5);

  if (!subtitle) return { title: titleText };

  const subtitleText = scene.add
    .text(GAME_WIDTH / 2, 200, subtitle, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ff2d55',
      letterSpacing: 8,
    })
    .setOrigin(0.5);

  return { title: titleText, subtitle: subtitleText };
}

export function createMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 320
): Phaser.GameObjects.Container {
  const btn = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, width, 46, MENU_COLORS.panel, 0.95)
    .setStrokeStyle(1, MENU_COLORS.accent, 0.55)
    .setInteractive({ useHandCursor: true });

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'monospace',
      fontSize: '20px',
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