import Phaser from 'phaser';
import type { CoopPlayerData, GameState } from '../config';
import type { Vehicle } from './Vehicle';
import { Projectile } from './Projectile';
import weaponsData from '../data/weapons.json';

interface WeaponConfig {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  range: number;
  ammoType: string | null;
  magSize?: number;
  price: number;
}

export interface PlayerOptions {
  slot?: 1 | 2;
  textureKey?: string;
  coopData?: CoopPlayerData;
}

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public state: GameState;
  public slot: 1 | 2;
  public textureKey: string;
  public coopData?: CoopPlayerData;
  public onRoof = false;
  public inVehicle = false;
  public currentVehicle: Vehicle | null = null;
  public facingAngle = 0;
  private lastFireTime = 0;
  private footSpeed = 160;
  private sprintMultiplier = 1.6;
  private hidden = false;
  private animFrame = 0;
  private animTimer = 0;

  static readonly WALK_FRAMES = 6;
  static readonly WALK_ROW_V_UP = 0;
  static readonly WALK_ROW_V_DOWN = 1;
  static readonly WALK_ROW_H_LEFT = 2;
  static readonly WALK_ROW_H_RIGHT = 3;
  /** Legacy 4-direction spritesheet row where head faces top of screen. */
  static readonly LEGACY_UP_ROW = 3;
  static readonly LEGACY_WALK_FRAMES = 4;
  public roofZoneId: string | null = null;
  public insideShopId: string | null = null;
  public insideInteriorId: string | null = null;
  public insideEmploymentOfficeId: string | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, state: GameState, options: PlayerOptions = {}) {
    this.state = state;
    this.slot = options.slot ?? 1;
    this.textureKey = options.textureKey ?? (this.slot === 2 ? 'player2' : 'player');
    this.coopData = options.coopData;
    this.sprite = scene.physics.add.sprite(x, y, this.textureKey);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDepth(4);
    this.sprite.setCollideWorldBounds(true);
    if (this.slot === 2 && this.coopData) {
      this.onRoof = this.coopData.onRoof;
    } else {
      this.onRoof = state.onRoof;
    }
    this.updateDepth();
    this.applyFrame(Player.WALK_ROW_V_UP, 0);
  }

  getHealth(): number {
    return this.slot === 2 && this.coopData ? this.coopData.health : this.state.health;
  }

  getMaxHealth(): number {
    return this.slot === 2 && this.coopData ? this.coopData.maxHealth : this.state.maxHealth;
  }

  getLives(): number {
    return this.slot === 2 && this.coopData ? this.coopData.lives : this.state.lives;
  }

  setHealth(value: number): void {
    if (this.slot === 2 && this.coopData) this.coopData.health = value;
    else this.state.health = value;
  }

  setLives(value: number): void {
    if (this.slot === 2 && this.coopData) this.coopData.lives = value;
    else this.state.lives = value;
  }

  update(
    scene: Phaser.Scene,
    dt: number,
    move: { x: number; y: number },
    sprint: boolean,
    pointer?: Phaser.Input.Pointer,
    aimFromMovement = false
  ): void {
    if (this.inVehicle && this.currentVehicle) {
      this.syncToVehicle();
      return;
    }

    if (this.hidden) return;

    const speed = this.footSpeed * (sprint ? this.sprintMultiplier : 1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (body && body.enable === false) return;
    this.sprite.setVelocity(move.x * speed, move.y * speed);

    const moving = move.x !== 0 || move.y !== 0;
    if (aimFromMovement && moving) {
      this.facingAngle = Phaser.Math.RadToDeg(Math.atan2(move.y, move.x));
    } else if (pointer) {
      const worldPoint = pointer.positionToCamera(scene.cameras.main) as Phaser.Math.Vector2;
      this.facingAngle = Phaser.Math.RadToDeg(
        Math.atan2(worldPoint.y - this.sprite.y, worldPoint.x - this.sprite.x)
      );
    }

    if (moving) {
      const moveAngle = Phaser.Math.RadToDeg(Math.atan2(move.y, move.x));
      const interval = sprint ? 0.055 : 0.08;
      this.animTimer += dt;
      if (this.animTimer >= interval) {
        this.animTimer -= interval;
        this.animFrame = (this.animFrame + 1) % Player.WALK_FRAMES;
        if (this.animFrame % 2 === 0) {
          this.spawnFootDust(scene, moveAngle);
        }
      }
      this.applyFrame(this.pickWalkRow(move), this.animFrame);
    } else {
      this.applyFrame(Player.WALK_ROW_V_UP, 0);
      this.animTimer = 0;
      this.animFrame = 0;
    }

    this.syncPositionToState();
  }

  private syncPositionToState(): void {
    if (this.slot === 2 && this.coopData) {
      this.coopData.playerX = this.sprite.x;
      this.coopData.playerY = this.sprite.y;
      this.coopData.onRoof = this.onRoof;
    } else {
      this.state.playerX = this.sprite.x;
      this.state.playerY = this.sprite.y;
      this.state.onRoof = this.onRoof;
    }
  }

  private pickWalkRow(move: { x: number; y: number }): number {
    if (move.x === 0 && move.y === 0) return Player.WALK_ROW_V_UP;
    if (Math.abs(move.x) > Math.abs(move.y)) {
      return move.x < 0 ? Player.WALK_ROW_H_LEFT : Player.WALK_ROW_H_RIGHT;
    }
    return move.y < 0 ? Player.WALK_ROW_V_UP : Player.WALK_ROW_V_DOWN;
  }

  private applyFrame(walkRow: number, frame: number): void {
    if (this.sprite.texture.key !== this.textureKey) return;
    this.sprite.setAngle(0);
    this.sprite.setFlipX(false);
    this.sprite.setScale(1);
    this.sprite.setFrame(this.resolveWalkFrame(walkRow, frame));
  }

  private static sheetLayout(texture: Phaser.Textures.Texture): {
    rows: number;
    cols: number;
    faceUpWalk: boolean;
  } {
    const first = texture.get(0);
    const frameW = first?.width ?? 28;
    const frameH = first?.height ?? 28;
    const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const sheetH = source.height ?? frameH;
    const sheetW = source.width ?? frameW * Player.WALK_FRAMES;
    const rows = Math.max(1, Math.round(sheetH / frameH));
    const cols = Math.max(1, Math.round(sheetW / frameW));
    const faceUpWalk =
      cols === Player.WALK_FRAMES &&
      (rows === Player.WALK_ROW_H_RIGHT + 1 || rows === 3 || rows === 2);
    return { rows, cols, faceUpWalk };
  }

  static getIdleFrame(texture: Phaser.Textures.Texture): number {
    if (Player.sheetLayout(texture).faceUpWalk) return 0;
    return Player.LEGACY_UP_ROW * Player.LEGACY_WALK_FRAMES;
  }

  private resolveWalkFrame(walkRow: number, frame: number): number {
    const layout = Player.sheetLayout(this.sprite.texture);
    if (layout.faceUpWalk) {
      return walkRow * Player.WALK_FRAMES + frame;
    }
    return (
      Player.LEGACY_UP_ROW * layout.cols + (frame % layout.cols)
    );
  }

  private spawnFootDust(scene: Phaser.Scene, moveAngle: number): void {
    const rad = Phaser.Math.DegToRad(moveAngle);
    const side = this.animFrame % 4 < 2 ? -1 : 1;
    const footX = this.sprite.x + Math.cos(rad) * -6 + Math.cos(rad + Math.PI / 2) * side * 5;
    const footY = this.sprite.y + Math.sin(rad) * -6 + Math.sin(rad + Math.PI / 2) * side * 5;
    const vfx = scene.registry.get('vfx') as { footDust?: (x: number, y: number) => void } | undefined;
    vfx?.footDust?.(footX, footY);
  }

  enterVehicle(vehicle: Vehicle): void {
    this.inVehicle = true;
    this.currentVehicle = vehicle;
    vehicle.occupied = true;
    this.hidden = true;
    this.sprite.setVisible(false);
    this.sprite.setVelocity(0, 0);
    if (this.sprite.body) this.sprite.body.enable = false;
    if (this.slot === 1) {
      this.state.inVehicle = true;
      this.state.vehicleType = vehicle.getType();
    }
  }

  exitVehicle(): { x: number; y: number } {
    const vehicle = this.currentVehicle!;
    const rad = Phaser.Math.DegToRad(vehicle.state.angle);
    const exitX = vehicle.sprite.x + Math.cos(rad + Math.PI / 2) * 30;
    const exitY = vehicle.sprite.y + Math.sin(rad + Math.PI / 2) * 30;

    this.inVehicle = false;
    vehicle.occupied = false;
    this.currentVehicle = null;
    this.hidden = false;
    this.sprite.setVisible(true);
    if (this.sprite.body) {
      this.sprite.body.enable = true;
      this.sprite.setVelocity(0, 0);
    }
    this.sprite.setPosition(exitX, exitY);
    if (this.slot === 1) {
      this.state.inVehicle = false;
      this.state.vehicleType = null;
    }
    return { x: exitX, y: exitY };
  }

  tryShoot(scene: Phaser.Scene, angleOverride?: number, speedOverride?: number): Projectile | null {
    if (this.inVehicle) return null;
    const now = scene.time.now;
    const weapon = (weaponsData as WeaponConfig[]).find((w) => w.id === this.state.currentWeapon);
    if (!weapon) return null;
    if (now - this.lastFireTime < weapon.fireRate) return null;

    if (weapon.ammoType) {
      const ammo = this.state.ammo[weapon.ammoType] ?? 0;
      if (ammo <= 0) return null;
      this.state.ammo[weapon.ammoType] = ammo - 1;
    }

    this.lastFireTime = now;
    const angle = angleOverride ?? this.facingAngle;
    const rad = Phaser.Math.DegToRad(angle);
    const ox = this.sprite.x + Math.cos(rad) * 15;
    const oy = this.sprite.y + Math.sin(rad) * 15;
    const speed = speedOverride ?? (this.state.currentWeapon === 'sniper' ? 900 : 500);
    return new Projectile(scene, ox, oy, angle, speed, weapon.damage, weapon.range);
  }

  tryShootShotgun(scene: Phaser.Scene): Projectile[] {
    if (this.inVehicle) return [];
    const weapon = (weaponsData as WeaponConfig[]).find((w) => w.id === 'shotgun');
    if (!weapon?.ammoType) return [];
    const now = scene.time.now;
    if (now - this.lastFireTime < weapon.fireRate) return [];

    const ammo = this.state.ammo[weapon.ammoType] ?? 0;
    if (ammo <= 0) return [];
    this.state.ammo[weapon.ammoType] = ammo - 1;
    this.lastFireTime = now;

    const rad = Phaser.Math.DegToRad(this.facingAngle);
    const ox = this.sprite.x + Math.cos(rad) * 15;
    const oy = this.sprite.y + Math.sin(rad) * 15;
    const spread = [-18, -9, 0, 9, 18];
    return spread.map(
      (offset) => new Projectile(scene, ox, oy, this.facingAngle + offset, 420, 22, weapon.range)
    );
  }

  takeDamage(amount: number): void {
    this.setHealth(this.getHealth() - amount);
    const vfx = this.sprite.scene.registry.get('vfx') as { hitSpark?: (x: number, y: number) => void } | undefined;
    vfx?.hitSpark?.(this.sprite.x, this.sprite.y);
    this.sprite.setTint(0xff0000);
    this.sprite.scene.time.delayedCall(150, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
  }

  die(): boolean {
    this.setLives(this.getLives() - 1);
    if (this.getLives() <= 0) return true;
    this.setHealth(this.getMaxHealth());
    if (this.slot === 1) {
      this.state.wantedLevel = Math.max(0, this.state.wantedLevel - 1);
    }
    if (this.inVehicle) this.exitVehicle();
    const respawnX = this.slot === 2 && this.coopData ? this.coopData.playerX : this.state.playerX;
    const respawnY = this.slot === 2 && this.coopData ? this.coopData.playerY : this.state.playerY;
    this.sprite.setPosition(respawnX, respawnY);
    return false;
  }

  toggleRoof(onRoof: boolean, roofZoneId: string | null = null): void {
    this.onRoof = onRoof;
    this.roofZoneId = onRoof ? roofZoneId : null;
    this.updateDepth();
    if (this.slot === 2 && this.coopData) this.coopData.onRoof = onRoof;
    else this.state.onRoof = onRoof;
  }

  syncToVehicle(): void {
    if (!this.currentVehicle) return;
    this.sprite.setPosition(this.currentVehicle.sprite.x, this.currentVehicle.sprite.y);
    this.syncPositionToState();
  }

  stopMovement(): void {
    this.sprite.setVelocity(0, 0);
    if (this.currentVehicle) {
      this.currentVehicle.stopMovement();
    }
  }

  getPosition(): { x: number; y: number } {
    if (this.inVehicle && this.currentVehicle) {
      return { x: this.currentVehicle.sprite.x, y: this.currentVehicle.sprite.y };
    }
    return { x: this.sprite.x, y: this.sprite.y };
  }

  private updateDepth(): void {
    const base = this.slot === 2 ? 5 : 4;
    this.sprite.setDepth(this.onRoof ? base + 8 : base);
  }
}