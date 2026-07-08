import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

const INTRO_KEY = 'gta2_life_intro_seen';

const STEPS = [
  {
    title: 'Автовокзал',
    body: 'Вечер, дождь. Вы стоите у остановки с чемоданом.\nВ кармане — $85. На счёте — ноль. Работы нет.',
  },
  {
    title: 'Сообщение',
    body: 'Старый номер мигает на телефоне:\n«Студия в Старом городе — (78, 78). $80 в неделю. Без договора, заезжай.»',
  },
  {
    title: 'Вчера',
    body: 'Ещё вчера был дом в другом городе.\nСегодня — чемодан, этот город и ночь, которая уже наступает.',
  },
  {
    title: 'Нужды',
    body: 'Голод 28% · Сон 35%. Каждый час — минус.\nЕсли упадёт до нуля — обморок и штраф $50.',
  },
  {
    title: 'Управление',
    body: 'WASD — ходьба · Shift — бег\nE — действие · J — доска заданий · M — карта',
  },
  {
    title: 'Координаты',
    body: 'Внизу справа — тайл (x, y) и позиция в мире.\nСообщайте их при тестировании, если что-то сломается.',
  },
  {
    title: 'Сегодня',
    body: 'Цель №1: снять студию до полуночи.\nИдите к зелёной двери — тайл (78, 78).\n[E] у двери → «Снять».',
  },
  {
    title: 'Потом',
    body: 'После аренды — поесть в супермаркете (106, 108).\nПотом работа: офис занятости (95, 111) или телефон дома.\n\nЖёлтый маркер на карте подскажет путь.',
  },
];

export class LifeSimIntro {
  private container: Phaser.GameObjects.Container | null = null;
  private step = 0;
  private titleText: Phaser.GameObjects.Text | null = null;
  private bodyText: Phaser.GameObjects.Text | null = null;
  private stepText: Phaser.GameObjects.Text | null = null;
  private nextBtn: Phaser.GameObjects.Text | null = null;
  private keyHandlers: Array<{ key: string; fn: () => void }> = [];

  static shouldShow(): boolean {
    return !localStorage.getItem(INTRO_KEY);
  }

  static markSeen(): void {
    localStorage.setItem(INTRO_KEY, '1');
  }

  constructor(private scene: Phaser.Scene) {}

  isVisible(): boolean {
    return this.container !== null && this.container.visible;
  }

  show(onComplete: () => void): void {
    if (!LifeSimIntro.shouldShow()) {
      onComplete();
      return;
    }

    this.step = 0;
    this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(250);

    const dim = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);
    const panel = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 700, 340, 0x1a1a2e, 0.98)
      .setStrokeStyle(2, 0xc8f542);

    this.titleText = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 138, STEPS[0].title, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#c8f542',
      })
      .setOrigin(0.5);

    this.stepText = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 108, `Глава 0 · ${this.step + 1}/${STEPS.length}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6b7280',
      })
      .setOrigin(0.5);

    this.bodyText = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, STEPS[0].body, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e5e7eb',
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5);

    this.nextBtn = this.scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 128, 'ДАЛЕЕ (Enter)', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#c8f542',
        backgroundColor: '#0d0d14',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.container.add([dim, panel, this.titleText, this.stepText, this.bodyText, this.nextBtn]);

    const advance = () => {
      this.step++;
      if (this.step >= STEPS.length) {
        this.close();
        LifeSimIntro.markSeen();
        onComplete();
        return;
      }
      const s = STEPS[this.step];
      this.titleText?.setText(s.title);
      this.bodyText?.setText(s.body);
      this.stepText?.setText(`Глава 0 · ${this.step + 1}/${STEPS.length}`);
      if (this.step === STEPS.length - 1) {
        this.nextBtn?.setText('ВЫЙТИ НА УЛИЦУ (Enter)');
      }
    };

    this.nextBtn.on('pointerdown', advance);
    const onEnter = () => advance();
    const onSpace = () => advance();
    this.scene.input.keyboard?.on('keydown-ENTER', onEnter);
    this.scene.input.keyboard?.on('keydown-SPACE', onSpace);
    this.keyHandlers = [
      { key: 'keydown-ENTER', fn: onEnter },
      { key: 'keydown-SPACE', fn: onSpace },
    ];
  }

  close(): void {
    const kb = this.scene.input.keyboard;
    for (const h of this.keyHandlers) kb?.off(h.key, h.fn);
    this.keyHandlers = [];
    this.container?.destroy();
    this.container = null;
    this.titleText = null;
    this.bodyText = null;
    this.stepText = null;
    this.nextBtn = null;
  }
}