import Phaser from 'phaser';
import { PNG_ASSETS } from './AssetManifest';

export function exportTexturesToDataUrls(scene: Phaser.Scene): Record<string, string> {
  const result: Record<string, string> = {};
  const keys = new Set(PNG_ASSETS.map((a) => a.key));

  for (const key of scene.textures.getTextureKeys()) {
    if (!keys.has(key)) continue;
    const dataUrl = textureKeyToDataUrl(scene, key);
    if (dataUrl) result[key] = dataUrl;
  }
  return result;
}

function textureKeyToDataUrl(scene: Phaser.Scene, key: string): string | null {
  if (!scene.textures.exists(key)) return null;
  const texture = scene.textures.get(key);
  const source = texture.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
  const canvas = document.createElement('canvas');

  if (source instanceof HTMLCanvasElement) {
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext('2d')?.drawImage(source, 0, 0);
  } else if (source instanceof HTMLImageElement) {
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
    canvas.getContext('2d')?.drawImage(source, 0, 0);
  } else {
    return null;
  }

  return canvas.toDataURL('image/png');
}