import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const config = readFileSync(join(root, 'src', 'config.ts'), 'utf8');
if (!config.includes('LIFE_SIM = true')) throw new Error('LIFE_SIM flag missing');
if (!config.includes('hunger')) throw new Error('GameState hunger missing');
if (!config.includes('job: JobState | null')) throw new Error('Single job slot missing');
if (!config.includes('food: Record<string, number>')) throw new Error('Food inventory by id missing');
if (!config.includes('storyChapter')) throw new Error('Story chapter missing');
if (!config.includes('courierDelivery')) throw new Error('Courier delivery state missing');
if (!config.includes('drunkLevel')) throw new Error('Drunk level state missing');
if (!config.includes('courierDeliveries')) throw new Error('Courier deliveries stat missing');

const storyMgr = readFileSync(join(root, 'src', 'systems', 'LifeSimStoryManager.ts'), 'utf8');
if (!storyMgr.includes('LifeSimStoryManager')) throw new Error('Story manager missing');

const storyData = readFileSync(join(root, 'src', 'data', 'life-sim-story.json'), 'utf8');
if (!storyData.includes('task_rent_home')) throw new Error('Story chapters missing');
if (!storyData.includes('task_tutorial_bed_sleep')) throw new Error('Bed and sleep tutorial chapter missing');
if (!storyData.includes('кровати нет')) throw new Error('Story should mention missing bed');

const jobMgr = readFileSync(join(root, 'src', 'systems', 'JobManager.ts'), 'utf8');
if (!jobMgr.includes('canApply')) throw new Error('JobManager single-job guard missing');
if (!jobMgr.includes('hasDeskAtHome')) throw new Error('Remote work desk requirement missing');
if (!jobMgr.includes('isCourierJob')) throw new Error('Courier job type missing');

const courierMgr = readFileSync(join(root, 'src', 'systems', 'CourierManager.ts'), 'utf8');
if (!courierMgr.includes('takeOrder')) throw new Error('Courier take order missing');
if (!courierMgr.includes('deliverPackage')) throw new Error('Courier deliver missing');
if (!courierMgr.includes('estimatePay')) throw new Error('Courier distance pay missing');
if (!courierMgr.includes('getWaypoint')) throw new Error('Courier waypoint navigation missing');

const needsMgr = readFileSync(join(root, 'src', 'systems', 'NeedsManager.ts'), 'utf8');
if (needsMgr.includes('FAINT_PENALTY')) throw new Error('$50 faint penalty should be removed');
if (!needsMgr.includes('canSprint')) throw new Error('Hunger sprint block missing');

const needsFx = readFileSync(join(root, 'src', 'ui', 'NeedsEffectsOverlay.ts'), 'utf8');
if (!needsFx.includes('NeedsEffectsOverlay')) throw new Error('Drowsiness overlay missing');

const groceries = readFileSync(join(root, 'src', 'data', 'groceries.json'), 'utf8');
if (!groceries.includes('"alcohol"')) throw new Error('Alcohol items missing');

const groceryMgr = readFileSync(join(root, 'src', 'systems', 'GroceryManager.ts'), 'utf8');
if (!groceryMgr.includes('drinkNow')) throw new Error('Drink alcohol handler missing');
if (!groceryMgr.includes('eatNow')) throw new Error('Grocery eat-now missing');
if (!groceryMgr.includes('getFoodCapacity')) throw new Error('Fridge capacity missing');
if (!groceryMgr.includes('getFoodStockSummary')) throw new Error('Food stock summary missing');

const housingMgr = readFileSync(join(root, 'src', 'systems', 'HousingManager.ts'), 'utf8');
if (!housingMgr.includes('getUnplacedForSlot')) throw new Error('Furniture slot picker data missing');
if (!housingMgr.includes('getSleepBonus')) throw new Error('Bed sleep bonus missing');

const homeScene = readFileSync(join(root, 'src', 'scenes', 'HomeScene.ts'), 'utf8');
if (!homeScene.includes('showFurniturePicker')) throw new Error('Furniture picker missing');
if (!homeScene.includes('drawFurnitureIcon')) throw new Error('Furniture visuals missing');
if (!homeScene.includes('openJobBoard')) throw new Error('Home job board missing');

const lifeShop = readFileSync(join(root, 'src', 'ui', 'LifeShopUI.ts'), 'utf8');
if (!lifeShop.includes('Съесть')) throw new Error('Grocery eat-in-shop button missing');

const mapGen = readFileSync(join(root, 'src', 'world', 'MapDataGenerator.ts'), 'utf8');
if (!mapGen.includes('placeShopBuildings')) throw new Error('Shop buildings on map missing');

const shops = JSON.parse(readFileSync(join(root, 'src', 'data', 'shops.json'), 'utf8'));
if (!shops.some((s) => s.type === 'grocery')) throw new Error('Grocery shop missing');
if (!shops.some((s) => s.type === 'furniture')) throw new Error('Furniture shop missing');

const mainMenu = readFileSync(join(root, 'src', 'scenes', 'MainMenuScene.ts'), 'utf8');
if (!mainMenu.includes("'РАБОТЯГА'") || !mainMenu.includes("'из мидтауна'")) {
  throw new Error('Game title should be Работяга из мидтауна');
}
if (!mainMenu.includes('buttonStartY') && !mainMenu.includes('panelCenterY')) {
  throw new Error('Main menu dynamic button layout missing');
}
if (!mainMenu.includes('Симулятор жизни — жильё')) throw new Error('Life sim menu hint missing');
if (mainMenu.includes('Следуйте подсказкам сюжета внизу экрана')) {
  throw new Error('Menu hint should be single line to avoid button overlap');
}
if (!mainMenu.includes('!LIFE_SIM && stats.fastestVictorySeconds')) {
  throw new Error('Speed record should be hidden in life sim menu');
}

const gameScene = readFileSync(join(root, 'src', 'scenes', 'GameScene.ts'), 'utf8');
if (!gameScene.includes('collectLifeSimCandidates')) throw new Error('Life sim interactions missing');
if (!gameScene.includes('LIFE_SIM ? undefined : this.dailyQuest')) {
  throw new Error('Daily quest should be disabled in life sim HUD');
}
if (!gameScene.includes('courier_take_order')) throw new Error('Courier take order interaction missing');
if (!gameScene.includes('handleCourierDeliver')) throw new Error('Courier deliver handler missing');
if (!gameScene.includes('WaypointArrow')) throw new Error('Screen waypoint arrow missing');
if (!gameScene.includes('getLifeSimMinimapMarkers')) throw new Error('Courier minimap markers missing');
if (!gameScene.includes('spawnHomeDoorMarkers')) throw new Error('Home door markers missing');
if (!gameScene.includes('shop_grocery')) throw new Error('Grocery shop sprite missing');

const jobs = JSON.parse(readFileSync(join(root, 'src', 'data', 'jobs.json'), 'utf8'));
if (!jobs.some((j) => j.id === 'killer' && j.violent)) throw new Error('Killer job missing');
if (!jobs.some((j) => j.id === 'courier' && j.jobType === 'courier' && !j.remote)) {
  throw new Error('Courier job must be on-site delivery work');
}

const pickups = JSON.parse(readFileSync(join(root, 'src', 'data', 'courier-pickups.json'), 'utf8'));
if (!pickups.some((p) => p.category === 'cafe')) throw new Error('Cafe pickup missing');
if (!pickups.some((p) => p.category === 'shop')) throw new Error('Shop pickup missing');

const weapons = JSON.parse(readFileSync(join(root, 'src', 'data', 'weapons.json'), 'utf8'));
if (!weapons.some((w) => w.id === 'sniper' && w.scoped)) throw new Error('Sniper rifle missing');

const scope = readFileSync(join(root, 'src', 'ui', 'ScopeOverlay.ts'), 'utf8');
if (!scope.includes('ScopeOverlay')) throw new Error('Scope overlay missing');

const jobUi = readFileSync(join(root, 'src', 'ui', 'JobApplicationUI.ts'), 'utf8');
if (!jobUi.includes('JobApplicationUI')) throw new Error('Job application UI missing');

const empOffice = readFileSync(join(root, 'src', 'data', 'employment-office.json'), 'utf8');
if (!empOffice.includes('employment_office')) throw new Error('Employment office missing');

console.log('Phase 15 life sim checks passed');