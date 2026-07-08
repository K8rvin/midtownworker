import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of [
  'src/systems/ControlSettings.ts',
  'src/systems/RunStats.ts',
  'src/ui/MobileControls.ts',
  'src/ui/ContextTip.ts',
]) {
  if (!existsSync(join(root, file))) throw new Error(`${file} missing`);
}

const input = readFileSync(join(root, 'src', 'systems', 'InputManager.ts'), 'utf8');
if (!input.includes('steerSensitivity')) throw new Error('Steer sensitivity missing');
if (!input.includes('justPressedInteract')) throw new Error('Rebindable interact missing');

const gameScene = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!gameScene.includes('MobileControls')) throw new Error('Mobile controls not integrated');
if (!gameScene.includes('ContextTip')) throw new Error('Context tips missing');
if (!gameScene.includes('playTimeSeconds')) throw new Error('Play time tracking missing');

const settings = readFileSync(join(root, 'src', 'scenes', 'SettingsScene.ts'), 'utf8');
if (!settings.includes('ControlSettings')) throw new Error('Control settings UI missing');

const victory = readFileSync(join(root, 'src', 'scenes', 'VictoryScene.ts'), 'utf8');
if (!victory.includes('RunStats.formatTime')) throw new Error('Victory time stats missing');

const audio = readFileSync(join(root, 'src', 'systems', 'AudioManager.ts'), 'utf8');
if (!audio.includes("'victory'")) throw new Error('Victory sfx missing');

console.log('Phase 6 UX checks passed');