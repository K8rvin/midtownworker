import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

const TUTORIAL_KEY = 'gta2_tutorial_seen';

const STEPS = [
  'Добро пожаловать в город!\n\nWASD — движение, Shift — спринт.',
  'E — взаимодействие: таксофоны, магазины, машины, лестницы.',
  'J — журнал квестов. Подойдите к таксофону (синий на карте).',
  '1–4 — смена оружия. ЛКМ — стрельба или удар кулаками.',
  'M — карта, Esc — пауза. F5/F9 — сохранение и загрузка.\n\nУдачи!',
];

export class TutorialOverlay {
  private container: Phaser.GameObjects.Container | null = null;
  private step = 0;
  private bodyText: Phaser.GameObjects.Text | null = null;
  private nextBtn: Phaser.GameObjects.Text | null = null;

  static shouldShow(): boolean {
    return !localStorage.getItem(TUTORIAL_KEY);
  }

  static markSeen(): void {
    localStorage.setItem(TUTORIAL_KEY, '1');
  }

  constructor(private scene: Phaser.Scene) {}

  isVisible(): boolean {
    return this.container !== null && this.container.visible;
  }

  show(onComplete: () => void): void {
    if (!TutorialOverlay.shouldShow()) {
      onComplete();
      return;
    }

    this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(250);

    const dim = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);
    const panel = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 640, 280, 0x1a1a2e, 0.98).setStrokeStyle(2, 0xc8f542);

    const title = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, 'ОБУЧЕНИЕ', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#c8f542',
    }).setOrigin(0.5);

    this.bodyText = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, STEPS[0], {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#e5e7eb',
      align: 'center',
      wordWrap: { width: 560 },
    }).setOrigin(0.5);

    this.nextBtn = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 'ДАЛЕЕ (Enter)', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#c8f542',
      backgroundColor: '#0d0d14',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.container.add([dim, panel, title, this.bodyText, this.nextBtn]);

    const advance = () => {
      this.step++;
      if (this.step >= STEPS.length) {
        this.close();
        TutorialOverlay.markSeen();
        onComplete();
        return;
      }
      this.bodyText?.setText(STEPS[this.step]);
      if (this.step === STEPS.length - 1) {
        this.nextBtn?.setText('ИГРАТЬ (Enter)');
      }
    };

    this.nextBtn.on('pointerdown', advance);

    const onKey = () => advance();
    this.scene.input.keyboard?.on('keydown-ENTER', onKey);
    this.scene.input.keyboard?.on('keydown-SPACE', onKey);
    this.container.setData('onKey', onKey);
  }

  close(): void {
    const onKey = this.container?.getData('onKey') as (() => void) | undefined;
    if (onKey) {
      this.scene.input.keyboard?.off('keydown-ENTER', onKey);
      this.scene.input.keyboard?.off('keydown-SPACE', onKey);
    }
    this.container?.destroy();
    this.container = null;
    this.bodyText = null;
    this.nextBtn = null;
  }
}