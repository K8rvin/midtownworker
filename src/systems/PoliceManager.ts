import Phaser from 'phaser';
import type { GameState } from '../config';
import { NPC } from '../entities/NPC';
import { Vehicle } from '../entities/Vehicle';
import type { Player } from '../entities/Player';
import { getAudio } from './AudioManager';
import { steerNPCAlongPath } from '../world/NPCSteering';
import type { NavigationGrid } from '../world/NavigationGrid';

export class PoliceManager {
  public policeNPCs: NPC[] = [];
  public policeVehicles: Vehicle[] = [];
  private spawnTimer = 0;
  private vehicleSpawnTimer = 0;
  private wantedDecayTimer = 0;
  private crimeCooldown = 0;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState
  ) {}

  update(dt: number, player: Player, navigation?: NavigationGrid): void {
    this.decayWanted(dt);
    this.spawnTimer -= dt;
    this.vehicleSpawnTimer -= dt;

    const ngScale = 1 + (this.state.ngPlusLevel ?? 0) * 0.35;

    if (this.state.wantedLevel > 0 && this.spawnTimer <= 0) {
      this.spawnPoliceNear(player.getPosition());
      this.spawnTimer = Math.max(1.2, (6 - this.state.wantedLevel) / ngScale);
    }

    const maxPoliceVehicles = this.state.ngPlusLevel > 0 ? 3 : 2;
    if (
      this.state.wantedLevel >= 3 &&
      this.vehicleSpawnTimer <= 0 &&
      this.policeVehicles.length < maxPoliceVehicles
    ) {
      this.spawnPoliceVehicle(player.getPosition());
      this.vehicleSpawnTimer = 12 / ngScale;
    }

    const chase = this.state.wantedLevel >= 1;
    const pos = player.getPosition();
    for (const cop of this.policeNPCs) {
      if (!cop.active) continue;
      if (chase) steerNPCAlongPath(cop, dt, pos, 110, navigation, (n, d, t, c) => n.update(d, t, c));
      else cop.update(dt, pos, false);
    }
    this.policeNPCs = this.policeNPCs.filter((c) => c.active);

    for (const pv of this.policeVehicles) {
      if (!pv.active || pv.occupied) continue;
      this.chaseWithVehicle(pv, player, dt);
    }
    this.policeVehicles = this.policeVehicles.filter((v) => v.active);
  }

  addWanted(amount: number): void {
    const prev = this.state.wantedLevel;
    this.state.wantedLevel = Phaser.Math.Clamp(this.state.wantedLevel + amount, 0, 5);
    this.wantedDecayTimer = 0;
    this.crimeCooldown = 6;
    if (prev < 2 && this.state.wantedLevel >= 2) {
      getAudio(this.scene).playSfx('alert');
    }
  }

  onPoliceKilled(): void {
    this.addWanted(2);
  }

  arrestPlayer(player: Player): boolean {
    this.state.stats.arrests++;
    this.state.wantedLevel = 0;
    this.state.money = Math.max(0, this.state.money - 200);
    const gameOver = player.die();
    return gameOver;
  }

  checkArrest(player: Player): boolean {
    if (this.state.wantedLevel < 2 || player.inVehicle) return false;
    const pos = player.getPosition();
    for (const cop of this.policeNPCs) {
      if (!cop.active) continue;
      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, cop.sprite.x, cop.sprite.y);
      if (dist < 25) return this.arrestPlayer(player);
    }
    for (const pv of this.policeVehicles) {
      if (!pv.active) continue;
      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, pv.sprite.x, pv.sprite.y);
      if (dist < 35) return this.arrestPlayer(player);
    }
    return false;
  }

  private spawnPoliceVehicle(pos: { x: number; y: number }): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = Phaser.Math.FloatBetween(280, 420);
    const x = pos.x + Math.cos(angle) * dist;
    const y = pos.y + Math.sin(angle) * dist;
    const vehicle = new Vehicle(this.scene, x, y, 'police', true);
    vehicle.state.angle = Phaser.Math.RadToDeg(angle) + 180;
    this.policeVehicles.push(vehicle);
    getAudio(this.scene).playSfx('siren');
  }

  private chaseWithVehicle(vehicle: Vehicle, player: Player, dt: number): void {
    const pos = player.getPosition();
    const targetAngle = Phaser.Math.RadToDeg(
      Math.atan2(pos.y - vehicle.sprite.y, pos.x - vehicle.sprite.x)
    );
    const diff = Phaser.Math.Angle.WrapDegrees(targetAngle - vehicle.state.angle);
    const steer = Phaser.Math.Clamp(diff / 35, -1, 1);
    const dist = Phaser.Math.Distance.Between(pos.x, pos.y, vehicle.sprite.x, vehicle.sprite.y);
    const throttle = dist > 60 ? 0.85 : 0.3;
    vehicle.updateDriving(throttle, steer, dt);
  }

  private spawnPoliceNear(pos: { x: number; y: number }): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = Phaser.Math.FloatBetween(200, 350);
    const x = pos.x + Math.cos(angle) * dist;
    const y = pos.y + Math.sin(angle) * dist;
    const cop = new NPC(this.scene, x, y, null, 'police');
    this.policeNPCs.push(cop);
    if (this.state.wantedLevel >= 3) {
      getAudio(this.scene).playSfx('siren');
    }
  }

  private decayWanted(dt: number): void {
    if (this.state.wantedLevel <= 0) {
      this.wantedDecayTimer = 0;
      this.crimeCooldown = 0;
      return;
    }

    if (this.crimeCooldown > 0) {
      this.crimeCooldown -= dt;
      return;
    }

    const nearCop = this.policeNPCs.some((cop) => cop.active);
    if (nearCop) {
      this.wantedDecayTimer = Math.max(0, this.wantedDecayTimer - dt * 0.5);
      return;
    }

    this.wantedDecayTimer += dt;
    const interval = 14 + this.state.wantedLevel * 5;
    if (this.wantedDecayTimer >= interval) {
      this.state.wantedLevel = Math.max(0, this.state.wantedLevel - 1);
      this.wantedDecayTimer = 0;
    }
  }
}