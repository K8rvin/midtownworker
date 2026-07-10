import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// A — fuel
const veh = read('src/entities/Vehicle.ts');
if (!veh.includes('fuel') || !veh.includes('refuel') || !veh.includes('maxFuel')) {
  throw new Error('Vehicle fuel system missing');
}
const ssvc = read('src/ui/ServiceShopUI.ts');
if (!ssvc.includes('Полный бак') || !ssvc.includes('refuel')) {
  throw new Error('Gas station must sell full tank');
}
const hud = read('src/ui/HUD.ts');
if (!hud.includes('maxFuel') || !hud.includes('0x22d3ee')) {
  throw new Error('HUD fuel bar missing');
}

// B — nav filters + distance
const phone = read('src/ui/SmartphoneUI.ts');
if (!phone.includes('NavFilter') || !phone.includes("id: 'service'") || !phone.includes('navPage')) {
  throw new Error('Smartphone nav filters/pagination missing');
}
if (!hud.includes('navTarget') || !hud.includes('📍')) {
  throw new Error('HUD nav distance missing');
}

// C — weekly bills + events + shift report
const city = read('src/systems/CityLifeManager.ts');
if (!city.includes('BILL_PERIOD_DAYS') || !city.includes('tryRandomEvent') || !city.includes('shiftReport')) {
  throw new Error('CityLifeManager incomplete');
}
const cfg = read('src/config.ts');
if (!cfg.includes('billsOwed') || !cfg.includes('shiftJobsDone') || !cfg.includes('billsDueDay')) {
  throw new Error('GameState bills/shift fields missing');
}
const jobs = read('src/systems/JobManager.ts');
if (!jobs.includes('shiftReportLine') || !jobs.includes('shiftMoneyAtOpen')) {
  throw new Error('JobManager shift report missing');
}
const game = read('src/scenes/GameScene.ts');
if (!game.includes('cityLife') || !game.includes('shiftJobsDone') || !game.includes('Мало топлива')) {
  throw new Error('GameScene city life / fuel warn wiring missing');
}
const shop = read('src/systems/ShopManager.ts');
if (!shop.includes('billsOwed')) {
  throw new Error('postPayBills should clear billsOwed');
}

// D — audio + richer sprites
const audio = read('src/systems/AudioManager.ts');
if (!audio.includes("'gas'") || !audio.includes("'shop_chime'") || !audio.includes("'casino'")) {
  throw new Error('Service SFX missing');
}
const sprites = read('src/graphics/SpriteGenerator.ts');
if (!sprites.includes('0x042f2e') || !sprites.includes('0x7f1d1d')) {
  throw new Error('Enhanced gas/casino shop sprites missing');
}
if (!game.includes("playSfx") || !game.includes("'gas'")) {
  throw new Error('openServiceShop should play service SFX');
}

console.log('City life A→B→C→D checks passed');
