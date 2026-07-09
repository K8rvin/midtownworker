import Phaser from 'phaser';
import { ControlSettings, type ControlSettingsData } from './ControlSettings';
import type { MobileControls } from '../ui/MobileControls';

export class InputManager {
  private settings: ControlSettingsData = ControlSettings.load();
  private mobile: MobileControls | null = null;
  private keys: Partial<Record<string, Phaser.Input.Keyboard.Key>> = {};

  constructor(scene: Phaser.Scene, mobile?: MobileControls | null) {
    this.mobile = mobile ?? null;
    if (scene.input.keyboard) {
      this.bindKeys(scene);
    }
  }

  refreshBindings(scene: Phaser.Scene): void {
    this.settings = ControlSettings.load();
    if (scene.input.keyboard) {
      this.bindKeys(scene);
    }
  }

  getMovementVector(): { x: number; y: number } {
    const mobile = this.mobile?.getMovementVector();
    if (mobile && (mobile.x !== 0 || mobile.y !== 0)) {
      return mobile;
    }

    let x = 0;
    let y = 0;
    if (this.isDown('A') || this.isDown('LEFT')) x -= 1;
    if (this.isDown('D') || this.isDown('RIGHT')) x += 1;
    if (this.isDown('W') || this.isDown('UP')) y -= 1;
    if (this.isDown('S') || this.isDown('DOWN')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  isSprinting(): boolean {
    return this.mobile?.isSprinting() || this.isDown(this.settings.keys.sprint);
  }

  justPressed(key: string): boolean {
    const bound = this.keys[key];
    if (bound && Phaser.Input.Keyboard.JustDown(bound)) return true;
    return false;
  }

  justPressedInteract(): boolean {
    return this.justPressed(this.settings.keys.interact) || (this.mobile?.consumeInteract() ?? false);
  }

  justPressedQuestLog(): boolean {
    return this.justPressed(this.settings.keys.questLog);
  }

  justPressedMap(): boolean {
    return this.justPressed(this.settings.keys.map);
  }

  consumeShoot(): boolean {
    return this.mobile?.consumeShoot() ?? false;
  }

  getSteerInput(): number {
    let steer = 0;
    if (this.isDown('A') || this.isDown('LEFT')) steer -= 1;
    if (this.isDown('D') || this.isDown('RIGHT')) steer += 1;
    return Phaser.Math.Clamp(steer * this.settings.steerSensitivity, -1, 1);
  }

  /**
   * Throttle for vehicles. Positive = gas, negative = brake/reverse.
   * VehiclePhysics maps negative while moving forward to brake, reverse when slow.
   */
  getThrottleInput(): number {
    let throttle = 0;
    if (this.isDown('W') || this.isDown('UP')) throttle += 1;
    if (this.isDown('S') || this.isDown('DOWN')) throttle -= 1;

    const mobile = this.mobile?.getMovementVector();
    if (mobile && (mobile.x !== 0 || mobile.y !== 0)) {
      const angle = Math.atan2(mobile.y, mobile.x);
      throttle = Math.cos(angle) * this.settings.moveSensitivity;
    }
    return Phaser.Math.Clamp(throttle, -1, 1);
  }

  getSettings(): ControlSettingsData {
    return { ...this.settings };
  }

  private bindKeys(scene: Phaser.Scene): void {
    const kb = scene.input.keyboard!;
    this.keys = {};
    const codes = new Set([
      'W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT',
      'ESC', 'F5', 'F9', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'Q', 'P',
      ...Object.values(this.settings.keys),
    ]);
    for (const code of codes) {
      this.keys[code] = kb.addKey(code);
    }
  }

  private isDown(code: string): boolean {
    return this.keys[code]?.isDown ?? false;
  }
}