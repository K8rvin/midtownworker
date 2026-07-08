import Phaser from 'phaser';
import type { GangId, GameState } from '../config';
import { GANG_NAMES } from '../config';

export class GangManager {
  constructor(private state: GameState) {}

  changeRespect(gang: GangId, amount: number): void {
    this.state.respect[gang] = Phaser.Math.Clamp(this.state.respect[gang] + amount, -100, 100);
  }

  onKill(killerIsPlayer: boolean, victimGang: GangId | null): void {
    if (!killerIsPlayer || !victimGang) return;
    const gangs: GangId[] = ['yakuza', 'rednecks', 'scientists'];
    for (const g of gangs) {
      if (g === victimGang) {
        this.changeRespect(g, -10);
      } else {
        this.changeRespect(g, 5);
      }
    }
  }

  getRespectText(): string {
    return (['yakuza', 'rednecks', 'scientists'] as GangId[])
      .map((g) => `${GANG_NAMES[g]}: ${this.state.respect[g]}`)
      .join(' | ');
  }

  canCaptureTerritory(gang: GangId): boolean {
    return this.state.respect[gang] > -50;
  }

  isHostile(gang: GangId): boolean {
    return this.state.respect[gang] < -25;
  }

  isAllied(gang: GangId): boolean {
    return this.state.respect[gang] > 35;
  }

  getStanding(gang: GangId): 'hostile' | 'neutral' | 'allied' {
    if (this.isHostile(gang)) return 'hostile';
    if (this.isAllied(gang)) return 'allied';
    return 'neutral';
  }

  shouldGangAttack(gang: GangId, inTerritory: boolean): boolean {
    if (!inTerritory) return false;
    return this.isHostile(gang);
  }
}