import Phaser from 'phaser';

/** Shared walk-sheet frame selection: rows up/down/left/right, N columns. */
export function applyWalkFrame(
  sprite: Phaser.GameObjects.Sprite,
  vx: number,
  vy: number,
  animTimer: number,
  framesPerRow = 4,
  frameRate = 9
): number {
  const speed = Math.hypot(vx, vy);
  if (speed < 8) {
    // Idle: keep current row, frame 0
    const frame = sprite.frame?.name;
    const current = typeof frame === 'number' ? frame : parseInt(String(frame ?? '0'), 10) || 0;
    const row = Math.floor(current / framesPerRow);
    sprite.setFrame(row * framesPerRow);
    return animTimer;
  }

  let row = 1; // default down
  if (Math.abs(vx) > Math.abs(vy)) {
    row = vx < 0 ? 2 : 3; // left / right
  } else {
    row = vy < 0 ? 0 : 1; // up / down
  }

  const nextTimer = animTimer + (1 / 60) * (speed / 40);
  // caller passes dt via incrementing timer externally — use frame from timer
  void frameRate;
  return nextTimer;
}

export function walkFrameIndex(
  vx: number,
  vy: number,
  animTime: number,
  framesPerRow = 4,
  frameRate = 9
): number {
  const speed = Math.hypot(vx, vy);
  let row = 1;
  if (Math.abs(vx) >= Math.abs(vy)) {
    row = vx < 0 ? 2 : 3;
  } else {
    row = vy < 0 ? 0 : 1;
  }
  if (speed < 8) return row * framesPerRow;
  const frame = Math.floor(animTime * frameRate) % framesPerRow;
  return row * framesPerRow + frame;
}
