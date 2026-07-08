import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of [
  'src/systems/AchievementManager.ts',
  'src/systems/MetaProgress.ts',
  'src/systems/GarageManager.ts',
]) {
  if (!existsSync(join(root, file))) throw new Error(`${file} missing`);
}

const quests = JSON.parse(readFileSync(join(root, 'src', 'data', 'quests.json'), 'utf8'));
if (quests.length < 32) throw new Error(`Expected 32+ quests, got ${quests.length}`);
const raceQuests = quests.filter((q) => q.type === 'race');
if (raceQuests.length < 7) throw new Error(`Expected 7+ race quests, got ${raceQuests.length}`);

const branchFinale = quests.filter((q) => q.isFinale);
if (branchFinale.length !== 3) throw new Error(`Expected 3 finale quests, got ${branchFinale.length}`);

const config = readFileSync(join(root, 'src', 'config.ts'), 'utf8');
if (!config.includes('ownedVehicles')) throw new Error('Garage state missing');
if (!config.includes('chosenBranch')) throw new Error('Branch state missing');

const qm = readFileSync(join(root, 'src', 'systems', 'QuestManager.ts'), 'utf8');
if (!qm.includes('blockedQuests')) throw new Error('Branch blocking missing');
if (!qm.includes('isFinale')) throw new Error('Finale quests missing');

const shop = readFileSync(join(root, 'src', 'systems', 'ShopManager.ts'), 'utf8');
if (!shop.includes('getAllyDiscount')) throw new Error('Ally discount missing');
if (!shop.includes('ownedVehicles')) throw new Error('Vehicle garage purchase missing');

const menu = readFileSync(join(root, 'src', 'scenes', 'MainMenuScene.ts'), 'utf8');
if (!menu.includes('NEW GAME+')) throw new Error('NG+ menu missing');

console.log('Phase 7 content checks passed:', { quests: quests.length, finales: branchFinale.length });