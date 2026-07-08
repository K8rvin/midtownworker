import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of [
  'server/ws-server.mjs',
  'src/systems/NetworkManager.ts',
  'src/systems/NetworkTypes.ts',
  'src/systems/NetworkSettings.ts',
  'src/entities/RemotePlayer.ts',
  'src/scenes/LobbyScene.ts',
]) {
  if (!existsSync(join(root, file))) throw new Error(`${file} missing`);
}

const game = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!game.includes('isOnline')) throw new Error('GameScene online mode missing');
if (!game.includes('RemotePlayer')) throw new Error('GameScene remote players missing');
if (!game.includes('sendState')) throw new Error('GameScene network sync missing');

const lobby = readFileSync(join(root, 'src', 'scenes', 'LobbyScene.ts'), 'utf8');
if (!lobby.includes('start_game')) throw new Error('Lobby start game missing');

const menu = readFileSync(join(root, 'src', 'scenes', 'MainMenuScene.ts'), 'utf8');
if (!menu.includes('ОНЛАЙН')) throw new Error('Main menu online missing');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!pkg.scripts.server) throw new Error('npm run server script missing');

console.log('Online multiplayer checks passed');