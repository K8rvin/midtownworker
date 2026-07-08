import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { NPC } from '../entities/NPC';
import type { Player } from '../entities/Player';
import { getAudio } from './AudioManager';
import { steerNPCAlongPath } from '../world/NPCSteering';
import type { NavigationGrid } from '../world/NavigationGrid';
import type { BlockpostConfig } from '../world/MapTypes';

const PASS_RADIUS = 70;
const ARREST_RADIUS = 35;

export class BlockpostManager {
  public sprites: Phaser.GameObjects.Sprite[] = [];
  public cops: NPC[] = [];
  private locations: BlockpostConfig[] = [];
  private passedThisSession = new Set<string>();
  private alertCooldown = 0;

  constructor(private scene: Phaser.Scene) {}

  spawn(locations: BlockpostConfig[]): void {
    this.locations = locations;
    for (const loc of locations) {
      const x = loc.tx * TILE_SIZE + TILE_SIZE / 2;
      const y = loc.ty * TILE_SIZE + TILE_SIZE / 2;
      const sprite = this.scene.add.sprite(x, y, 'blockpost');
      sprite.setDepth(2);
      this.sprites.push(sprite);

      const offsets = [
        { dx: -28, dy: 0 },
        { dx: 28, dy: 0 },
      ];
      for (const o of offsets) {
        const cop = new NPC(this.scene, x + o.dx, y + o.dy, null, 'police');
        cop.sprite.setDepth(3);
        this.cops.push(cop);
      }
    }
  }

  update(dt: number, player: Player, wantedLevel: number, navigation?: NavigationGrid): string | null {
    this.alertCooldown = Math.max(0, this.alertCooldown - dt);
    const pos = player.getPosition();
    let passedId: string | null = null;

    for (let i = 0; i < this.locations.length; i++) {
      const loc = this.locations[i];
      const x = loc.tx * TILE_SIZE + TILE_SIZE / 2;
      const y = loc.ty * TILE_SIZE + TILE_SIZE / 2;
      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, x, y);

      const copA = this.cops[i * 2];
      const copB = this.cops[i * 2 + 1];
      const chase = wantedLevel >= 2;

      if (copA?.active) {
        if (chase) steerNPCAlongPath(copA, dt, pos, 100, navigation, (n, d, t, c) => n.update(d, t, c));
        else copA.update(dt, pos, false);
      }
      if (copB?.active) {
        if (chase) steerNPCAlongPath(copB, dt, pos, 100, navigation, (n, d, t, c) => n.update(d, t, c));
        else copB.update(dt, pos, false);
      }

      if (wantedLevel >= 1 && dist < PASS_RADIUS && !this.passedThisSession.has(loc.id)) {
        this.passedThisSession.add(loc.id);
        passedId = loc.id;
        if (this.alertCooldown <= 0) {
          getAudio(this.scene).playSfx('alert');
          this.alertCooldown = 3;
        }
      }
    }

    return passedId;
  }

  checkArrest(player: Player, wantedLevel: number): boolean {
    if (wantedLevel < 2 || player.inVehicle) return false;
    const pos = player.getPosition();
    for (const loc of this.locations) {
      const x = loc.tx * TILE_SIZE + TILE_SIZE / 2;
      const y = loc.ty * TILE_SIZE + TILE_SIZE / 2;
      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, x, y);
      if (dist < ARREST_RADIUS) return true;
    }
    return false;
  }

  getMinimapMarkers(): { x: number; y: number }[] {
    return this.locations.map((loc) => ({
      x: loc.tx * TILE_SIZE + TILE_SIZE / 2,
      y: loc.ty * TILE_SIZE + TILE_SIZE / 2,
    }));
  }

  resetPasses(): void {
    this.passedThisSession.clear();
  }

  restorePasses(ids: string[]): void {
    this.passedThisSession = new Set(ids);
  }
}