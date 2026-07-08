import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    if (!this.registry.get('audio')) {
      this.registry.set('audio', new AudioManager());
    }
    this.scene.start('PreloadScene');
  }
}