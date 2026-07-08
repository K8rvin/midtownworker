import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { NPC } from '../entities/NPC';
import type { Projectile } from '../entities/Projectile';
import type { Vehicle } from '../entities/Vehicle';
import type { GameState } from '../config';
import type { GangManager } from './GangManager';
import type { PoliceManager } from './PoliceManager';
import type { QuestManager } from './QuestManager';
import { getAudio } from './AudioManager';
import type { VfxManager } from '../graphics/VfxManager';
import { LIFE_SIM } from '../config';

export interface LifeSimCombatHooks {
  onContractTargetKilled?: () => void;
}

export class CombatManager {
  public projectiles: Projectile[] = [];

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private state: GameState,
    private gangManager: GangManager,
    private policeManager: PoliceManager,
    private questManager?: QuestManager,
    private vfx?: VfxManager,
    private player2?: Player | null,
    private pvp = false,
    private lifeSimHooks?: LifeSimCombatHooks
  ) {}

  shoot(from: Player = this.player, angleOverride?: number): void {
    this.trackWeapon();
    if (this.state.currentWeapon === 'shotgun') {
      const pellets = this.fireShotgun(from);
      if (pellets.length > 0) {
        this.projectiles.push(...pellets);
        this.playSound('shoot');
        this.muzzleFrom(from);
      }
      return;
    }
    const proj = from.tryShoot(this.scene, angleOverride);
    if (proj) {
      this.projectiles.push(proj);
      this.playSound('shoot');
      this.muzzleFrom(from, angleOverride);
    }
  }

  private fireShotgun(from: Player) {
    return from.tryShootShotgun(this.scene);
  }

  private muzzleFrom(from: Player, angleOverride?: number): void {
    const rad = Phaser.Math.DegToRad(angleOverride ?? from.facingAngle);
    const ox = from.sprite.x + Math.cos(rad) * 18;
    const oy = from.sprite.y + Math.sin(rad) * 18;
    this.vfx?.muzzleFlash(ox, oy, from.facingAngle);
  }

  update(npcList: NPC[], vehicles: Vehicle[] = []): void {
    this.projectiles = this.projectiles.filter((p) => p.active);

    for (const proj of [...this.projectiles]) {
      for (const v of vehicles) {
        if (!v.active) continue;
        const vDist = Phaser.Math.Distance.Between(proj.sprite.x, proj.sprite.y, v.sprite.x, v.sprite.y);
        if (vDist < 20) {
          v.takeDamage(proj.damage);
          proj.destroy();
          break;
        }
      }
      if (!proj.active) continue;

      if (this.pvp && this.player2?.sprite.active) {
        const targets = [this.player, this.player2];
        for (const target of targets) {
          if (!target.sprite.active || target.inVehicle) continue;
          const dist = Phaser.Math.Distance.Between(
            proj.sprite.x,
            proj.sprite.y,
            target.sprite.x,
            target.sprite.y
          );
          if (dist < 16) {
            target.takeDamage(proj.damage);
            proj.destroy();
            break;
          }
        }
        if (!proj.active) continue;
      }

      for (const npc of npcList) {
        if (!npc.active) continue;
        const dist = Phaser.Math.Distance.Between(
          proj.sprite.x,
          proj.sprite.y,
          npc.sprite.x,
          npc.sprite.y
        );
        if (dist < 16) {
          const killed = npc.takeDamage(proj.damage);
          proj.destroy();
          if (killed) {
            this.onNPCKilled(npc);
          }
          break;
        }
      }
    }
  }

  meleeAttack(npcList: NPC[], from: Player = this.player): void {
    this.trackWeapon();
    this.playSound('punch');
    const pos = from.getPosition();
    for (const npc of npcList) {
      if (!npc.active) continue;
      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, npc.sprite.x, npc.sprite.y);
      if (dist < 40) {
        const killed = npc.takeDamage(10);
        if (killed) {
          this.onNPCKilled(npc);
        }
      }
    }

    if (this.pvp && this.player2 && from !== this.player2) {
      const dist = Phaser.Math.Distance.Between(
        pos.x,
        pos.y,
        this.player2.sprite.x,
        this.player2.sprite.y
      );
      if (dist < 40 && !this.player2.inVehicle) {
        this.player2.takeDamage(12);
      }
    } else if (this.pvp && this.player2 && from === this.player2) {
      const dist = Phaser.Math.Distance.Between(
        pos.x,
        pos.y,
        this.player.sprite.x,
        this.player.sprite.y
      );
      if (dist < 40 && !this.player.inVehicle) {
        this.player.takeDamage(12);
      }
    }
  }

  private onNPCKilled(npc: NPC): void {
    if (LIFE_SIM) {
      this.state.stats.kills++;
      if (npc.role === 'target') {
        this.state.money += 250;
        this.state.lifeStats.contractKills += 1;
        this.lifeSimHooks?.onContractTargetKilled?.();
      }
      this.playSound('hit');
      return;
    }
    this.state.stats.kills++;
    this.gangManager.onKill(true, npc.gang);
    this.questManager?.onGangMemberKilled(npc.gang);
    if (npc.role === 'police') {
      this.policeManager.onPoliceKilled();
    } else if (npc.gang) {
      this.policeManager.addWanted(1);
    }
    this.playSound('hit');
  }

  private trackWeapon(): void {
    const weapon = this.state.currentWeapon;
    if (!this.state.usedWeapons.includes(weapon)) {
      this.state.usedWeapons.push(weapon);
    }
  }

  private playSound(type: 'shoot' | 'hit' | 'punch'): void {
    getAudio(this.scene).playSfx(type);
  }
}