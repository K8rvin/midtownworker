import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/shops.json'), 'utf8'));
for (const id of [
  'pharmacy_1',
  'cafe_1',
  'pawn_1',
  'laundry_1',
  'hotel_1',
  'post_1',
  'gym_1',
  'gas_1',
  'garage_1',
  'insurance_1',
  'casino_1',
]) {
  const s = shops.find((x) => x.id === id);
  if (!s) throw new Error(`Missing shop ${id}`);
  if (s.doorY !== 97) throw new Error(`${id} should be on street frontage doorY=97`);
}

const mgr = readFileSync(join(root, 'src/systems/ShopManager.ts'), 'utf8');
if (!mgr.includes('buyPharmacy')) throw new Error('buyPharmacy missing');
if (!mgr.includes('laundryWashCar')) throw new Error('laundryWashCar missing');
if (!mgr.includes('hotelRest')) throw new Error('hotelRest missing');
if (!mgr.includes('buyInsurance')) throw new Error('buyInsurance missing');
if (!mgr.includes('casinoBet')) throw new Error('casinoBet missing');
if (!mgr.includes('gasSnack')) throw new Error('gasSnack missing');
if (!mgr.includes("case 'casino'")) throw new Error('shopMarkerColor casino missing');

const ui = readFileSync(join(root, 'src/ui/ServiceShopUI.ts'), 'utf8');
if (!ui.includes('АЗС') || !ui.includes('КАЗИНО') || !ui.includes('СТРАХОВКА')) {
  throw new Error('ServiceShopUI titles incomplete for new services');
}
if (!ui.includes('Полный бак')) throw new Error('Gas full-tank option missing');

const game = readFileSync(join(root, 'src/scenes/GameScene.ts'), 'utf8');
if (!game.includes('openServiceShop')) throw new Error('openServiceShop not wired');
if (!game.includes("shop.type === 'gas'") || !game.includes("shop.type === 'casino'")) {
  throw new Error('gas/casino clerk branch missing');
}
// Drive-thru / in-vehicle services (taxi + АЗС must not be blocked by early vehicle_exit return)
if (!game.includes("service_drive") || !game.includes('getServiceVehicle')) {
  throw new Error('Drive-thru gas/garage (service_drive / getServiceVehicle) missing');
}
if (game.includes("makeCandidate('vehicle_exit', 0,")) {
  throw new Error('vehicle_exit distance 0 steals all in-car interacts (taxi/АЗС)');
}
if (!game.includes('collectLifeSimCandidates(px, py, player)')) {
  throw new Error('In-vehicle path must collect life-sim candidates (taxi pickup)');
}

const ir = readFileSync(join(root, 'src/systems/InteractResolver.ts'), 'utf8');
if (!ir.includes('service_drive')) throw new Error('InteractKind service_drive missing');
if (!mgr.includes('CASINO_DAY_LIMIT') || !mgr.includes('casinoDayBet')) {
  throw new Error('Casino daily limit missing');
}

const hud = readFileSync(join(root, 'src/ui/HUD.ts'), 'utf8');
if (!hud.includes('insuranceUntilDay')) throw new Error('HUD should show insurance status');

const soft = readFileSync(join(root, 'src/systems/SoftCrimeManager.ts'), 'utf8');
if (!soft.includes('insuranceUntilDay')) throw new Error('Fine should respect insurance');

const config = readFileSync(join(root, 'src/config.ts'), 'utf8');
if (!config.includes('insuranceUntilDay')) throw new Error('GameState.insuranceUntilDay missing');

const sprites = readFileSync(join(root, 'src/graphics/SpriteGenerator.ts'), 'utf8');
for (const k of [
  'shop_pharmacy',
  'shop_laundry',
  'shop_hotel',
  'shop_post',
  'shop_gym',
  'shop_gas',
  'shop_garage',
  'shop_insurance',
  'shop_casino',
]) {
  if (!sprites.includes(k)) throw new Error(`${k} sprite missing`);
}

const phone = readFileSync(join(root, 'src/ui/SmartphoneUI.ts'), 'utf8');
if (!phone.includes("type === 'gas'") || !phone.includes("type === 'casino'")) {
  throw new Error('Smartphone nav should list gas/casino');
}

console.log('Service shops checks passed');


