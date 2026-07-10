import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const arrow = readFileSync(join(root, 'src/ui/WaypointArrow.ts'), 'utf8');
if (!arrow.includes('fromPlayer') && !arrow.includes('origin')) {
  throw new Error('WaypointArrow should use player origin');
}
if (arrow.includes('setScrollFactor(0)') && !arrow.includes('setScrollFactor(1)')) {
  throw new Error('Waypoint should be world-space (scrollFactor 1)');
}

const player = readFileSync(join(root, 'src/entities/Player.ts'), 'utf8');
if (!player.includes('footSpeed = 100')) throw new Error('Foot speed should be reduced');

const vehicles = JSON.parse(readFileSync(join(root, 'src/data/vehicles.json'), 'utf8'));
for (const id of ['bicycle', 'moped', 'motorcycle', 'van', 'sedan', 'truck']) {
  if (!vehicles.some((v) => v.id === id)) throw new Error(`Missing vehicle ${id}`);
}
const walk = 100;
const bike = vehicles.find((v) => v.id === 'bicycle').maxSpeed;
const sedan = vehicles.find((v) => v.id === 'sedan').maxSpeed;
if (!(walk < bike && bike < sedan)) {
  throw new Error(`Speed ladder broken: walk ${walk} bike ${bike} sedan ${sedan}`);
}

const vehicle = readFileSync(join(root, 'src/entities/Vehicle.ts'), 'utf8');
if (!vehicle.includes('applyCarFollowing')) throw new Error('Traffic car-following missing');
if (!vehicle.includes('separateFrom')) throw new Error('Traffic soft separation missing');

const traffic = readFileSync(join(root, 'src/systems/TrafficManager.ts'), 'utf8');
if (!traffic.includes('minSpacing') && !traffic.includes('minSpacing')) {
  // spawn spacing
  if (!traffic.includes('70')) throw new Error('Traffic spawn spacing missing');
}
if (!traffic.includes('separateFrom')) throw new Error('TrafficManager separation pass missing');

const lanes = readFileSync(join(root, 'src/world/LaneNavigation.ts'), 'utf8');
if (!lanes.includes("east', 1") && !lanes.includes('east", 1')) {
  // accept either quote style
  if (!lanes.includes("'east', 1")) throw new Error('RHT: east should use +1 lane offset');
}
if (!lanes.includes("'west', -1")) throw new Error('RHT: west should use -1 lane offset');

const shops = JSON.parse(readFileSync(join(root, 'src/data/shops.json'), 'utf8'));
const groceries = shops.filter((s) => s.type === 'grocery');
if (groceries.length < 4) throw new Error(`Need ≥4 grocery shops, got ${groceries.length}`);
if (!shops.some((s) => s.type === 'vehicle')) throw new Error('Vehicle dealer missing');

const groceriesData = JSON.parse(readFileSync(join(root, 'src/data/groceries.json'), 'utf8'));
if (groceriesData.length < 12) throw new Error('Expanded grocery catalog missing');

const courier = readFileSync(join(root, 'src/systems/CourierManager.ts'), 'utf8');
if (!courier.includes('timeLimitMinutes')) throw new Error('Courier timer missing');
if (!courier.includes('courierCombo')) throw new Error('Courier combo missing');
if (!courier.includes('getTimerLabel')) throw new Error('Courier timer label missing');

const soft = readFileSync(join(root, 'src/systems/SoftCrimeManager.ts'), 'utf8');
if (!soft.includes('onCarjack')) throw new Error('SoftCrime carjack missing');
if (!soft.includes('claimByPlayer')) throw new Error('Carjack should clear traffic AI via claimByPlayer');
if (!soft.includes('playerStolen')) {
  throw new Error('onCarjack must no-op on re-enter when vehicle.playerStolen');
}

const vehicleSrc = readFileSync(join(root, 'src/entities/Vehicle.ts'), 'utf8');
if (!vehicleSrc.includes('claimByPlayer')) throw new Error('Vehicle.claimByPlayer missing');
if (!vehicleSrc.includes('playerStolen')) {
  throw new Error('Vehicle.playerStolen missing — stolen cars must stay claimed');
}

const playerSrc = readFileSync(join(root, 'src/entities/Player.ts'), 'utf8');
if (!playerSrc.includes('claimByPlayer')) {
  throw new Error('Player enter/exit must claimByPlayer so stolen cars do not drive away');
}
if (!soft.includes('resolveFine')) throw new Error('SoftCrime fine missing');

const game = readFileSync(join(root, 'src/scenes/GameScene.ts'), 'utf8');
if (!game.includes('softCrime')) throw new Error('SoftCrime not wired in GameScene');
if (!game.includes('handleCarjackCaught')) throw new Error('Carjack catch dialog missing');
if (!game.includes('isFirstJack') || !game.includes('playerStolen')) {
  throw new Error('GameScene must carjack only once (isFirstJack before claim)');
}

const traffic = readFileSync(join(root, 'src/systems/TrafficManager.ts'), 'utf8');
if (!traffic.includes('playerStolen')) {
  throw new Error('Traffic despawn must skip playerStolen cars');
}

const config = readFileSync(join(root, 'src/config.ts'), 'utf8');
if (!config.includes('CourierOrderCategory')) throw new Error('Courier categories missing');
if (!config.includes('courierCombo')) throw new Error('lifeStats.courierCombo missing');

// Mission arrow from player + midtown home off road
if (!game.includes('getMarker') || !game.includes('updateCourierWaypoint')) {
  throw new Error('Story mission should feed WaypointArrow via updateCourierWaypoint');
}
if (!arrow.includes('origin')) {
  throw new Error('WaypointArrow should attach tightly to player origin');
}
if (!arrow.includes('legendRoot') && !arrow.includes('legendText') && !arrow.includes('setScrollFactor(0)')) {
  throw new Error('Waypoint legend should be screen-space on the left');
}
if (!arrow.includes('ring = 16') && !arrow.includes('size = 9')) {
  throw new Error('Waypoint arrow should be compact');
}

const homes = JSON.parse(readFileSync(join(root, 'src/data/homes.json'), 'utf8'));
const midtown = homes.find((h) => h.id === 'apt_midtown_1');
if (!midtown) throw new Error('apt_midtown_1 missing');
// Door must not sit on road tiles (sidewalk frontage is OK: e.g. doorY=97 north of major 100)
const onRoadXY = (x, y) => {
  const maj = [50, 100, 150];
  const min = [25, 75, 125, 175];
  // tile is road only if on H-band (y near center) OR V-band (x near center)
  if (maj.some((c) => Math.abs(y - c) <= 2) || maj.some((c) => Math.abs(x - c) <= 2)) return true;
  if (min.some((c) => Math.abs(y - c) <= 1) || min.some((c) => Math.abs(x - c) <= 1)) return true;
  return false;
};
if (onRoadXY(midtown.doorX, midtown.doorY)) {
  throw new Error(`Midtown apt door on road tile: ${midtown.doorX},${midtown.doorY}`);
}

const layout = JSON.parse(readFileSync(join(root, 'src/data/city-layout.json'), 'utf8'));
const bb = (layout.landmarks || []).find((l) => l.kind === 'billboard' && l.district === 'midtown_east');
if (bb && onRoadXY(bb.x, bb.y)) {
  throw new Error(`Midtown billboard on road tile: ${bb.x},${bb.y}`);
}
if (bb && bb.x === 132 && bb.y === 126) {
  throw new Error('Billboard still at old on-road coords 132,126');
}

console.log('City logistics checks passed');
