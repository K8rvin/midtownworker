import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export class MobileControls {
  private container: Phaser.GameObjects.Container;
  private move = { x: 0, y: 0 };
  private sprintHeld = false;
  private interactJust = false;
  private shootJust = false;
  private activePointer: number | null = null;
  private readonly baseX = 110;
  private readonly baseY = GAME_HEIGHT - 110;
  private readonly radius = 54;
  private knob: Phaser.GameObjects.Arc;

  constructor(private scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(110);

    const base = scene.add.circle(this.baseX, this.baseY, this.radius, 0x10101a, 0.55);
    base.setStrokeStyle(2, 0xc8f542, 0.45);
    this.knob = scene.add.circle(this.baseX, this.baseY, 22, 0xc8f542, 0.35);
    this.knob.setStrokeStyle(2, 0xffffff, 0.5);

    this.container.add([base, this.knob]);
    this.createButton(GAME_WIDTH - 88, GAME_HEIGHT - 88, 'E', () => {
      this.interactJust = true;
    });
    this.createButton(GAME_WIDTH - 168, GAME_HEIGHT - 88, '●', () => {
      this.shootJust = true;
    });
    this.createButton(GAME_WIDTH - 88, GAME_HEIGHT - 168, '⇧', () => {
      this.sprintHeld = true;
      scene.time.delayedCall(120, () => {
        this.sprintHeld = false;
      });
    });

    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);
  }

  getMovementVector(): { x: number; y: number } {
    return { ...this.move };
  }

  isSprinting(): boolean {
    return this.sprintHeld;
  }

  consumeInteract(): boolean {
    if (!this.interactJust) return false;
    this.interactJust = false;
    return true;
  }

  consumeShoot(): boolean {
    if (!this.shootJust) return false;
    this.shootJust = false;
    return true;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.container.destroy();
  }

  private createButton(x: number, y: number, label: string, onTap: () => void): void {
    const bg = this.scene.add
      .circle(x, y, 30, 0x10101a, 0.75)
      .setStrokeStyle(2, 0xff2d55, 0.55)
      .setInteractive();
    const text = this.scene.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: label.length > 1 ? '14px' : '18px',
        color: '#c8f542',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      onTap();
    });
    this.container.add([bg, text]);
  }

  private inJoystickZone(pointer: Phaser.Input.Pointer): boolean {
    return pointer.x < GAME_WIDTH * 0.45 && pointer.y > GAME_HEIGHT * 0.45;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.inJoystickZone(pointer)) return;
    this.activePointer = pointer.id;
    this.updateJoystick(pointer);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.activePointer !== pointer.id) return;
    this.updateJoystick(pointer);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.activePointer !== pointer.id) return;
    this.activePointer = null;
    this.move = { x: 0, y: 0 };
    this.knob.setPosition(this.baseX, this.baseY);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, this.radius);
    const angle = Math.atan2(dy, dx);
    const kx = this.baseX + Math.cos(angle) * clamped;
    const ky = this.baseY + Math.sin(angle) * clamped;
    this.knob.setPosition(kx, ky);

    if (clamped < 8) {
      this.move = { x: 0, y: 0 };
      return;
    }
    this.move = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }
}