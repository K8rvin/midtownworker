import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GANG_IDS,
  GANG_COLORS,
  GANG_NAMES,
  LIFE_SIM,
  TILE_SIZE,
  type GangId,
} from '../config';
import type { TimeManager } from '../systems/TimeManager';
import type { GameState } from '../config';
import type { QuestManager, QuestConfig } from '../systems/QuestManager';
import type { GangManager } from '../systems/GangManager';
import type { DailyQuestManager } from '../systems/DailyQuestManager';
import { WEAPON_SLOTS, WeaponManager } from '../systems/WeaponManager';
import { GroceryManager } from '../systems/GroceryManager';
import jobsData from '../data/jobs.json';
import type { CourierDeliveryState } from '../config';
import { weaponName, wantedText, questProgressText } from '../i18n';

export class HUD {
  private container: Phaser.GameObjects.Container;
  private livesText: Phaser.GameObjects.Text;
  private healthBar: Phaser.GameObjects.Graphics;
  private vehicleBar: Phaser.GameObjects.Graphics;
  private moneyText: Phaser.GameObjects.Text;
  private wantedText: Phaser.GameObjects.Text;
  private weaponSlotsText: Phaser.GameObjects.Text;
  private questText: Phaser.GameObjects.Text;
  private gangBars: Phaser.GameObjects.Graphics;
  private gangLabels: Phaser.GameObjects.Text;
  private interactHint: Phaser.GameObjects.Text;
  private dailyQuestText: Phaser.GameObjects.Text;
  private p2HealthBar: Phaser.GameObjects.Graphics;
  private p2Label: Phaser.GameObjects.Text;
  private coordsText: Phaser.GameObjects.Text;
  private weaponManager: WeaponManager;

  constructor(
    private scene: Phaser.Scene,
    private state: GameState,
    private questManager: QuestManager,
    private gangManager: GangManager,
    private dailyQuest?: DailyQuestManager
  ) {
    this.weaponManager = new WeaponManager(state);
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);

    const panel = scene.add.rectangle(0, 0, GAME_WIDTH, 56, 0x0d0d14, 0.85).setOrigin(0, 0);
    this.livesText = scene.add.text(12, 8, '', { fontFamily: 'monospace', fontSize: '16px', color: '#c8f542' });
    this.moneyText = scene.add.text(12, 30, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffd600' });
    this.wantedText = scene.add.text(200, 8, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ff2d55' });
    this.weaponSlotsText = scene.add.text(400, 8, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#6b7280',
    });
    this.healthBar = scene.add.graphics();
    this.vehicleBar = scene.add.graphics();
    this.questText = scene.add.text(16, GAME_HEIGHT - 130, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#c8f542',
      wordWrap: { width: 500 },
    });
    this.gangBars = scene.add.graphics();
    this.gangLabels = scene.add.text(GAME_WIDTH - 310, GAME_HEIGHT - 66, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#9ca3af',
      lineSpacing: 6,
    });
    this.interactHint = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#00e676',
    }).setOrigin(0.5);
    this.dailyQuestText = scene.add.text(16, GAME_HEIGHT - 88, '', {
      wordWrap: { width: 420 },
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#00b4ff',
    });
    this.p2HealthBar = scene.add.graphics();
    this.p2Label = scene.add.text(GAME_WIDTH - 180, 58, 'P2', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00b4ff',
    });
    this.coordsText = scene.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 12, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
        align: 'right',
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(100);

    this.container.add([
      panel,
      this.livesText,
      this.moneyText,
      this.wantedText,
      this.weaponSlotsText,
      this.healthBar,
      this.vehicleBar,
      this.questText,
      this.dailyQuestText,
      this.p2HealthBar,
      this.p2Label,
      this.gangBars,
      this.gangLabels,
      this.interactHint,
    ]);
  }

  update(
    interactHint = '',
    vehicleHp: { current: number; max: number } | null = null,
    timeManager?: TimeManager,
    worldPos?: { x: number; y: number } | null,
    coordLabel = '',
    storyLine = ''
  ): void {
    if (LIFE_SIM) {
      this.livesText.setText(timeManager?.formatClock(this.state) ?? `День ${this.state.day}`);
      this.moneyText.setText(`$${this.state.money}`);
      this.wantedText.setText(
        `Голод ${this.state.hunger}% · Сон ${this.state.sleep}%`
      );
      const jobCfg = this.state.job
        ? (jobsData as { id: string; jobType?: string; violent?: boolean }[]).find(
            (j) => j.id === this.state.job!.id
          )
        : null;
      const isCourier = jobCfg?.jobType === 'courier' || jobCfg?.id === 'courier';
      this.weaponSlotsText.setText(
        this.state.job
          ? isCourier
            ? `Работа: ${this.state.job.name} · доставки: ${this.state.lifeStats.courierDeliveries}`
            : `Работа: ${this.state.job.name}${this.state.job.remoteUnlocked ? ' (удалёнка)' : ''}`
          : 'Безработный'
      );
      this.drawHealthBar();
      this.drawP2HealthBar();
      this.drawVehicleBar(vehicleHp);
      this.gangBars.clear();
      this.gangLabels.setText(
        this.state.housing.homeId
          ? `Дом: ${this.state.housing.type === 'owned' ? 'свой' : 'аренда'}`
          : 'Жильё: нет'
      );
      this.questText.setText(storyLine);
      if (jobCfg?.violent) {
        const w = weaponName(this.state.currentWeapon);
        const ammo = this.weaponManager.getAmmoText(this.state.currentWeapon);
        this.dailyQuestText.setText(`${w}${ammo} · ПКМ/Q — прицел · 5 — снайперка`);
        this.drawWeaponSlots();
      } else if (isCourier) {
        this.dailyQuestText.setText(this.courierStatusLine(this.state.courierDelivery));
        this.gangBars.clear();
      } else {
        this.dailyQuestText.setText(`Запасы: ${new GroceryManager(this.state).getFoodStockSummary()}`);
        this.gangBars.clear();
      }
      this.interactHint.setText(interactHint);
      if (worldPos) {
        const tx = Math.floor(worldPos.x / TILE_SIZE);
        const ty = Math.floor(worldPos.y / TILE_SIZE);
        const prefix = coordLabel ? `${coordLabel} · ` : '';
        this.coordsText.setText(
          `${prefix}тайл (${tx}, ${ty}) · мир ${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}`
        );
      } else {
        this.coordsText.setText(coordLabel);
      }
      return;
    }
    this.coordsText.setText('');

    this.livesText.setText(`Жизни: ${'♥'.repeat(this.state.lives)}`);
    this.moneyText.setText(`Деньги: $${this.state.money}`);
    this.wantedText.setText(wantedText(this.state.wantedLevel));
    this.drawWeaponSlots();
    this.drawHealthBar();
    this.drawP2HealthBar();
    this.drawVehicleBar(vehicleHp);
    this.drawGangBars();

    const quest = this.questManager.getActiveQuest() as QuestConfig | null;
    if (quest) {
      const progress = this.state.questProgress[quest.id] ?? 0;
      const total =
        quest.type === 'collect'
          ? (quest.collectCount ?? 5)
          : quest.type === 'territory'
            ? (quest.captureCount ?? 3)
            : quest.type === 'gang_kill'
              ? (quest.killCount ?? 3)
              : quest.type === 'survive'
                ? (quest.surviveTime ?? 20)
                : quest.type === 'destroy'
                  ? (quest.destroyCount ?? 2)
                  : quest.type === 'race'
                    ? (quest.timeLimit ?? 50)
                    : quest.type === 'blockpost'
                      ? (quest.passCount ?? 2)
                      : undefined;
      const progressLine =
        quest.type === 'race'
          ? this.questManager.getRaceHudText(quest)
          : questProgressText(quest.type, progress, total);
      this.questText.setText(`Квест: ${quest.title}\n${quest.description}\n${progressLine}`);
    } else {
      this.questText.setText('Подойдите к таксофону (E) или нажмите J');
    }

    this.interactHint.setText(interactHint);
    if (this.dailyQuest) {
      this.dailyQuestText.setText(this.dailyQuest.getProgressText());
      this.dailyQuestText.setColor(this.dailyQuest.isDone() ? '#00e676' : '#00b4ff');
    }
  }

  private courierStatusLine(d: CourierDeliveryState | null): string {
    if (!d) return '📦 На складе (132, 72) — возьмите заказ';
    const pay = Math.round(12 + d.distanceTiles * 2.5);
    if (!d.hasPackage) return `📦 Забрать: ${d.pickupName} · ~$${pay}`;
    return `📦 Доставить: ${d.dropoffName} · ~$${pay}`;
  }

  private drawWeaponSlots(): void {
    const segments = WEAPON_SLOTS.map((id, i) => {
      const owned = this.state.ownedWeapons.includes(id);
      const active = this.state.currentWeapon === id;
      const ammo = owned ? this.weaponManager.getAmmoText(id) : '';
      const label = `${i + 1}:${owned ? weaponName(id) + ammo : '—'}`;
      return active ? `[${label}]` : label;
    });
    this.weaponSlotsText.setText(segments.join('  '));
    this.weaponSlotsText.setColor('#c8f542');
  }

  private drawP2HealthBar(): void {
    this.p2HealthBar.clear();
    const coop = this.state.coopPlayer2;
    if (!coop) {
      this.p2Label.setVisible(false);
      return;
    }
    this.p2Label.setVisible(true);
    this.p2HealthBar.fillStyle(0x333333, 1);
    this.p2HealthBar.fillRect(GAME_WIDTH - 180, 70, 160, 14);
    this.p2HealthBar.fillStyle(0x00b4ff, 1);
    const hpPct = coop.health / coop.maxHealth;
    this.p2HealthBar.fillRect(GAME_WIDTH - 180, 70, 160 * hpPct, 14);
    this.p2HealthBar.lineStyle(1, 0x00b4ff, 0.6);
    this.p2HealthBar.strokeRect(GAME_WIDTH - 180, 70, 160, 14);
    this.p2Label.setText(`P2 ♥${coop.lives}`);
  }

  private drawHealthBar(): void {
    this.healthBar.clear();
    this.healthBar.fillStyle(0x333333, 1);
    this.healthBar.fillRect(GAME_WIDTH - 180, 14, 160, 18);
    this.healthBar.fillStyle(0xff2d55, 1);
    const hpPct = this.state.health / this.state.maxHealth;
    this.healthBar.fillRect(GAME_WIDTH - 180, 14, 160 * hpPct, 18);
    this.healthBar.lineStyle(1, 0xc8f542, 0.5);
    this.healthBar.strokeRect(GAME_WIDTH - 180, 14, 160, 18);
  }

  private drawVehicleBar(vehicleHp: { current: number; max: number } | null): void {
    this.vehicleBar.clear();
    if (!vehicleHp) return;
    this.vehicleBar.fillStyle(0x333333, 1);
    this.vehicleBar.fillRect(GAME_WIDTH - 180, 36, 160, 12);
    this.vehicleBar.fillStyle(0xffa726, 1);
    const pct = Phaser.Math.Clamp(vehicleHp.current / vehicleHp.max, 0, 1);
    this.vehicleBar.fillRect(GAME_WIDTH - 180, 36, 160 * pct, 12);
    this.vehicleBar.lineStyle(1, 0xffd600, 0.6);
    this.vehicleBar.strokeRect(GAME_WIDTH - 180, 36, 160, 12);
  }

  private drawGangBars(): void {
    this.gangBars.clear();
    const barW = 120;
    const barH = 8;
    const startX = GAME_WIDTH - 200;
    const startY = GAME_HEIGHT - 68;
    const labels: string[] = [];

    GANG_IDS.forEach((gang: GangId, i) => {
      const y = startY + i * 18;
      const respect = this.state.respect[gang];
      const pct = (respect + 100) / 200;

      this.gangBars.fillStyle(0x1a1a2e, 1);
      this.gangBars.fillRect(startX, y, barW, barH);
      this.gangBars.fillStyle(GANG_COLORS[gang], 1);
      this.gangBars.fillRect(startX, y, barW * pct, barH);
      this.gangBars.lineStyle(1, 0x4a4a6a, 0.8);
      this.gangBars.strokeRect(startX, y, barW, barH);

      const sign = respect > 0 ? '+' : '';
      const standing =
        this.gangManager.getStanding(gang) === 'allied'
          ? '✓'
          : this.gangManager.getStanding(gang) === 'hostile'
            ? '⚔'
            : '—';
      labels.push(`${standing} ${GANG_NAMES[gang].slice(0, 4)} ${sign}${respect}`);
    });

    this.gangLabels.setText(labels.join('\n'));
  }

  destroy(): void {
    this.container.destroy();
  }
}