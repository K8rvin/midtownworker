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
]) {
  const s = shops.find((x) => x.id === id);
  if (!s) throw new Error(`Missing shop ${id}`);
  if (s.doorY !== 97) throw new Error(`${id} should be on street frontage doorY=97`);
}

const mgr = readFileSync(join(root, 'src/systems/ShopManager.ts'), 'utf8');
if (!mgr.includes('buyPharmacy')) throw new Error('buyPharmacy missing');
if (!mgr.includes('buyCafe')) throw new Error('buyCafe missing');
if (!mgr.includes('pawnSellFurniture')) throw new Error('pawnSellFurniture missing');
if (!mgr.includes('laundryWashCar')) throw new Error('laundryWashCar missing');
if (!mgr.includes('hotelRest')) throw new Error('hotelRest missing');
if (!mgr.includes('postPayBills')) throw new Error('postPayBills missing');
if (!mgr.includes('gymWorkout')) throw new Error('gymWorkout missing');
if (!mgr.includes("case 'gym'")) throw new Error('shopMarkerColor gym missing');

const ui = readFileSync(join(root, 'src/ui/ServiceShopUI.ts'), 'utf8');
if (!ui.includes('АПТЕКА') || !ui.includes('ПРАЧЕЧНАЯ') || !ui.includes('СПОРТЗАЛ')) {
  throw new Error('ServiceShopUI titles incomplete');
}

const game = readFileSync(join(root, 'src/scenes/GameScene.ts'), 'utf8');
if (!game.includes('openServiceShop')) throw new Error('openServiceShop not wired');
if (!game.includes("shop.type === 'hotel'") || !game.includes("shop.type === 'gym'")) {
  throw new Error('hotel/gym clerk branch missing');
}

const sprites = readFileSync(join(root, 'src/graphics/SpriteGenerator.ts'), 'utf8');
for (const k of ['shop_pharmacy', 'shop_laundry', 'shop_hotel', 'shop_post', 'shop_gym']) {
  if (!sprites.includes(k)) throw new Error(`${k} sprite missing`);
}

const phone = readFileSync(join(root, 'src/ui/SmartphoneUI.ts'), 'utf8');
if (!phone.includes("type === 'laundry'") || !phone.includes("type === 'post'")) {
  throw new Error('Smartphone nav should list laundry/post');
}

console.log('Service shops checks passed');

