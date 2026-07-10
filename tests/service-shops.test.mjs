import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/shops.json'), 'utf8'));
for (const id of ['pharmacy_1', 'cafe_1', 'pawn_1']) {
  const s = shops.find((x) => x.id === id);
  if (!s) throw new Error(`Missing shop ${id}`);
  if (s.doorY !== 97) throw new Error(`${id} should be on street frontage doorY=97`);
}

const mgr = readFileSync(join(root, 'src/systems/ShopManager.ts'), 'utf8');
if (!mgr.includes('buyPharmacy')) throw new Error('buyPharmacy missing');
if (!mgr.includes('buyCafe')) throw new Error('buyCafe missing');
if (!mgr.includes('pawnSellFurniture')) throw new Error('pawnSellFurniture missing');
if (!mgr.includes('pawnSellVehicle')) throw new Error('pawnSellVehicle missing');
if (!mgr.includes("case 'pharmacy'")) throw new Error('shopMarkerColor pharmacy missing');

const ui = readFileSync(join(root, 'src/ui/ServiceShopUI.ts'), 'utf8');
if (!ui.includes('АПТЕКА') || !ui.includes('КАФЕ') || !ui.includes('ЛОМБАРД')) {
  throw new Error('ServiceShopUI titles incomplete');
}

const game = readFileSync(join(root, 'src/scenes/GameScene.ts'), 'utf8');
if (!game.includes('openServiceShop')) throw new Error('openServiceShop not wired');
if (!game.includes("shop.type === 'pharmacy'")) throw new Error('pharmacy clerk branch missing');

const sprites = readFileSync(join(root, 'src/graphics/SpriteGenerator.ts'), 'utf8');
if (!sprites.includes('shop_pharmacy') || !sprites.includes('shop_cafe') || !sprites.includes('shop_pawn')) {
  throw new Error('Service shop sprites missing');
}

const phone = readFileSync(join(root, 'src/ui/SmartphoneUI.ts'), 'utf8');
if (!phone.includes("type === 'pharmacy'") || !phone.includes("type === 'pawn'")) {
  throw new Error('Smartphone nav should list new services');
}

console.log('Service shops checks passed');
