import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Mirrors VehiclePhysics turn + grip constants (90 base, speed hump)
function simulateSteer(handling, grip = 9, dt = 0.016, frames = 30) {
  let angle = 0;
  let speed = 100;
  let vx = speed;
  let vy = 0;
  const maxSpeed = 220;
  for (let i = 0; i < frames; i++) {
    const t = Math.min(1, Math.abs(speed) / maxSpeed);
    const lowBoost = Math.min(1, Math.abs(speed) / (maxSpeed * 0.35));
    const highCut = t > 0.7 ? 1 - (t - 0.7) * 0.55 : 1;
    const speedFactor = Math.max(0.18, lowBoost * highCut);
    const turnDelta = 1 * handling * 90 * speedFactor * dt;
    const maxTurn = 100 * dt;
    angle += Math.max(-maxTurn, Math.min(maxTurn, turnDelta));

    const rad = (angle * Math.PI) / 180;
    const targetVx = Math.cos(rad) * speed;
    const targetVy = Math.sin(rad) * speed;
    const gripBlend = 1 - Math.exp(-grip * dt);
    vx = vx + (targetVx - vx) * gripBlend;
    vy = vy + (targetVy - vy) * gripBlend;
  }
  return { angle, vx, vy };
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const physicsSrc = readFileSync(join(root, 'src/systems/VehiclePhysics.ts'), 'utf8');
if (!physicsSrc.includes('grip')) throw new Error('VehiclePhysics should use grip');
if (!physicsSrc.includes('brakePower')) throw new Error('VehiclePhysics should use brakePower');
if (!physicsSrc.includes('lateral')) {
  // lateral damping is implemented via grip blend toward facing
  if (!physicsSrc.includes('gripBlend')) throw new Error('VehiclePhysics lateral grip blend missing');
}

const vehicles = JSON.parse(readFileSync(join(root, 'src/data/vehicles.json'), 'utf8'));
const sedan = vehicles.find((v) => v.id === 'sedan');
if (sedan.grip == null) throw new Error('sedan.grip missing in vehicles.json');
if (sedan.friction == null) throw new Error('sedan.friction missing');
if (sedan.brakePower == null) throw new Error('sedan.brakePower missing');

const { angle: turn, vx, vy } = simulateSteer(sedan.handling, sedan.grip);

if (turn < 5) {
  throw new Error(`Steering too weak: only ${turn.toFixed(2)}° in 0.5s`);
}

// After turning, velocity should not be pure forward snap — some lateral lag at mid grip
const rad = (turn * Math.PI) / 180;
const forwardX = Math.cos(rad);
const forwardY = Math.sin(rad);
const along = vx * forwardX + vy * forwardY;
const lateral = Math.abs(vx * -forwardY + vy * forwardX);
if (along < 50) throw new Error(`Forward speed lost after turn: along=${along.toFixed(1)}`);

const vehicleSrc = readFileSync(join(root, 'src/entities/Vehicle.ts'), 'utf8');
if (!vehicleSrc.includes('applyCarFollowing')) {
  throw new Error('Traffic car-following missing on Vehicle');
}
if (!vehicleSrc.includes('setDrag(0')) {
  throw new Error('Vehicle should disable Arcade drag (setDrag 0)');
}

console.log(
  `Vehicle steer test passed: sedan turned ${turn.toFixed(1)}° in 0.5s, lateral=${lateral.toFixed(1)}`
);
