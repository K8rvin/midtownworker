import Phaser from 'phaser';
import { Player } from './Player';

export class RemotePlayer {
  public sprite: Phaser.GameObjects.Sprite;
  public nameLabel: Phaser.GameObjects.Text;
  public mapId = 'city';
  public health = 100;
  private targetX = 0;
  private targetY = 0;
  private targetAngle = 0;

  constructor(scene: Phaser.Scene, name: string, x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
    this.sprite = scene.add.sprite(x, y, 'player2');
    this.sprite.setDepth(3);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setAngle(0);
    this.sprite.setFrame(Player.getIdleFrame(this.sprite.texture));
    this.nameLabel = scene.add
      .text(x, y - 22, name, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#00b4ff',
        backgroundColor: '#0d0d14',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(4);
  }

  setState(x: number, y: number, angle: number, health: number, mapId: string): void {
    this.targetX = x;
    this.targetY = y;
    this.targetAngle = angle;
    this.health = health;
    this.mapId = mapId;
  }

  update(dt: number, localMapId: string): void {
    const visible = this.mapId === localMapId;
    this.sprite.setVisible(visible);
    this.nameLabel.setVisible(visible);
    if (!visible) return;

    const t = Math.min(1, dt * 12);
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, t);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, t);
    this.sprite.setAngle(0);
    this.sprite.setFrame(Player.getIdleFrame(this.sprite.texture));
    this.nameLabel.setPosition(this.sprite.x, this.sprite.y - 22);
    this.sprite.setAlpha(this.health > 0 ? 1 : 0.35);
  }

  destroy(): void {
    this.sprite.destroy();
    this.nameLabel.destroy();
  }
}