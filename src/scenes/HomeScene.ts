import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  TILE_SIZE,
  type GameState,
} from '../config';
import { HousingManager } from '../systems/HousingManager';
import { JobManager } from '../systems/JobManager';
import { NeedsManager } from '../systems/NeedsManager';
import { GroceryManager } from '../systems/GroceryManager';
import { LifeTaskManager } from '../systems/LifeTaskManager';
import { SaveManager } from '../systems/SaveManager';
import { JobApplicationUI } from '../ui/JobApplicationUI';
import { LifeSimStoryManager } from '../systems/LifeSimStoryManager';

export interface HomeSceneData {
  state: GameState;
  homeId: string;
  returnMapId: string;
  returnX: number;
  returnY: number;
}

const SLOT_COLORS: Record<string, number> = {
  bed: 0x9b59b6,
  fridge: 0x3498db,
  desk: 0xb8860b,
};

function furnitureColor(furnitureId: string): number {
  if (furnitureId.startsWith('bed_')) return SLOT_COLORS.bed;
  if (furnitureId.startsWith('fridge_')) return SLOT_COLORS.fridge;
  if (furnitureId.startsWith('desk_')) return SLOT_COLORS.desk;
  return 0x7ee787;
}

export class HomeScene extends Phaser.Scene {
  private state!: GameState;
  private housing!: HousingManager;
  private jobManager!: JobManager;
  private needs = new NeedsManager();
  private grocery!: GroceryManager;
  private lifeTasks!: LifeTaskManager;
  private storyManager!: LifeSimStoryManager;
  private returnData!: HomeSceneData;
  private hintText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private coordsText!: Phaser.GameObjects.Text;
  private pickerObjects: Phaser.GameObjects.GameObject[] = [];
  private jobBoardUI: JobApplicationUI | null = null;
  private exitReady = false;
  private exiting = false;
  private keyBindings: Array<{ event: string; fn: () => void }> = [];

  constructor() {
    super({ key: 'HomeScene' });
  }

  init(data: HomeSceneData): void {
    this.returnData = data;
    this.state = data.state;
    this.exiting = false;
    this.exitReady = false;
  }

  create(): void {
    this.events.off('shutdown', this.onShutdown);
    this.events.on('shutdown', this.onShutdown);

    const home = (this.housing = new HousingManager(this.state)).getHomeById(this.returnData.homeId);
    if (!home) {
      this.scene.stop('HomeScene');
      this.scene.resume('GameScene');
      return;
    }
    this.jobManager = new JobManager(this.state);
    this.grocery = new GroceryManager(this.state);
    this.lifeTasks = new LifeTaskManager(this.state);
    this.storyManager = new LifeSimStoryManager(this.state, this.lifeTasks);

    const w = home.interiorW * TILE_SIZE;
    const h = home.interiorH * TILE_SIZE;
    const ox = (GAME_WIDTH - w) / 2;
    const oy = (GAME_HEIGHT - h) / 2;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0d14);

    const floor = this.add.graphics();
    floor.fillStyle(0x2a2a40, 1);
    floor.fillRect(ox, oy, w, h);
    floor.lineStyle(2, 0xc8f542, 0.5);
    floor.strokeRect(ox, oy, w, h);

    this.add.rectangle(ox + w / 2, oy + h / 2 + 20, 20, 20, 0xc8f542);

    for (const slot of home.furnitureSlots) {
      const sx = ox + slot.x * TILE_SIZE + TILE_SIZE / 2;
      const sy = oy + slot.y * TILE_SIZE + TILE_SIZE / 2;
      const placed = this.state.furniturePlaced[slot.id];
      const emptyColor = 0x4a4a6a;
      const color = placed ? furnitureColor(placed) : emptyColor;
      const rect = this.add.rectangle(sx, sy, TILE_SIZE - 4, TILE_SIZE - 4, color, placed ? 0.85 : 0.45);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.onSlotClick(slot.id, placed));

      if (placed) {
        const item = this.grocery.getFurnitureById(placed);
        const label = item?.name ?? this.housing.getFurnitureName(placed);
        this.add
          .text(sx, sy - 16, label, {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#c8f542',
          })
          .setOrigin(0.5);
        this.drawFurnitureIcon(sx, sy, placed);
      } else {
        const slotHint =
          slot.accepts[0]?.startsWith('bed_')
            ? 'кровать'
            : slot.accepts[0]?.startsWith('fridge_')
              ? 'холодильник'
              : slot.accepts[0]?.startsWith('desk_')
                ? 'стол'
                : 'слот';
        this.add
          .text(sx, sy, '+', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#6b7280',
          })
          .setOrigin(0.5);
        this.add
          .text(sx, sy + 14, slotHint, {
            fontFamily: 'monospace',
            fontSize: '7px',
            color: '#6b7280',
          })
          .setOrigin(0.5);
      }
    }

    this.add
      .text(GAME_WIDTH / 2, 36, home.name, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#c8f542',
      })
      .setOrigin(0.5);

    this.statusText = this.add.text(24, 70, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#9ca3af',
      lineSpacing: 6,
    });

    this.coordsText = this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 12, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
        align: 'right',
      })
      .setOrigin(1, 1);

    this.hintText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 48, 'Подождите…', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#6b7280',
      })
      .setOrigin(0.5);

    const buttons: { label: string; y: number; action: () => void }[] = [
      { label: 'Телефон — вакансии', y: GAME_HEIGHT - 60, action: () => this.openJobBoard('phone') },
      { label: 'Поесть (запасы)', y: GAME_HEIGHT - 120, action: () => this.tryEat() },
      { label: 'Спать', y: GAME_HEIGHT - 90, action: () => this.trySleep() },
    ];
    if (this.housing.hasDesk()) {
      buttons.unshift({
        label: 'Ноутбук — вакансии',
        y: GAME_HEIGHT - 240,
        action: () => this.openJobBoard('laptop'),
      });
    }
    if (this.jobManager.canWorkRemote()) {
      buttons.push({
        label: 'Работать удалённо',
        y: GAME_HEIGHT - 150,
        action: () => this.tryRemoteWork(),
      });
    }
    if (this.state.housing.type === 'rent') {
      buttons.push({
        label: 'Оплатить аренду',
        y: GAME_HEIGHT - 180,
        action: () => this.tryPayRent(),
      });
    }
    if (this.state.housing.type === 'rent') {
      buttons.push({
        label: `Выкупить ($${home.buyPrice})`,
        y: GAME_HEIGHT - 210,
        action: () => this.tryBuy(),
      });
    }

    buttons.forEach((b) => {
      const btn = this.add
        .text(GAME_WIDTH - 200, b.y, b.label, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#c8f542',
          backgroundColor: '#1a1a2e',
          padding: { x: 8, y: 4 },
        })
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', b.action);
    });

    const exitBtn = this.add
      .text(GAME_WIDTH / 2, oy + h + 28, '[ E ] Выйти на улицу', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffd600',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => this.tryExit());

    this.bindInput();
    this.time.delayedCall(450, () => {
      this.exitReady = true;
      this.hintText.setText('');
    });

    this.refreshStatus();
    this.refreshCoords(home.doorX, home.doorY);
  }

  private bindInput(): void {
    this.unbindInput();
    const onEsc = () => {
      if (this.jobBoardUI?.isVisible()) this.jobBoardUI.close();
      else if (this.pickerObjects.length) this.closePicker();
      else this.tryExit();
    };
    const onExitKey = () => this.tryExit();
    this.keyBindings = [
      { event: 'keydown-E', fn: onExitKey },
      { event: 'keydown-ESC', fn: onEsc },
    ];
    const kb = this.input.keyboard;
    for (const b of this.keyBindings) kb?.on(b.event, b.fn);
  }

  private unbindInput(): void {
    const kb = this.input.keyboard;
    for (const b of this.keyBindings) kb?.off(b.event, b.fn);
    this.keyBindings = [];
  }

  private onShutdown = (): void => {
    this.unbindInput();
    this.jobBoardUI?.close();
    this.jobBoardUI = null;
    this.closePicker();
  };

  private tryExit(): void {
    if (!this.exitReady || this.exiting) return;
    if (this.jobBoardUI?.isVisible() || this.pickerObjects.length > 0) return;
    this.exitHome();
  }

  private refreshCoords(doorX: number, doorY: number): void {
    this.coordsText.setText(
      `дом · дверь (${doorX}, ${doorY}) · выход [E] через 0.5с после входа`
    );
    this.time.delayedCall(450, () => {
      this.coordsText.setText(`дом · дверь (${doorX}, ${doorY}) · тайл улицы при выходе`);
    });
  }

  private drawFurnitureIcon(x: number, y: number, furnitureId: string): void {
    const g = this.add.graphics();
    g.setPosition(x, y);
    if (furnitureId.startsWith('bed_')) {
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(-10, -4, 20, 8);
      g.fillStyle(0x6c3483, 1);
      g.fillRect(-10, -6, 6, 4);
    } else if (furnitureId.startsWith('fridge_')) {
      g.fillStyle(0xecf0f1, 1);
      g.fillRect(-8, -10, 16, 20);
      g.lineStyle(1, 0x2980b9, 1);
      g.strokeRect(-8, -10, 16, 20);
      g.lineBetween(-8, -2, 8, -2);
    } else if (furnitureId.startsWith('desk_')) {
      g.fillStyle(0x8b6914, 1);
      g.fillRect(-12, -2, 24, 4);
      g.fillRect(-10, 2, 3, 8);
      g.fillRect(7, 2, 3, 8);
    }
  }

  private onSlotClick(slotId: string, placed: string | undefined): void {
    if (placed) {
      const name = this.housing.getFurnitureName(placed);
      const item = this.grocery.getFurnitureById(placed);
      const bonus = item ? this.grocery.getFurnitureBonusText(item) : '';
      this.showHint(bonus ? `${name}: ${bonus}` : `Здесь: ${name}`);
      return;
    }
    const options = this.housing.getUnplacedForSlot(slotId);
    if (options.length === 0) {
      this.showHint('Купите подходящую мебель в мебельном магазине');
      return;
    }
    if (options.length === 1) {
      this.placeFurniture(options[0], slotId);
      return;
    }
    this.showFurniturePicker(slotId, options);
  }

  private showFurniturePicker(slotId: string, options: string[]): void {
    this.closePicker();
    const depth = 120;
    const bg = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 360, 40 + options.length * 44, 0x1a1a2e, 0.95)
      .setDepth(depth)
      .setStrokeStyle(2, 0xc8f542, 0.6);
    this.pickerObjects.push(bg);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20 - (options.length * 44) / 2 + 16, 'Что поставить?', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1);
    this.pickerObjects.push(title);

    options.forEach((fid, i) => {
      const item = this.grocery.getFurnitureById(fid);
      const y = GAME_HEIGHT / 2 - (options.length * 44) / 2 + 52 + i * 44;
      const row = this.add
        .text(GAME_WIDTH / 2, y, `${item?.name ?? fid} — ${item ? this.grocery.getFurnitureBonusText(item) : ''}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#e5e7eb',
          backgroundColor: '#2a2a40',
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5)
        .setDepth(depth + 1)
        .setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => {
        this.closePicker();
        this.placeFurniture(fid, slotId);
      });
      this.pickerObjects.push(row);
    });

    const cancel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + (options.length * 44) / 2 + 8, 'Отмена', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true });
    cancel.on('pointerdown', () => this.closePicker());
    this.pickerObjects.push(cancel);
  }

  private closePicker(): void {
    for (const o of this.pickerObjects) o.destroy();
    this.pickerObjects = [];
  }

  private placeFurniture(fid: string, slotId: string): void {
    const err = this.housing.placeFurniture(fid, slotId);
    if (err) this.showHint(err);
    else {
      this.notifyLifeEvent('place_furniture', { furnitureId: fid });
      this.scene.restart({ ...this.returnData, state: this.state });
    }
  }

  private notifyLifeEvent(event: string, payload?: Record<string, unknown>): void {
    const result = this.storyManager.handleLifeEvent(event, payload);
    if (!result) return;
    this.showHint(`${result.task.title} — готово!`);
  }

  private openJobBoard(source: 'phone' | 'laptop'): void {
    this.jobBoardUI?.close();
    this.jobBoardUI = new JobApplicationUI(
      this,
      this.jobManager,
      (job) => {
        const err = this.jobManager.apply(job);
        if (!err) this.notifyLifeEvent('get_job');
        return err;
      },
      () => this.jobManager.quit(),
      (msg) => this.showHint(msg),
      () => {}
    );
    this.jobBoardUI.show(source);
  }

  private tryEat(): void {
    const err = this.grocery.consumeFood();
    if (err) this.showHint(err);
    else {
      this.showHint('Вы поели из запасов');
      this.refreshStatus();
    }
  }

  private trySleep(): void {
    if (!this.housing.hasBed()) {
      this.showHint('Нужна кровать в доме');
      return;
    }
    this.needs.sleep(this.state, this.housing.getSleepBonus());
    this.showHint('Вы отдохнули');
    this.refreshStatus();
  }

  private tryRemoteWork(): void {
    const err = this.jobManager.workShift(false, this.state.hour);
    if (err) this.showHint(err);
    else {
      this.lifeTasks.onLifeEvent('remote_shifts');
      this.showHint(`Удалённая смена +$${this.state.job?.salary}`);
      this.refreshStatus();
    }
  }

  private tryPayRent(): void {
    const err = this.housing.payRent();
    if (err) this.showHint(err);
    else {
      this.lifeTasks.onLifeEvent('pay_rent');
      this.showHint('Аренда оплачена');
      this.refreshStatus();
    }
  }

  private tryBuy(): void {
    const home = this.housing.getHomeById(this.returnData.homeId);
    if (!home) return;
    const err = this.housing.buyHome(home);
    if (err) this.showHint(err);
    else {
      this.lifeTasks.onLifeEvent('own_home');
      this.showHint('Квартира ваша!');
      this.refreshStatus();
    }
  }

  private refreshStatus(): void {
    const rent =
      this.state.housing.type === 'rent'
        ? `Аренда до дня ${this.state.housing.rentDueDay}`
        : this.state.housing.type === 'owned'
          ? 'В собственности'
          : '—';
    const job = this.state.job ? this.state.job.name : 'безработный';
    const desk = this.housing.hasDesk() ? 'стол ✓' : 'стол —';
    const bed = this.housing.hasBed() ? 'кровать ✓' : 'кровать —';
    this.statusText.setText(
      `Деньги: $${this.state.money}\nГолод: ${this.state.hunger}% · Сон: ${this.state.sleep}%\nРабота: ${job}\n${rent}\n${bed} · ${desk}\nЗапасы: ${this.grocery.getFoodStockSummary()}`
    );
  }

  private showHint(msg: string): void {
    this.hintText.setText(msg);
    this.time.delayedCall(2500, () => {
      if (this.hintText?.active) this.hintText.setText('');
    });
  }

  private exitHome(): void {
    if (this.exiting) return;
    this.exiting = true;
    SaveManager.save(this.state);
    this.scene.stop('HomeScene');
    this.scene.resume('GameScene');
  }
}