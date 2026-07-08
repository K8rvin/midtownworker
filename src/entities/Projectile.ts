import Phaser from 'phaser';

export class Projectile {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public damage: number;
  public active = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    range: number
  ) {
    this.damage = damage;
    this.sprite = scene.physics.add.sprite(x, y, 'bullet');
    this.sprite.setDepth(5);
    const rad = Phaser.Math.DegToRad(angle);
    this.sprite.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);

    scene.time.delayedCall((range / speed) * 1000, () => {
      if (this.active) this.destroy();
    });
  }

  destroy(): void {
    this.active = false;
    this.sprite.destroy();
  }
}