import Phaser from 'phaser';
import { SpriteGenerator } from '../graphics/SpriteGenerator';
import { PngAssetLoader } from '../graphics/PngAssetLoader';
import { AssetSettings } from '../graphics/AssetSettings';
import { exportTexturesToDataUrls } from '../graphics/TextureExporter';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.load.tilemapTiledJSON('city_map', './maps/city.tmj');
    this.load.tilemapTiledJSON('port_map', './maps/port.tmj');

    const assetMode = AssetSettings.load().mode;
    if (assetMode !== 'procedural') {
      PngAssetLoader.queue(this);
    }
  }

  create(): void {
    const loaded = PngAssetLoader.getLoadedKeys();
    new SpriteGenerator(this).generateAll(loaded);

    if (import.meta.env.DEV) {
      (window as unknown as { __gta2ExportAssets?: () => Record<string, string> }).__gta2ExportAssets =
        () => exportTexturesToDataUrls(this);
    }

    this.registry.set('pngAssetsLoaded', loaded.size);
    this.scene.start('MainMenuScene');
  }
}