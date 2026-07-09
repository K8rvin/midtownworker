import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const save = readFileSync(join(root, 'src/systems/SaveManager.ts'), 'utf8');
if (!save.includes('SAVE_SLOT_COUNT = 3')) throw new Error('Need 3 save slots');
if (!save.includes('saveToSlot')) throw new Error('saveToSlot missing');
if (!save.includes('loadFromSlot')) throw new Error('loadFromSlot missing');
if (!save.includes('listSlots')) throw new Error('listSlots missing');
if (!save.includes('migrateLegacyIfNeeded')) throw new Error('Legacy migration missing');
if (!save.includes('gta2_save_slot_')) throw new Error('Slot storage keys missing');

const slotsScene = readFileSync(join(root, 'src/scenes/SaveSlotsScene.ts'), 'utf8');
if (!slotsScene.includes("'load'") || !slotsScene.includes('ЗАГРУЗИТЬ')) {
  throw new Error('Load mode missing');
}
if (!slotsScene.includes("'save'") || !slotsScene.includes('СОХРАНИТЬ')) {
  throw new Error('Save mode missing');
}
if (!slotsScene.includes("'new'") || !slotsScene.includes('НОВАЯ ИГРА')) {
  throw new Error('New game slot mode missing');
}

const nav = readFileSync(join(root, 'src/systems/SceneNav.ts'), 'utf8');
if (!nav.includes('goToMainMenu')) throw new Error('goToMainMenu missing');
if (!nav.includes('GameScene') || !nav.includes('.stop(')) {
  throw new Error('Must stop GameScene on main menu');
}

const pause = readFileSync(join(root, 'src/scenes/PauseScene.ts'), 'utf8');
if (!pause.includes('goToMainMenu')) throw new Error('Pause must use goToMainMenu');
if (!pause.includes('СОХРАНИТЬ')) throw new Error('Pause save button missing');

const menu = readFileSync(join(root, 'src/scenes/MainMenuScene.ts'), 'utf8');
if (!menu.includes('openLoadSlots') && !menu.includes('ЗАГРУЗИТЬ')) {
  throw new Error('Main menu load slots missing');
}
if (!menu.includes('openNewGameSlots')) throw new Error('Main menu new game slots missing');

const main = readFileSync(join(root, 'src/main.ts'), 'utf8');
if (!main.includes('SaveSlotsScene')) throw new Error('SaveSlotsScene not registered');

const gameScene = readFileSync(join(root, 'src/scenes/GameScene.ts'), 'utf8');
if (!gameScene.includes('SaveSlotsScene')) {
  throw new Error('GameScene should ignore ensureSceneRunning under SaveSlotsScene');
}

console.log('Save slots checks passed');
