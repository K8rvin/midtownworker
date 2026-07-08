import Phaser from 'phaser';
import type { GangId } from '../config';
import { PathFollower } from '../world/PathFollower';

export type NPCRole = 'civilian' | 'gang' | 'police' | 'target' | 'escort' | 'quest_giver' | 'shop_clerk';

export class NPC {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public hp: number;
  public maxHp: number;
  public gang: GangId | null;
  public role: NPCRole;
  public active = true;
  public isEscort = false;
  public hostile = false;
  public questGiverId?: string;
  public questGiverName?: string;
  public shopClerkId?: string;
  public shopClerkName?: string;
  public pathFollower = new PathFollower();
  private wanderTimer = 0;
  private wanderDir = { x: 0, y: 0 };
  private attackCooldown = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    gang: GangId | null,
    role: NPCRole = gang ? 'gang' : 'civilian'
  ) {
    this.gang = gang;
    this.role = role;
    this.maxHp =
      role === 'quest_giver' || role === 'shop_clerk'
        ? 9999
        : role === 'target'
          ? 80
          : role === 'police'
            ? 60
            : 40;
    this.hp = this.maxHp;

    const texture =
      role === 'police'
        ? 'npc_police'
        : role === 'target'
          ? 'npc_target'
          : gang === 'yakuza'
            ? 'npc_yakuza'
            : gang === 'rednecks'
              ? 'npc_rednecks'
              : gang === 'scientists'
                ? 'npc_scientists'
                : 'npc_civilian';

    this.sprite = scene.physics.add.sprite(x, y, texture);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDepth(3);
    this.sprite.setCollideWorldBounds(true);
    if (role === 'quest_giver' || role === 'shop_clerk') {
      this.sprite.setImmovable(true);
      this.sprite.setVelocity(0, 0);
    } else {
      this.pickWanderDir();
    }
  }

  update(dt: number, playerPos: { x: number; y: number }, chase = false): void {
    if (!this.active || !this.sprite.active || !this.sprite.body) return;
    if (this.role === 'quest_giver' || this.role === 'shop_clerk') {
      this.sprite.setVelocity(0, 0);
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (chase || this.hostile) {
      const speed = this.hostile ? 100 : 120;
      const angle = Phaser.Math.RadToDeg(
        Math.atan2(playerPos.y - this.sprite.y, playerPos.x - this.sprite.x)
      );
      const rad = Phaser.Math.DegToRad(angle);
      this.sprite.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
      return;
    }

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) this.pickWanderDir();

    this.sprite.setVelocity(this.wanderDir.x * 40, this.wanderDir.y * 40);
  }

  takeDamage(amount: number): boolean {
    if (this.role === 'quest_giver' || this.role === 'shop_clerk') return false;
    this.hp -= amount;
    this.sprite.setTint(0xff0000);
    this.sprite.scene.time.delayedCall(100, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  tryMeleeAttack(
    target: { x: number; y: number; takeDamage: (n: number) => void; inVehicle: boolean }
  ): void {
    if (!this.hostile || !this.active || target.inVehicle) return;
    if (this.attackCooldown > 0) return;
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.x, target.y);
    if (dist < 28) {
      target.takeDamage(8);
      this.attackCooldown = 1.2;
    }
  }

  die(): void {
    this.active = false;
    this.sprite.destroy();
  }

  private pickWanderDir(): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.wanderDir = { x: Math.cos(angle), y: Math.sin(angle) };
    this.wanderTimer = Phaser.Math.FloatBetween(1, 3);
  }
}