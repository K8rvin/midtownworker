import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of [
  'src/graphics/AssetManifest.ts',
  'src/graphics/PngAssetLoader.ts',
  'src/graphics/AssetSettings.ts',
  'src/graphics/TextureExporter.ts',
]) {
  if (!existsSync(join(root, file))) throw new Error(`${file} missing`);
}

const manifest = readFileSync(join(root, 'src', 'graphics', 'AssetManifest.ts'), 'utf8');
if (!manifest.includes('PNG_ASSETS')) throw new Error('PNG_ASSETS manifest missing');
if (!manifest.includes('player2')) throw new Error('player2 in manifest');

const preload = readFileSync(join(root, 'src', 'scenes', 'PreloadScene.ts'), 'utf8');
if (!preload.includes('PngAssetLoader')) throw new Error('PreloadScene PNG loader missing');
if (!preload.includes('AssetSettings')) throw new Error('PreloadScene asset settings missing');

const sprites = readFileSync(join(root, 'src', 'graphics', 'SpriteGenerator.ts'), 'utf8');
if (!sprites.includes('shouldGen')) throw new Error('SpriteGenerator skip logic missing');
if (!sprites.includes('generateAll(skip')) throw new Error('SpriteGenerator generateAll skip param missing');

const settings = readFileSync(join(root, 'src', 'scenes', 'SettingsScene.ts'), 'utf8');
if (!settings.includes('АССЕТЫ')) throw new Error('Settings asset mode missing');

const exportScript = join(root, 'scripts', 'export-png-assets.mjs');
if (!existsSync(exportScript)) throw new Error('export-png-assets.mjs missing');

const assetsManifest = join(root, 'public', 'assets', 'manifest.json');
if (existsSync(assetsManifest)) {
  const data = JSON.parse(readFileSync(assetsManifest, 'utf8'));
  if ((data.count ?? 0) < 20) throw new Error(`Expected 20+ exported PNGs, got ${data.count}`);
}

console.log('PNG asset pipeline checks passed');