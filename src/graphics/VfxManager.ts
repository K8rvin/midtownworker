import Phaser from 'phaser';

/** Lightweight VFX with simple pooling to avoid GC spikes. */
export class VfxManager {
  private pool: Phaser.GameObjects.Arc[] = [];
  private activeCount = 0;
  private readonly maxActive = 80;

  constructor(private scene: Phaser.Scene) {}

  private takeCircle(x: number, y: number, r: number, color: number, alpha: number): Phaser.GameObjects.Arc | null {
    if (this.activeCount >= this.maxActive) return null;
    let p = this.pool.pop();
    if (!p) {
      p = this.scene.add.circle(x, y, r, color, alpha);
    } else {
      p.setPosition(x, y).setRadius(r).setFillStyle(color, alpha).setVisible(true).setActive(true);
      p.setScale(1).setAlpha(alpha);
    }
    p.setDepth(8);
    this.activeCount++;
    return p;
  }

  private release(p: Phaser.GameObjects.Arc): void {
    p.setVisible(false).setActive(false);
    this.pool.push(p);
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  explosion(x: number, y: number, scale = 1): void {
    const colors = [0xff4400, 0xff8800, 0xffcc00, 0xffffff, 0xff2200];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.1, 0.1);
      const dist = Phaser.Math.Between(10, 36) * scale;
      const particle = this.takeCircle(
        x,
        y,
        Phaser.Math.Between(2, 6) * scale,
        Phaser.Utils.Array.GetRandom(colors),
        0.95
      );
      if (!particle) break;
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.15,
        duration: Phaser.Math.Between(320, 580),
        ease: 'Cubic.easeOut',
        onComplete: () => this.release(particle),
      });
    }

    const flash = this.takeCircle(x, y, 10 * scale, 0xffeeaa, 0.8);
    if (flash) {
      this.scene.tweens.add({
        targets: flash,
        scale: 4 * scale,
        alpha: 0,
        duration: 220,
        onComplete: () => this.release(flash),
      });
    }

    const ring = this.scene.add.circle(x, y, 8 * scale, 0xff6600, 0.55);
    ring.setDepth(7);
    this.scene.tweens.add({
      targets: ring,
      scale: 3.2 * scale,
      alpha: 0,
      duration: 420,
      onComplete: () => ring.destroy(),
    });

    this.cameraShake(0.008 * scale);
  }

  muzzleFlash(x: number, y: number, angleDeg: number): void {
    const rad = Phaser.Math.DegToRad(angleDeg);
    const flash = this.takeCircle(x, y, 6, 0xffffaa, 0.95);
    if (flash) {
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 0.3,
        duration: 80,
        onComplete: () => this.release(flash),
      });
    }
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
    this.scene.time.delayedCall(60, () => trail.destroy());
  }

  hitSpark(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const spark = this.scene.add.rectangle(x, y, 3, 1, i % 2 === 0 ? 0xffffff : 0xff4444, 1);
      spark.setDepth(6);
      spark.setAngle(Phaser.Math.Between(0, 360));
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * 14,
        y: y + Math.sin(a) * 14,
        alpha: 0,
        duration: 160,
        onComplete: () => spark.destroy(),
      });
    }
  }

  footDust(x: number, y: number): void {
    const puff = this.takeCircle(x, y, 3, 0xc8c0a8, 0.5);
    if (!puff) return;
    puff.setDepth(2);
    this.scene.tweens.add({
      targets: puff,
      scale: 1.8,
      alpha: 0,
      y: y - 4,
      duration: 220,
      onComplete: () => this.release(puff),
    });
  }

  tireSmoke(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      const puff = this.takeCircle(
        x + Phaser.Math.Between(-3, 3),
        y + Phaser.Math.Between(-3, 3),
        4 + i,
        0x888899,
        0.32
      );
      if (!puff) return;
      puff.setDepth(1);
      this.scene.tweens.add({
        targets: puff,
        scale: 2.8,
        alpha: 0,
        y: y - 6 - i * 2,
        duration: 550 + i * 80,
        onComplete: () => this.release(puff),
      });
    }
  }

  cameraShake(intensity = 0.004): void {
    this.scene.cameras.main.shake(120, intensity);
  }
}
