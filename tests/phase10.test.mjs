import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of [
  'src/systems/LeaderboardManager.ts',
  'src/systems/DailyQuestManager.ts',
  'src/systems/CloudSaveManager.ts',
  'src/scenes/LeaderboardScene.ts',
]) {
  if (!existsSync(join(root, file))) throw new Error(`${file} missing`);
}

const leaderboard = readFileSync(join(root, 'src', 'systems', 'LeaderboardManager.ts'), 'utf8');
if (!leaderboard.includes('computeScore')) throw new Error('Leaderboard score missing');
if (!leaderboard.includes('MAX_ENTRIES')) throw new Error('Leaderboard cap missing');

const daily = readFileSync(join(root, 'src', 'systems', 'DailyQuestManager.ts'), 'utf8');
if (!daily.includes('generateDailyQuest')) throw new Error('Daily quest generator missing');
if (!daily.includes('Ежедневное')) throw new Error('Daily quest label should mention Ежедневное');
if (!daily.includes('visit_port')) throw new Error('Daily visit_port type missing');

const cloud = readFileSync(join(root, 'src', 'systems', 'CloudSaveManager.ts'), 'utf8');
if (!cloud.includes('exportBundle')) throw new Error('Cloud export missing');
if (!cloud.includes('importBundle')) throw new Error('Cloud import missing');

const config = readFileSync(join(root, 'src', 'config.ts'), 'utf8');
const lifeSim = config.includes('LIFE_SIM = true');

const menu = readFileSync(join(root, 'src', 'scenes', 'MainMenuScene.ts'), 'utf8');
if (!menu.includes('ЛИДЕРБОРД')) throw new Error('Main menu leaderboard missing');
if (lifeSim) {
  if (!menu.includes('LIFE_SIM')) throw new Error('Main menu should respect LIFE_SIM');
} else if (!menu.includes('DailyQuestManager')) {
  throw new Error('Main menu daily quest missing');
}

const settings = readFileSync(join(root, 'src', 'scenes', 'SettingsScene.ts'), 'utf8');
if (!settings.includes('ЭКСПОРТ КОДА')) throw new Error('Settings export missing');
if (!settings.includes('ИМПОРТ КОДА')) throw new Error('Settings import missing');

const game = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!game.includes('DailyQuestManager')) throw new Error('GameScene daily quest missing');
if (!game.includes('LeaderboardManager')) throw new Error('GameScene leaderboard missing');
if (!game.includes('processDailyQuest')) throw new Error('GameScene daily tracking missing');

const main = readFileSync(join(root, 'src', 'main.ts'), 'utf8');
if (!main.includes('LeaderboardScene')) throw new Error('LeaderboardScene not registered');

console.log('Phase 10 meta checks passed');