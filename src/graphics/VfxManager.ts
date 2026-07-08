import Phaser from 'phaser';

export class VfxManager {
  constructor(private scene: Phaser.Scene) {}

  explosion(x: number, y: number, scale = 1): void {
    const colors = [0xff4400, 0xff8800, 0xffcc00, 0xffffff];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = Phaser.Math.Between(8, 28) * scale;
      const particle = this.scene.add.circle(
        x,
        y,
        Phaser.Math.Between(2, 5) * scale,
        Phaser.Utils.Array.GetRandom(colors),
        0.9
      );
      particle.setDepth(8);
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(280, 520),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }

    const ring = this.scene.add.circle(x, y, 8 * scale, 0xff6600, 0.6);
    ring.setDepth(7);
    this.scene.tweens.add({
      targets: ring,
      scale: 3 * scale,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy(),
    });

    this.cameraShake(0.006 * scale);
  }

  muzzleFlash(x: number, y: number, angleDeg: number): void {
    const rad = Phaser.Math.DegToRad(angleDeg);
    const flash = this.scene.add.circle(x, y, 6, 0xffffaa, 0.95);
    flash.setDepth(6);
    const trail = this.scene.add.graphics();
    trail.setDepth(5);
    trail.fillStyle(0xffaa00, 0.7);
    trail.fillTriangle(
      x,
      y,
      x + Math.cos(rad - 0.4) * 14,
      y + Math.sin(rad - 0.4) * 14,
      x + Math.cos(rad + 0.4) * 14,
      y + Math.sin(rad + 0.4) * 14
    );

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.3,
      duration: 80,
      onComplete: () => flash.destroy(),
    });
    this.scene.time.delayedCall(60, () => trail.destroy());
  }

  hitSpark(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const spark = this.scene.add.rectangle(x, y, 3, 1, 0xff4444, 1);
      spark.setDepth(6);
      spark.setAngle(Phaser.Math.Between(0, 360));
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * 12,
        y: y + Math.sin(a) * 12,
        alpha: 0,
        duration: 150,
        onComplete: () => spark.destroy(),
      });
    }
  }

  footDust(x: number, y: number): void {
    const puff = this.scene.add.circle(x, y, 3, 0xc8c0a8, 0.5);
    puff.setDepth(2);
    this.scene.tweens.add({
      targets: puff,
      scale: 1.8,
      alpha: 0,
      y: y - 4,
      duration: 220,
      onComplete: () => puff.destroy(),
    });
  }

  tireSmoke(x: number, y: number): void {
    const puff = this.scene.add.circle(x, y, 4, 0x888899, 0.35);
    puff.setDepth(1);
    this.scene.tweens.add({
      targets: puff,
      scale: 2.5,
      alpha: 0,
      duration: 600,
      onComplete: () => puff.destroy(),
    });
  }

  cameraShake(intensity = 0.004): void {
    this.scene.cameras.main.shake(120, intensity);
  }
}