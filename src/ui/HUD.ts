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
  private needsBars: Phaser.GameObjects.Graphics;
  private needsLabels: Phaser.GameObjects.Text;
  private storyPanel: Phaser.GameObjects.Graphics;
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

    const panel = scene.add.rectangle(0, 0, GAME_WIDTH, LIFE_SIM ? 64 : 56, 0x0d0d14, 0.88).setOrigin(0, 0);
    this.livesText = scene.add.text(12, 8, '', {
      fontFamily: 'monospace',
      fontSize: LIFE_SIM ? '18px' : '16px',
      color: '#c8f542',
    });
    this.moneyText = scene.add.text(12, LIFE_SIM ? 34 : 30, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd600',
    });
    this.wantedText = scene.add.text(200, 8, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ff2d55' });
    this.weaponSlotsText = scene.add.text(LIFE_SIM ? 200 : 400, LIFE_SIM ? 34 : 8, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#9ca3af',
    });
    this.healthBar = scene.add.graphics();
    this.vehicleBar = scene.add.graphics();
    this.needsBars = scene.add.graphics();
    this.needsLabels = scene.add.text(200, 8, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#9ca3af',
    });
    this.storyPanel = scene.add.graphics();
    // Bottom-left objective — compact for camera zoom; scale compensated via setUiScale
    this.questText = scene.add.text(20, GAME_HEIGHT - 118, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#c8f542',
      wordWrap: { width: 400 },
      lineSpacing: 2,
    });
    this.gangBars = scene.add.graphics();
    this.gangLabels = scene.add.text(GAME_WIDTH - 310, GAME_HEIGHT - 66, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#9ca3af',
      lineSpacing: 6,
    });
    this.interactHint = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#00e676',
    }).setOrigin(0.5);
    this.dailyQuestText = scene.add.text(20, GAME_HEIGHT - 76, '', {
      wordWrap: { width: 380 },
      fontFamily: 'monospace',
      fontSize: '11px',
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
      .setOrigin(1, 1);

    this.container.add([
      panel,
      this.livesText,
      this.moneyText,
      this.wantedText,
      this.weaponSlotsText,
      this.healthBar,
      this.vehicleBar,
      this.needsBars,
      this.needsLabels,
      this.storyPanel,
      this.questText,
      this.dailyQuestText,
      this.p2HealthBar,
      this.p2Label,
      this.gangBars,
      this.gangLabels,
      this.interactHint,
      this.coordsText,
    ]);
  }

  /** Roots for main-camera ignore (fixed UI layer). */
  getUiRoots(): Phaser.GameObjects.GameObject[] {
    return [this.container];
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
      this.wantedText.setText('');
      this.drawNeedsBars();
      const jobCfg = this.state.job
        ? (jobsData as { id: string; jobType?: string; violent?: boolean }[]).find(
            (j) => j.id === this.state.job!.id
          )
        : null;
      const isCourier = jobCfg?.jobType === 'courier' || jobCfg?.id === 'courier';
      const isTaxi = jobCfg?.jobType === 'taxi' || jobCfg?.id === 'taxi';
      const isPolice = jobCfg?.jobType === 'police' || jobCfg?.id === 'police';
      const isFire = jobCfg?.jobType === 'firefighter' || jobCfg?.id === 'firefighter';
      const shiftTag = this.state.job?.shiftOpen ? ' · смена' : '';
      this.weaponSlotsText.setText(
        this.state.job
          ? isCourier
            ? `Курьер · ${this.state.lifeStats.courierDeliveries} дост.${shiftTag}`
            : isTaxi
              ? `Такси · ${this.state.lifeStats.taxiFares ?? 0} рейсов${shiftTag}`
              : isPolice
                ? `Полиция · ${this.state.lifeStats.policeCalls ?? 0} вызовов${shiftTag}`
                : isFire
                  ? `Пожарные · ${this.state.lifeStats.fireCalls ?? 0} выездов${shiftTag}`
                  : `Работа: ${this.state.job.name}${this.state.job.remoteUnlocked ? ' (удалёнка)' : ''}`
          : 'Безработный · P — смартфон'
      );
      this.drawHealthBar();
      this.drawP2HealthBar();
      this.drawVehicleBar(vehicleHp);
      this.gangBars.clear();
      if (this.state.housing.type === 'rent' && this.state.housing.homeId) {
        const days = Math.max(0, this.state.housing.rentDueDay - this.state.day);
        // rent amount not on state — show days only
        this.gangLabels.setText(
          days === 0
            ? `Аренда: сегодня списание`
            : `Аренда через ${days} дн. (до дн.${this.state.housing.rentDueDay})`
        );
      } else {
        this.gangLabels.setText(
          this.state.housing.homeId
            ? `Дом: ${this.state.housing.type === 'owned' ? 'свой' : 'аренда'}`
            : 'Жильё: нет · P — смартфон'
        );
      }
      this.drawStoryPanel(!!storyLine);
      this.questText.setText(storyLine);
      if (jobCfg?.violent) {
        const w = weaponName(this.state.currentWeapon);
        const ammo = this.weaponManager.getAmmoText(this.state.currentWeapon);
        this.dailyQuestText.setText(`${w}${ammo} · ПКМ/Q — прицел · 5 — снайперка`);
        this.drawWeaponSlots();
      } else if (isCourier) {
        this.dailyQuestText.setText(this.courierStatusLine(this.state.courierDelivery));
        this.gangBars.clear();
      } else if (isTaxi) {
        const f = this.state.taxiFare;
        this.dailyQuestText.setText(
          f
            ? f.hasPassenger
              ? `🚕 ${f.passengerName} → ${f.dropoffName}`
              : `🚕 Забрать: ${f.passengerName}`
            : `🚕 Чистота ${Math.round(this.state.taxiCarCleanliness ?? 100)}% · P — заказы`
        );
        this.gangBars.clear();
      } else if (isPolice || isFire) {
        const c = this.state.emergencyCall;
        this.dailyQuestText.setText(
          c
            ? `${isPolice ? '🚓' : '🚒'} ${c.title} → ${c.targetName} · ~$${c.pay}`
            : `${isPolice ? '🚓' : '🚒'} Участок — смена / вызов (E) · P — смартфон`
        );
        this.gangBars.clear();
      } else {
        this.dailyQuestText.setText(`Запасы: ${new GroceryManager(this.state).getFoodStockSummary()} · P — смартфон`);
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
    this.needsBars.clear();
    this.needsLabels.setText('');
    this.storyPanel.clear();
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

  private drawNeedsBars(): void {
    this.needsBars.clear();
    const startX = 200;
    const barW = 110;
    const barH = 10;
    const rows: { label: string; value: number; color: number; y: number }[] = [
      { label: 'Голод', value: this.state.hunger, color: 0xff8a3d, y: 10 },
      { label: 'Сон', value: this.state.sleep, color: 0x5b9dff, y: 28 },
    ];
    if (this.state.drunkLevel > 8) {
      rows.push({ label: 'Алк', value: this.state.drunkLevel, color: 0xc77dff, y: 46 });
    }
    const labels: string[] = [];
    for (const row of rows) {
      const pct = Phaser.Math.Clamp(row.value / 100, 0, 1);
      this.needsBars.fillStyle(0x1a1a28, 0.95);
      this.needsBars.fillRoundedRect(startX, row.y, barW, barH, 3);
      this.needsBars.fillStyle(row.color, 1);
      this.needsBars.fillRoundedRect(startX, row.y, barW * pct, barH, 3);
      this.needsBars.lineStyle(1, 0xc8f542, 0.35);
      this.needsBars.strokeRoundedRect(startX, row.y, barW, barH, 3);
      labels.push(`${row.label} ${Math.round(row.value)}`);
    }
    this.needsLabels.setPosition(startX + barW + 8, 8);
    this.needsLabels.setText(labels.join('\n'));
  }

  /**
   * Counteract main-camera zoom on scrollFactor-0 UI.
   * Phaser zooms around screen center, so we scale by 1/z and shift origin.
   * @param cameraZoom current cameras.main.zoom
   */
  setUiScale(cameraZoom: number): void {
    const z = Phaser.Math.Clamp(cameraZoom, 0.5, 2.5);
    const s = 1 / z;
    const ox = GAME_WIDTH * 0.5 * (1 - s);
    const oy = GAME_HEIGHT * 0.5 * (1 - s);
    this.container.setScale(s);
    this.container.setPosition(ox, oy);
  }

  private drawStoryPanel(hasText: boolean): void {
    this.storyPanel.clear();
    if (!hasText) return;
    // Compact panel that fits after camera zoom (UI also scaled via setUiScale)
    const x = 10;
    const y = GAME_HEIGHT - 128;
    const w = 420;
    const h = 58;
    this.storyPanel.fillStyle(0x0d0d14, 0.88);
    this.storyPanel.fillRoundedRect(x, y, w, h, 6);
    this.storyPanel.lineStyle(1, 0xc8f542, 0.4);
    this.storyPanel.strokeRoundedRect(x, y, w, h, 6);
    this.storyPanel.lineStyle(2, 0xff2d55, 0.55);
    this.storyPanel.lineBetween(x + 4, y + 6, x + 4, y + h - 6);
    this.questText.setPosition(x + 12, y + 8);
    this.dailyQuestText.setPosition(x + 12, y + h + 4);
  }

  private courierStatusLine(d: CourierDeliveryState | null): string {
    if (!d) return '📦 Склад — возьмите заказ (следуйте за стрелкой)';
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