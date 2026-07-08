import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of [
  'src/systems/CoopInputManager.ts',
  'src/entities/Player.ts',
]) {
  if (!existsSync(join(root, file))) throw new Error(`${file} missing`);
}

const config = readFileSync(join(root, 'src', 'config.ts'), 'utf8');
if (!config.includes('coopPlayer2')) throw new Error('coopPlayer2 state missing');

const sprites = readFileSync(join(root, 'src', 'graphics', 'SpriteGenerator.ts'), 'utf8');
if (!sprites.includes('player2')) throw new Error('player2 sprite missing');

const combat = readFileSync(join(root, 'src', 'systems', 'CombatManager.ts'), 'utf8');
if (!combat.includes('pvp')) throw new Error('PvP combat missing');

const game = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!game.includes('CoopInputManager')) throw new Error('GameScene coop input missing');
if (!game.includes('updateCoopCamera')) throw new Error('Coop camera missing');
if (!game.includes('isCoopGameOver')) throw new Error('Coop game over logic missing');

const menu = readFileSync(join(root, 'src', 'scenes', 'MainMenuScene.ts'), 'utf8');
if (!menu.includes('КООП 2P')) throw new Error('Co-op menu missing');
if (!menu.includes('PvP 2P')) throw new Error('PvP menu missing');

const player = readFileSync(join(root, 'src', 'entities', 'Player.ts'), 'utf8');
if (!player.includes('slot')) throw new Error('Player slot support missing');

console.log('Phase 10 co-op/PvP checks passed');