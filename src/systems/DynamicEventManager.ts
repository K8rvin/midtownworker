import Phaser from 'phaser';
import type { GameState, GangId } from '../config';
import { GANG_NAMES } from '../config';
import { NPC } from '../entities/NPC';
import type { CityMap } from '../world/CityMap';
import type { Player } from '../entities/Player';
import { getAudio } from './AudioManager';

export type DynamicEventType = 'shootout' | 'robbery';

export class DynamicEventManager {
  private timer = 45;
  private active = false;
  private eventNpcs: NPC[] = [];

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private cityMap: CityMap
  ) {}

  update(dt: number, player: Player): string | null {
    this.timer -= dt;
    if (this.active) return null;
    if (this.timer > 0) return null;

    const pos = player.getPosition();
    const gang = this.cityMap.getGangAt(pos.x, pos.y);
    if (!gang) {
      this.timer = 30;
      return null;
    }

    const roll = Math.random();
    if (roll < 0.55) {
      return this.startShootout(gang, pos.x, pos.y);
    }
    return this.startRobbery(pos.x, pos.y);
  }

  cleanup(): void {
    for (const npc of this.eventNpcs) {
      npc.sprite.destroy();
    }
    this.eventNpcs = [];
    this.active = false;
  }

  getEventNpcs(): NPC[] {
    return this.eventNpcs;
  }

  private startShootout(gang: GangId, x: number, y: number): string {
    this.active = true;
    this.timer = 90 + Math.random() * 60;
    getAudio(this.scene).playSfx('alert');

    for (let i = 0; i < 3; i++) {
      const npc = new NPC(
        this.scene,
        x + Phaser.Math.Between(-80, 80),
        y + Phaser.Math.Between(-80, 80),
        gang,
        'gang'
      );
      npc.hostile = true;
      this.eventNpcs.push(npc);
    }

    this.scene.time.delayedCall(12000, () => {
      this.cleanup();
    });

    return `Перестрелка ${GANG_NAMES[gang]}!`;
  }

  private startRobbery(x: number, y: number): string {
    this.active = true;
    this.timer = 75 + Math.random() * 45;
    const bonus = 120 + Math.floor(Math.random() * 180);
    this.state.money += bonus;
    getAudio(this.scene).playSfx('buy');

    this.scene.time.delayedCall(8000, () => {
      this.active = false;
    });

    return `Ограбление рядом! +$${bonus}`;
  }
}