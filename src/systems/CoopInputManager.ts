import Phaser from 'phaser';

/** Player 2: стрелки, Enter — действие, Ctrl — огонь, + — спринт */
export class CoopInputManager {
  private keys: Partial<Record<string, Phaser.Input.Keyboard.Key>> = {};
  constructor(scene: Phaser.Scene) {
    if (!scene.input.keyboard) return;
    const kb = scene.input.keyboard;
    for (const code of [
      'UP',
      'DOWN',
      'LEFT',
      'RIGHT',
      'ENTER',
      'NUMPAD_ENTER',
      'NUMPAD_ADD',
      'CONTROL',
      'RCTRL',
    ]) {
      this.keys[code] = kb.addKey(code);
    }
  }

  getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown('LEFT')) x -= 1;
    if (this.isDown('RIGHT')) x += 1;
    if (this.isDown('UP')) y -= 1;
    if (this.isDown('DOWN')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  isSprinting(): boolean {
    return this.isDown('NUMPAD_ADD');
  }

  justPressedInteract(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.ENTER!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.NUMPAD_ENTER!)
    );
  }

  consumeShoot(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.CONTROL!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.RCTRL!)
    );
  }

  private isDown(code: string): boolean {
    return this.keys[code]?.isDown ?? false;
  }
}