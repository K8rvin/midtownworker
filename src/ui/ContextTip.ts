import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export type TipEvent = 'death' | 'arrest' | 'quest_fail';

const TIPS: Record<TipEvent, string[]> = {
  death: [
    'Покупайте аптечку в больнице, когда деньги позволяют.',
    'Прячьтесь в зданиях — копы не заглядывают внутрь.',
    'В машине вы быстрее, но при угоне растёт розыск.',
    'Смените оружие клавишами 1–4 до боя, а не во время.',
  ],
  arrest: [
    'Сбросьте розыск: спрячьтесь или подождите — уровень падает сам.',
    'Блокпосты активны при розыске 2+. Объезжайте их стороной.',
    'Не выходите из машины рядом с копами при высоком розыске.',
    'Штраф $200 и потеря жизни — дешевле, чем вести перестрелку с патрулём.',
  ],
  quest_fail: [
    'Откройте журнал [J] и перечитайте условия квеста.',
    'Квесты с таймером — сначала маршрут, потом действие.',
    'Для «без копов» снизьте розыск до нуля перед стартом.',
    'Эскорт и доставка: берите машину заранее, пешком далеко.',
  ],
};

export class ContextTip {
  static show(scene: Phaser.Scene, event: TipEvent): void {
    const pool = TIPS[event];
    const text = pool[Math.floor(Math.random() * pool.length)];

    const title =
      event === 'death' ? 'СОВЕТ' : event === 'arrest' ? 'ПОЛИЦИЯ' : 'КВЕСТ';

    const panel = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 110, `${title}\n${text}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8f542',
        backgroundColor: '#10101acc',
        padding: { x: 14, y: 10 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120)
      .setAlpha(0);

    scene.tweens.add({
      targets: panel,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        scene.time.delayedCall(4200, () => {
          scene.tweens.add({
            targets: panel,
            alpha: 0,
            duration: 300,
            onComplete: () => panel.destroy(),
          });
        });
      },
    });
  }
}