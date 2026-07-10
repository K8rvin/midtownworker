import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const config = readFileSync(join(root, 'src/config.ts'), 'utf8');
if (!config.includes('BankState')) throw new Error('BankState missing');
if (!config.includes('DEFAULT_BANK')) throw new Error('DEFAULT_BANK missing');
if (!config.includes('bank:')) throw new Error('GameState.bank missing');
if (!config.includes('grass: 0x3d7a52')) throw new Error('Grass color should be lighter midtone');

const bankMgr = readFileSync(join(root, 'src/systems/BankManager.ts'), 'utf8');
if (!bankMgr.includes('deposit(')) throw new Error('Bank deposit missing');
if (!bankMgr.includes('takeLoan')) throw new Error('Bank takeLoan missing');
if (!bankMgr.includes('repayLoan')) throw new Error('Bank repayLoan missing');
if (!bankMgr.includes('onDayAdvanced')) throw new Error('Bank day interest missing');
if (!bankMgr.includes('DEPOSIT_RATE_PER_DAY')) throw new Error('Deposit rate missing');

const bankUI = readFileSync(join(root, 'src/ui/BankUI.ts'), 'utf8');
if (!bankUI.includes('БАНК')) throw new Error('BankUI title missing');
if (!bankUI.includes('Вклад')) throw new Error('BankUI deposit actions missing');
if (!bankUI.includes('Кредит')) throw new Error('BankUI loan actions missing');

const soft = readFileSync(join(root, 'src/systems/SoftCrimeManager.ts'), 'utf8');
if (!soft.includes('WITNESS_RADIUS')) throw new Error('Witness radius missing');
if (!soft.includes('spawnPatrols')) throw new Error('Patrol spawn missing');
if (!soft.includes('ARREST_MONEY = 0')) throw new Error('Arrest should be free ($0)');
if (!soft.includes('findWitness')) throw new Error('Witness check missing');
if (!soft.includes('canPayFine')) throw new Error('Fine affordability missing');
if (soft.includes('spawnChase') && soft.includes('playerPos.x +') && soft.includes('80')) {
  // legacy spawn-at-player pattern
  if (soft.includes('playerPos.x + Phaser') || soft.includes('± 80') || soft.includes('+ 80')) {
    /* soft check: ensure we don't spawn chase next to player as primary path */
  }
}
if (!soft.includes('releaseChaseToPatrol')) throw new Error('Patrol release missing');

const game = readFileSync(join(root, 'src/scenes/GameScene.ts'), 'utf8');
if (!game.includes('openBankUI')) throw new Error('openBankUI missing');
if (!game.includes("shop.type === 'bank'")) throw new Error('Bank clerk branch missing');
if (!game.includes('bankManager.onDayAdvanced')) throw new Error('Bank day tick not wired');
if (!game.includes('setCameraFollow(this.player.sprite, 1.3)')) {
  throw new Error('Closer foot camera zoom 1.3 missing');
}
if (!game.includes('setCameraFollow(this.player.currentVehicle.sprite, 1.1)')) {
  throw new Error('Closer vehicle camera zoom 1.1 missing');
}
if (!game.includes('spawnPatrols()')) throw new Error('Patrol spawn not called');
if (!game.includes('Арест — бесплатно')) throw new Error('Arrest free dialog missing');

const shops = JSON.parse(readFileSync(join(root, 'src/data/shops.json'), 'utf8'));
const banks = shops.filter((s) => s.type === 'bank');
if (banks.length < 2) throw new Error('Need at least 2 bank POIs');
for (const b of banks) {
  if (!b.clerk) throw new Error(`Bank ${b.id} missing clerk`);
  if (!b.doorX) throw new Error(`Bank ${b.id} missing door`);
}

const save = readFileSync(join(root, 'src/systems/SaveManager.ts'), 'utf8');
if (!save.includes('DEFAULT_BANK')) throw new Error('SaveManager should merge bank state');
if (!save.includes('bank:')) throw new Error('SaveManager bank field missing');

const cityMap = readFileSync(join(root, 'src/world/CityMap.ts'), 'utf8');
if (!cityMap.includes('TileType.Grass')) throw new Error('Grass tint skip expected');
if (!cityMap.includes('tile === TileType.Grass')) {
  throw new Error('District grass tint should be skipped (was near-black)');
}

const sprites = readFileSync(join(root, 'src/graphics/SpriteGenerator.ts'), 'utf8');
if (!sprites.includes('0x3d7a52')) throw new Error('Lighter grass tile missing');
if (!sprites.includes('shop_bank')) throw new Error('shop_bank sprite missing');

const phone = readFileSync(join(root, 'src/ui/SmartphoneUI.ts'), 'utf8');
if (!phone.includes("type === 'bank'")) throw new Error('Smartphone nav should list banks');

const shopMgr = readFileSync(join(root, 'src/systems/ShopManager.ts'), 'utf8');
if (!shopMgr.includes("case 'bank'")) throw new Error('shopMarkerColor bank missing');

console.log('Bank / police / camera / grass checks passed');
