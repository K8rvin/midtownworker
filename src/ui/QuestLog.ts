import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GANG_NAMES } from '../config';
import type { QuestManager } from '../systems/QuestManager';

const ROW_HEIGHT = 34;
const VISIBLE_ROWS = 8;

export class QuestLog {
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private panel: Phaser.GameObjects.Rectangle | null = null;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private visible = false;
  private scrollOffset = 0;
  private escHandler?: () => void;
  private keyHandlers: ((event: KeyboardEvent) => void)[] = [];
  private wheelHandler?: (pointer: Phaser.Input.Pointer, _go: Phaser.GameObjects.GameObject[], _dx: number, _dy: number, _dz: number, event: Phaser.Types.Input.EventData) => void;

  constructor(
    private scene: Phaser.Scene,
    private questManager: QuestManager,
    private onStartQuest: (id: string) => boolean,
    private onClose: () => void,
    private onNotify?: (message: string) => void
  ) {}

  open(): void {
    if (this.visible) return;
    this.scrollOffset = 0;
    this.show();
  }

  toggle(): void {
    if (this.visible) this.close();
    else {
      this.scrollOffset = 0;
      this.show();
    }
  }

  close(): void {
    if (!this.visible) return;
    this.hide();
    this.onClose();
  }

  hide(): void {
    this.visible = false;
    this.clearContent();
  }

  private clearContent(): void {
    if (this.escHandler) {
      this.scene.input.keyboard?.off('keydown-ESC', this.escHandler);
      this.escHandler = undefined;
    }
    for (const h of this.keyHandlers) {
      this.scene.input.keyboard?.off('keydown', h);
    }
    this.keyHandlers = [];
    if (this.wheelHandler) {
      this.scene.input.off('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }

    this.overlay?.destroy();
    this.panel?.destroy();
    for (const row of this.rows) row.destroy();
    this.overlay = null;
    this.panel = null;
    this.rows = [];
  }

  isVisible(): boolean {
    return this.visible;
  }

  private show(): void {
    this.visible = true;
    this.renderList();
  }

  private renderList(): void {
    this.clearContent();
    this.visible = true;

    const depth = 200;
    const questEntries = this.questManager.getQuestList();
    const maxScroll = Math.max(0, questEntries.length - VISIBLE_ROWS);

    this.overlay = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
      .setScrollFactor(0)
      .setDepth(depth);

    this.panel = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 660, 500, 0x0d0d14, 0.98)
      .setStrokeStyle(2, 0xc8f542)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    const title = this.scene.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 220,
        `ЖУРНАЛ КВЕСТОВ (${this.questManager.getAvailableQuests().length}/${questEntries.length})`,
        {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.rows.push(title);

    if (questEntries.length === 0) {
      const empty = this.scene.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Нет доступных квестов', {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#6b7280',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 2);
      this.rows.push(empty);
    }

    const visibleQuests = questEntries.slice(this.scrollOffset, this.scrollOffset + VISIBLE_ROWS);
    visibleQuests.forEach((entry, vi) => {
      const globalIndex = this.scrollOffset + vi;
      const y = GAME_HEIGHT / 2 - 165 + vi * ROW_HEIGHT;
      const num = globalIndex + 1;
      const q = entry.quest;
      const start = () => this.tryStart(q.id, entry.unlocked);

      const labelColor = entry.unlocked ? '#c8f542' : '#4b5563';
      const branchTag = q.branchGang ? ` · ${GANG_NAMES[q.branchGang].slice(0, 3)}` : '';
      const giver = this.questManager.getGiver(q.giverId);
      const inPerson = entry.unlocked && this.questManager.questRequiresInPersonAccept(q);
      const giverTag = giver ? ` · ${giver.name}` : '';
      const label = this.scene.add
        .text(GAME_WIDTH / 2 - 270, y - 6, `[${num}] ${q.title}${giverTag}${branchTag}${entry.unlocked ? '' : ' 🔒'}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: labelColor,
        })
        .setScrollFactor(0)
        .setDepth(depth + 2);

      const locationHint = giver && entry.unlocked ? this.questManager.getGiverLocationHint(giver) : '';
      const descText = entry.unlocked
        ? inPerson
          ? `${q.description} — $${q.reward}\n→ ${locationHint}`
          : `${q.description} — $${q.reward}${locationHint ? `\n→ ${locationHint}` : ''}`
        : entry.reason ?? 'Заблокирован';
      const desc = this.scene.add
        .text(GAME_WIDTH / 2 - 270, y + 10, descText, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#6b7280',
        })
        .setScrollFactor(0)
        .setDepth(depth + 2);

      const acceptLabel = this.scene.add
        .text(
          GAME_WIDTH / 2 + 220,
          y + 8,
          entry.unlocked ? (inPerson ? 'У заказчика' : 'Принять ▶') : '—',
          {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: entry.unlocked ? (inPerson ? '#ff69b4' : '#00e676') : '#4b5563',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 2);

      const hitZone = this.scene.add
        .rectangle(GAME_WIDTH / 2, y + 8, 580, 32, 0x1a1a2e, 0.01)
        .setStrokeStyle(1, entry.unlocked ? 0xc8f542 : 0x374151)
        .setScrollFactor(0)
        .setDepth(depth + 3);

      if (entry.unlocked) {
        hitZone.setInteractive({ useHandCursor: true });
        hitZone.on('pointerover', () => hitZone.setStrokeStyle(2, inPerson ? 0xff69b4 : 0x00e676));
        hitZone.on('pointerout', () => hitZone.setStrokeStyle(1, 0xc8f542));
        hitZone.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          if (inPerson && giver) {
            this.onNotify?.(`Возьмите задание у заказчика: ${this.questManager.getGiverLocationHint(giver)}`);
            return;
          }
          start();
        });
      }

      this.rows.push(label, desc, acceptLabel, hitZone);

      if (entry.unlocked && !inPerson && num <= 9) {
        const keyHandler = (event: KeyboardEvent) => {
          if (event.key === String(num)) {
            event.preventDefault();
            start();
          }
        };
        this.keyHandlers.push(keyHandler);
        this.scene.input.keyboard?.on('keydown', keyHandler);
      }
    });

    const scrollHint =
      questEntries.length > VISIBLE_ROWS
        ? `Прокрутка: колёсико / ↑↓  (${this.scrollOffset + 1}–${Math.min(this.scrollOffset + VISIBLE_ROWS, questEntries.length)} из ${questEntries.length})`
        : '';

    const hint = this.scene.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 215,
        `Клик / «Принять» / 1–9  |  Розовые — только у заказчика  |  Esc — закрыть\n${scrollHint}`,
        {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2);
    this.rows.push(hint);

    this.escHandler = () => this.close();
    this.scene.input.keyboard?.on('keydown-ESC', this.escHandler);

    const scrollHandler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 1);
        this.renderList();
      }
      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        this.scrollOffset = Math.max(0, this.scrollOffset - 1);
        this.renderList();
      }
    };
    this.keyHandlers.push(scrollHandler);
    this.scene.input.keyboard?.on('keydown', scrollHandler);

    this.wheelHandler = (_pointer, _go, _dx, dy) => {
      if (dy > 0) this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 1);
      else if (dy < 0) this.scrollOffset = Math.max(0, this.scrollOffset - 1);
      this.renderList();
    };
    this.scene.input.on('wheel', this.wheelHandler);
  }

  private tryStart(questId: string, unlocked = true): void {
    if (!unlocked) return;
    const ok = this.onStartQuest(questId);
    if (ok) this.close();
  }
}