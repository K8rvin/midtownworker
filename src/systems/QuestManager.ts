import Phaser from 'phaser';
import type { GameState, GangId, QuestSnapshot } from '../config';
import questsData from '../data/quests.json';
import questGiversData from '../data/quest-givers.json';
import type { GangManager } from './GangManager';
import { NPC } from '../entities/NPC';
import type { Player } from '../entities/Player';
import type { CityMap } from '../world/CityMap';
import type { DialogueLine } from '../types/dialogue';
import { formatDialogueReward, normalizeDialogue } from '../types/dialogue';
import {
  getGiverLocationHint,
  getGiverMapPosition,
  requiresInPersonAccept,
} from './QuestGiverNavigation';

export interface QuestConfig {
  id: string;
  title: string;
  description: string;
  type: string;
  reward: number;
  respectGang: GangId;
  respectGain: number;
  targetX?: number;
  targetY?: number;
  collectCount?: number;
  timeLimit?: number;
  escapeTime?: number;
  minWanted?: number;
  captureCount?: number;
  enemyGang?: GangId;
  vehicleType?: string;
  targetGang?: GangId;
  killCount?: number;
  surviveTime?: number;
  territoryGang?: GangId;
  destroyCount?: number;
  cost?: number;
  passCount?: number;
  requiresQuest?: string;
  branchGang?: GangId;
  blocksQuests?: string[];
  isFinale?: boolean;
  giverId: string;
  dialogStart: string | DialogueLine[];
  dialogEnd: string | DialogueLine[];
  checkpoints?: { x: number; y: number }[];
  requireVehicle?: boolean;
  mapId?: string;
}

export interface QuestGiverInterior {
  doorX: number;
  doorY: number;
  interiorX: number;
  interiorY: number;
  interiorW: number;
  interiorH: number;
  spawnX: number;
  spawnY: number;
}

export interface QuestGiverConfig {
  id: string;
  name: string;
  title: string;
  gang: GangId | null;
  mapId: string;
  x: number;
  y: number;
  interior?: QuestGiverInterior;
  idleDialogue?: DialogueLine[];
}

export interface QuestUnlockStatus {
  quest: QuestConfig;
  unlocked: boolean;
  reason?: string;
}

export class QuestManager {
  public quests: QuestConfig[] = questsData as QuestConfig[];
  public givers: QuestGiverConfig[] = questGiversData as QuestGiverConfig[];
  public questMarkers: Phaser.GameObjects.Container[] = [];
  public packageSprites: Phaser.GameObjects.Sprite[] = [];
  public targetNPC: NPC | null = null;
  public escortNPC: NPC | null = null;
  public capturePoints: { x: number; y: number; captured: boolean }[] = [];
  private questTimer = 0;
  public raceCheckpointIndex = 0;
  private escapeTimer = 0;
  private surviveTimer = 0;
  private blockpostsPassed = new Set<string>();
  private nocopsFailed = false;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private gangManager: GangManager,
    private cityMap?: CityMap
  ) {}

  getQuestUnlockStatus(quest: QuestConfig): QuestUnlockStatus {
    if (this.state.completedQuests.includes(quest.id)) {
      return { quest, unlocked: false, reason: 'Выполнен' };
    }
    if (this.state.blockedQuests.includes(quest.id)) {
      return { quest, unlocked: false, reason: 'Другая ветка выбрана' };
    }
    if (
      quest.branchGang &&
      this.state.chosenBranch &&
      quest.branchGang !== this.state.chosenBranch
    ) {
      return { quest, unlocked: false, reason: 'Другая ветка выбрана' };
    }
    if (quest.requiresQuest && !this.state.completedQuests.includes(quest.requiresQuest)) {
      const prereq = this.quests.find((q) => q.id === quest.requiresQuest);
      return {
        quest,
        unlocked: false,
        reason: prereq ? `Сначала: ${prereq.title}` : 'Нужен предыдущий квест',
      };
    }
    return { quest, unlocked: true };
  }

  getAvailableQuests(): QuestConfig[] {
    return this.quests.filter((q) => {
      if (this.state.completedQuests.includes(q.id)) return false;
      return this.getQuestUnlockStatus(q).unlocked;
    });
  }

  getGiver(giverId: string): QuestGiverConfig | undefined {
    return this.givers.find((g) => g.id === giverId);
  }

  getGiversForMap(mapId: string): QuestGiverConfig[] {
    return this.givers.filter((g) => g.mapId === mapId);
  }

  getGiverLocationHint(giver: QuestGiverConfig): string {
    return getGiverLocationHint(giver);
  }

  questRequiresInPersonAccept(quest: QuestConfig): boolean {
    return requiresInPersonAccept(this.getGiver(quest.giverId));
  }

  getAvailableQuestsForGiver(giverId: string): QuestConfig[] {
    return this.getAvailableQuests().filter((q) => q.giverId === giverId);
  }

  getStartDialogue(quest: QuestConfig): DialogueLine[] {
    const giver = this.getGiver(quest.giverId);
    return normalizeDialogue(quest.dialogStart, giver?.name ?? '');
  }

  getEndDialogue(quest: QuestConfig): DialogueLine[] {
    const giver = this.getGiver(quest.giverId);
    return formatDialogueReward(normalizeDialogue(quest.dialogEnd, giver?.name ?? ''), quest.reward);
  }

  getIdleDialogue(giverId: string): DialogueLine[] {
    const giver = this.getGiver(giverId);
    if (giver?.idleDialogue?.length) return giver.idleDialogue;
    return [{ speaker: giver?.name ?? '', text: 'Пока нет работы для тебя.' }];
  }

  getRaceHudText(quest: QuestConfig): string {
    const elapsed = Math.floor(this.questTimer);
    const limit = quest.timeLimit ?? 60;
    if (quest.checkpoints?.length) {
      return `Чекпоинт: ${this.raceCheckpointIndex}/${quest.checkpoints.length} · ${elapsed}/${limit} сек`;
    }
    return `Время: ${elapsed}/${limit} сек`;
  }

  private getRacePoints(quest: QuestConfig): { x: number; y: number }[] {
    if (quest.checkpoints?.length) return quest.checkpoints;
    if (quest.targetX !== undefined && quest.targetY !== undefined) {
      return [{ x: quest.targetX, y: quest.targetY }];
    }
    return [];
  }

  getQuestList(): QuestUnlockStatus[] {
    return this.quests
      .filter((q) => !this.state.completedQuests.includes(q.id))
      .map((q) => this.getQuestUnlockStatus(q));
  }

  startQuest(questId: string): QuestConfig | null {
    const quest = this.quests.find((q) => q.id === questId);
    if (!quest || this.state.completedQuests.includes(questId)) return null;
    if (!this.getQuestUnlockStatus(quest).unlocked) return null;
    if (this.state.activeQuestId) return null;

    this.state.activeQuestId = questId;
    this.state.questProgress[questId] = 0;
    if (quest.branchGang && !this.state.chosenBranch) {
      this.state.chosenBranch = quest.branchGang;
    }
    if (quest.blocksQuests?.length) {
      for (const blocked of quest.blocksQuests) {
        if (!this.state.blockedQuests.includes(blocked)) {
          this.state.blockedQuests.push(blocked);
        }
      }
    }
    this.setupQuestObjects(quest);
    return quest;
  }

  completeQuest(): QuestConfig | null {
    const questId = this.state.activeQuestId;
    if (!questId) return null;
    const quest = this.quests.find((q) => q.id === questId);
    if (!quest) return null;

    this.state.completedQuests.push(questId);
    this.state.activeQuestId = null;
    this.state.questSnapshot = null;
    const rewardMult = 1 + (this.state.ngPlusLevel ?? 0) * 0.25;
    this.state.money += Math.floor(quest.reward * rewardMult);
    this.state.stats.questsCompleted++;
    this.gangManager.changeRespect(quest.respectGang, quest.respectGain);
    this.cleanupQuestObjects();
    return quest;
  }

  isFinaleQuest(quest: QuestConfig): boolean {
    return !!quest.isFinale;
  }

  update(dt: number, player: Player): string | null {
    const questId = this.state.activeQuestId;
    if (!questId) return null;
    const quest = this.quests.find((q) => q.id === questId);
    if (!quest) return null;

    const pos = player.getPosition();

    if (quest.type === 'nocops' && this.state.wantedLevel > 0) {
      this.nocopsFailed = true;
      return 'fail';
    }

    switch (quest.type) {
      case 'delivery': {
        const tx = (quest.targetX ?? 0) * 32 + 16;
        const ty = (quest.targetY ?? 0) * 32 + 16;
        if (Phaser.Math.Distance.Between(pos.x, pos.y, tx, ty) < 40) {
          return 'complete';
        }
        break;
      }
      case 'kill': {
        if (!this.targetNPC?.active) return 'complete';
        break;
      }
      case 'collect': {
        this.questTimer += dt;
        if (this.questTimer > (quest.timeLimit ?? 120)) return 'fail';
        for (const pkg of [...this.packageSprites]) {
          const dist = Phaser.Math.Distance.Between(pos.x, pos.y, pkg.x, pkg.y);
          if (dist < 30) {
            pkg.destroy();
            this.packageSprites = this.packageSprites.filter((p) => p !== pkg);
            this.state.questProgress[questId] = (this.state.questProgress[questId] ?? 0) + 1;
          }
        }
        if ((this.state.questProgress[questId] ?? 0) >= (quest.collectCount ?? 5)) return 'complete';
        break;
      }
      case 'escape': {
        if (this.state.wantedLevel >= (quest.minWanted ?? 3)) {
          this.escapeTimer += dt;
          this.state.questProgress[questId] = Math.floor(this.escapeTimer);
        } else {
          this.escapeTimer = 0;
        }
        if (this.escapeTimer >= (quest.escapeTime ?? 30)) return 'complete';
        break;
      }
      case 'territory': {
        for (const point of this.capturePoints) {
          if (point.captured) continue;
          const dist = Phaser.Math.Distance.Between(pos.x, pos.y, point.x, point.y);
          if (dist < 40) {
            point.captured = true;
            this.state.questProgress[questId] = (this.state.questProgress[questId] ?? 0) + 1;
          }
        }
        if ((this.state.questProgress[questId] ?? 0) >= (quest.captureCount ?? 3)) return 'complete';
        break;
      }
      case 'escort': {
        if (!this.escortNPC?.active) return 'fail';
        if (this.escortNPC.hp <= 0) return 'fail';
        const tx = (quest.targetX ?? 0) * 32 + 16;
        const ty = (quest.targetY ?? 0) * 32 + 16;
        const dist = Phaser.Math.Distance.Between(this.escortNPC.sprite.x, this.escortNPC.sprite.y, tx, ty);
        if (dist < 50) return 'complete';
        break;
      }
      case 'steal': {
        const tx = (quest.targetX ?? 0) * 32 + 16;
        const ty = (quest.targetY ?? 0) * 32 + 16;
        if (player.inVehicle && player.currentVehicle?.getType() === quest.vehicleType) {
          if (Phaser.Math.Distance.Between(pos.x, pos.y, tx, ty) < 50) {
            this.state.stats.vehiclesStolen++;
            return 'complete';
          }
        }
        break;
      }
      case 'gang_kill': {
        if ((this.state.questProgress[questId] ?? 0) >= (quest.killCount ?? 3)) return 'complete';
        break;
      }
      case 'survive': {
        const gang = quest.territoryGang;
        const inZone = gang && this.cityMap?.getGangAt(pos.x, pos.y) === gang;
        if (inZone) {
          this.surviveTimer += dt;
          this.state.questProgress[questId] = Math.floor(this.surviveTimer);
        }
        if (this.surviveTimer >= (quest.surviveTime ?? 20)) return 'complete';
        break;
      }
      case 'destroy': {
        if ((this.state.questProgress[questId] ?? 0) >= (quest.destroyCount ?? 2)) return 'complete';
        break;
      }
      case 'race': {
        if (quest.mapId && this.state.currentMapId !== quest.mapId) break;
        if (quest.requireVehicle && !player.inVehicle) break;

        this.questTimer += dt;
        this.state.questProgress[questId] = Math.floor(this.questTimer);
        if (this.questTimer > (quest.timeLimit ?? 60)) return 'fail';

        const points = this.getRacePoints(quest);
        if (this.raceCheckpointIndex >= points.length) return 'complete';

        const next = points[this.raceCheckpointIndex];
        const tx = next.x * 32 + 16;
        const ty = next.y * 32 + 16;
        if (Phaser.Math.Distance.Between(pos.x, pos.y, tx, ty) < 45) {
          this.raceCheckpointIndex++;
          this.refreshRaceCheckpointMarkers(quest);
          if (this.raceCheckpointIndex >= points.length) return 'complete';
        }
        break;
      }
      case 'bribe': {
        const tx = (quest.targetX ?? 0) * 32 + 16;
        const ty = (quest.targetY ?? 0) * 32 + 16;
        if (Phaser.Math.Distance.Between(pos.x, pos.y, tx, ty) < 40) {
          const cost = quest.cost ?? 400;
          if (this.state.money < cost) return 'fail';
          this.state.money -= cost;
          return 'complete';
        }
        break;
      }
      case 'nocops': {
        const tx = (quest.targetX ?? 0) * 32 + 16;
        const ty = (quest.targetY ?? 0) * 32 + 16;
        if (Phaser.Math.Distance.Between(pos.x, pos.y, tx, ty) < 40) {
          if (this.state.wantedLevel > 0) return 'fail';
          return 'complete';
        }
        break;
      }
      case 'blockpost': {
        if (this.blockpostsPassed.size >= (quest.passCount ?? 2)) return 'complete';
        break;
      }
    }
    return null;
  }

  onGangMemberKilled(gang: GangId | null): void {
    const quest = this.getActiveQuest();
    if (!quest || quest.type !== 'gang_kill' || !gang) return;
    if (gang !== quest.targetGang) return;
    const id = quest.id;
    this.state.questProgress[id] = (this.state.questProgress[id] ?? 0) + 1;
  }

  onVehicleDestroyed(): void {
    const quest = this.getActiveQuest();
    if (!quest || quest.type !== 'destroy') return;
    const id = quest.id;
    this.state.questProgress[id] = (this.state.questProgress[id] ?? 0) + 1;
  }

  onBlockpostPassed(blockpostId: string): void {
    const quest = this.getActiveQuest();
    if (!quest || quest.type !== 'blockpost') return;
    if (this.state.wantedLevel < (quest.minWanted ?? 1)) return;
    this.blockpostsPassed.add(blockpostId);
    this.state.questProgress[quest.id] = this.blockpostsPassed.size;
  }

  getActiveQuest(): QuestConfig | null {
    if (!this.state.activeQuestId) return null;
    return this.quests.find((q) => q.id === this.state.activeQuestId) ?? null;
  }

  getMinimapGiverMarkers(mapId: string): { x: number; y: number; kind: 'giver' }[] {
    if (this.state.activeQuestId) return [];
    const markers: { x: number; y: number; kind: 'giver' }[] = [];
    for (const giver of this.getGiversForMap(mapId)) {
      if (this.getAvailableQuestsForGiver(giver.id).length === 0) continue;
      const pos = getGiverMapPosition(giver);
      markers.push({ x: pos.wx, y: pos.wy, kind: 'giver' });
    }
    return markers;
  }

  getMinimapMarkers(): { x: number; y: number; kind: 'target' | 'objective' }[] {
    const quest = this.getActiveQuest();
    if (!quest) return [];

    const markers: { x: number; y: number; kind: 'target' | 'objective' }[] = [];

    if (quest.type === 'kill' && this.targetNPC?.active) {
      markers.push({
        x: this.targetNPC.sprite.x,
        y: this.targetNPC.sprite.y,
        kind: 'target',
      });
    }

    if (quest.type === 'collect') {
      for (const pkg of this.packageSprites) {
        if (pkg.active) markers.push({ x: pkg.x, y: pkg.y, kind: 'objective' });
      }
    }

    if (quest.type === 'territory') {
      for (const point of this.capturePoints) {
        if (!point.captured) markers.push({ x: point.x, y: point.y, kind: 'objective' });
      }
    }

    if (quest.type === 'race') {
      const points = this.getRacePoints(quest);
      const next = points[this.raceCheckpointIndex];
      if (next) {
        markers.push({ x: next.x * 32 + 16, y: next.y * 32 + 16, kind: 'target' });
      }
      for (let i = 0; i < points.length; i++) {
        if (i === this.raceCheckpointIndex) continue;
        const p = points[i];
        markers.push({ x: p.x * 32 + 16, y: p.y * 32 + 16, kind: 'objective' });
      }
    }

    const skipTargetMarker = ['territory', 'kill', 'gang_kill', 'destroy', 'survive', 'blockpost', 'race'];
    if (quest.targetX !== undefined && !skipTargetMarker.includes(quest.type)) {
      markers.push({
        x: quest.targetX * 32 + 16,
        y: quest.targetY! * 32 + 16,
        kind: 'target',
      });
    }

    if (quest.type === 'kill' && quest.targetX !== undefined && !this.targetNPC?.active) {
      markers.push({
        x: quest.targetX * 32 + 16,
        y: quest.targetY! * 32 + 16,
        kind: 'target',
      });
    }

    return markers;
  }

  getAllMinimapMarkers(
    mapId: string
  ): { x: number; y: number; kind: 'target' | 'objective' | 'giver' }[] {
    return [...this.getMinimapMarkers(), ...this.getMinimapGiverMarkers(mapId)];
  }

  failQuest(): void {
    this.state.activeQuestId = null;
    this.state.questSnapshot = null;
    this.cleanupQuestObjects();
    this.questTimer = 0;
    this.escapeTimer = 0;
    this.surviveTimer = 0;
    this.nocopsFailed = false;
  }

  restoreQuest(quest: QuestConfig, snapshot?: QuestSnapshot | null): void {
    this.setupQuestObjects(quest, snapshot ?? this.state.questSnapshot);
    if (snapshot?.blockpostsPassed) {
      for (const id of snapshot.blockpostsPassed) {
        this.blockpostsPassed.add(id);
      }
    }
    if (quest.type === 'race' && snapshot?.raceElapsed !== undefined) {
      this.questTimer = snapshot.raceElapsed;
    }
  }

  captureSnapshot(): QuestSnapshot | null {
    const questId = this.state.activeQuestId;
    if (!questId) return null;
    const quest = this.quests.find((q) => q.id === questId);
    if (!quest) return null;

    const snapshot: QuestSnapshot = { blockpostsPassed: [...this.blockpostsPassed] };

    if (quest.type === 'escort' && this.escortNPC?.active) {
      snapshot.escortX = this.escortNPC.sprite.x;
      snapshot.escortY = this.escortNPC.sprite.y;
      snapshot.escortHp = this.escortNPC.hp;
    }

    if (quest.type === 'collect') {
      snapshot.packagePositions = this.packageSprites
        .filter((p) => p.active)
        .map((p) => ({ x: p.x, y: p.y }));
    }

    if (quest.type === 'territory') {
      snapshot.captureCaptured = this.capturePoints.map((p) => p.captured);
    }

    if (quest.type === 'race') {
      snapshot.raceCheckpointIndex = this.raceCheckpointIndex;
      snapshot.raceElapsed = this.questTimer;
    }

    return snapshot;
  }

  private setupQuestObjects(quest: QuestConfig, snapshot?: QuestSnapshot | null): void {
    this.cleanupQuestObjects();
    this.questTimer = 0;
    this.escapeTimer = 0;
    this.surviveTimer = 0;
    this.blockpostsPassed.clear();
    this.nocopsFailed = false;
    this.raceCheckpointIndex = snapshot?.raceCheckpointIndex ?? 0;
    if (quest.type === 'race' && snapshot?.raceElapsed !== undefined) {
      this.questTimer = snapshot.raceElapsed;
    }

    if (quest.type === 'kill' && quest.targetX !== undefined) {
      const pos = { x: quest.targetX * 32 + 16, y: quest.targetY! * 32 + 16 };
      this.targetNPC = new NPC(this.scene, pos.x, pos.y, 'scientists', 'target');
    }

    if (quest.type === 'collect') {
      const positions =
        snapshot?.packagePositions ??
        Array.from({ length: quest.collectCount ?? 5 }, () => ({
          x: Phaser.Math.Between(35, 45) * 32 + 16,
          y: Phaser.Math.Between(35, 45) * 32 + 16,
        }));
      for (const pos of positions) {
        const pkg = this.scene.add.sprite(pos.x, pos.y, 'package');
        pkg.setDepth(3);
        this.packageSprites.push(pkg);
      }
    }

    if (quest.type === 'territory') {
      const offsets = [
        { x: 12, y: 55 },
        { x: 18, y: 58 },
        { x: 15, y: 62 },
      ];
      for (let i = 0; i < offsets.length; i++) {
        const o = offsets[i];
        const captured = snapshot?.captureCaptured?.[i] ?? false;
        this.capturePoints.push({ x: o.x * 32 + 16, y: o.y * 32 + 16, captured });
        const flag = this.scene.add.sprite(o.x * 32 + 16, o.y * 32 + 16, 'flag');
        flag.setTint(captured ? 0x6b7280 : 0x00e676);
        flag.setDepth(3);
        this.questMarkers.push(this.scene.add.container(0, 0, [flag]));
      }
    }

    if (quest.type === 'escort') {
      const ex = snapshot?.escortX ?? this.state.playerX;
      const ey = snapshot?.escortY ?? this.state.playerY + 40;
      this.escortNPC = new NPC(this.scene, ex, ey, 'scientists', 'civilian');
      this.escortNPC.isEscort = true;
      if (snapshot?.escortHp !== undefined) {
        this.escortNPC.hp = snapshot.escortHp;
      }
    }

    if (quest.type === 'race') {
      this.setupRaceCheckpointMarkers(quest);
    } else {
      const needsMarker =
        quest.targetX !== undefined &&
        !['territory', 'gang_kill', 'destroy', 'survive', 'blockpost'].includes(quest.type);
      if (needsMarker) {
        const marker = this.scene.add.circle(
          quest.targetX! * 32 + 16,
          quest.targetY! * 32 + 16,
          20,
          0xff2d55,
          0.4
        );
        marker.setDepth(1);
        this.questMarkers.push(this.scene.add.container(0, 0, [marker]));
      }
    }
  }

  private setupRaceCheckpointMarkers(quest: QuestConfig): void {
    const points = this.getRacePoints(quest);
    for (let i = 0; i < points.length; i++) {
      const cp = points[i];
      const x = cp.x * 32 + 16;
      const y = cp.y * 32 + 16;
      const passed = i < this.raceCheckpointIndex;
      const active = i === this.raceCheckpointIndex;
      const color = passed ? 0x6b7280 : active ? 0xffd600 : 0xff2d55;
      const ring = this.scene.add.circle(x, y, 18, color, active ? 0.55 : 0.35);
      ring.setDepth(2);
      const label = this.scene.add.text(x, y, passed ? '✓' : String(i + 1), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
      });
      label.setOrigin(0.5).setDepth(3);
      this.questMarkers.push(this.scene.add.container(0, 0, [ring, label]));
    }
  }

  private refreshRaceCheckpointMarkers(quest: QuestConfig): void {
    for (const m of this.questMarkers) m.destroy();
    this.questMarkers = [];
    this.setupRaceCheckpointMarkers(quest);
  }

  private cleanupQuestObjects(): void {
    if (this.targetNPC) {
      this.targetNPC.die();
      this.targetNPC = null;
    }
    if (this.escortNPC) {
      this.escortNPC.die();
      this.escortNPC = null;
    }
    for (const pkg of this.packageSprites) pkg.destroy();
    this.packageSprites = [];
    for (const m of this.questMarkers) m.destroy();
    this.questMarkers = [];
    this.capturePoints = [];
    this.blockpostsPassed.clear();
    this.raceCheckpointIndex = 0;
  }
}