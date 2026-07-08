import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const nav = readFileSync(join(root, 'src', 'systems', 'QuestGiverNavigation.ts'), 'utf8');
if (!nav.includes('getGiverMapPosition')) throw new Error('QuestGiverNavigation missing getGiverMapPosition');
if (!nav.includes('doorX')) throw new Error('Interior givers should use door position');

const quests = readFileSync(join(root, 'src', 'systems', 'QuestManager.ts'), 'utf8');
if (!quests.includes('questRequiresInPersonAccept')) throw new Error('QuestManager in-person accept check missing');
if (!quests.includes('getGiverMapPosition')) throw new Error('QuestManager should use door map position');

const questLog = readFileSync(join(root, 'src', 'ui', 'QuestLog.ts'), 'utf8');
if (!questLog.includes('У заказчика')) throw new Error('QuestLog should mark in-person quests');
if (!questLog.includes('getGiverLocationHint')) throw new Error('QuestLog should show location hints');

const fullMap = readFileSync(join(root, 'src', 'ui', 'FullMapOverlay.ts'), 'utf8');
if (!fullMap.includes('getMinimapGiverMarkers')) throw new Error('Full map should show quest giver markers');

const gameScene = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!gameScene.includes('spawnQuestOfficeDoorMarkers')) throw new Error('GameScene office door markers missing');
if (!gameScene.includes('questRequiresInPersonAccept')) throw new Error('Remote broker accept should be blocked');

const givers = JSON.parse(readFileSync(join(root, 'src', 'data', 'quest-givers.json'), 'utf8'));
const broker = givers.find((g) => g.id === 'npc_broker');
if (!broker?.interior?.doorX) throw new Error('Broker should have office door for navigation');

console.log('Phase 14 navigation checks passed');