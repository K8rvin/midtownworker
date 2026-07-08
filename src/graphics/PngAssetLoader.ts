import Phaser from 'phaser';
import { PNG_ASSETS, type PngAssetEntry } from './AssetManifest';

const loadedKeys = new Set<string>();

export class PngAssetLoader {
  static reset(): void {
    loadedKeys.clear();
  }

  static queue(scene: Phaser.Scene, entries: PngAssetEntry[] = PNG_ASSETS): void {
    this.reset();

    scene.load.on('filecomplete', (key: string) => {
      loadedKeys.add(key);
    });

    for (const entry of entries) {
      if (entry.type === 'spritesheet' && entry.frameWidth && entry.frameHeight) {
        scene.load.spritesheet(entry.key, entry.path, {
          frameWidth: entry.frameWidth,
          frameHeight: entry.frameHeight,
        });
      } else {
        scene.load.image(entry.key, entry.path);
      }
    }
  }

  static getLoadedKeys(): ReadonlySet<string> {
    return loadedKeys;
  }

  static getLoadedCount(): number {
    return loadedKeys.size;
  }
}