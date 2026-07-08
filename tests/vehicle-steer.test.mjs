import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Inline minimal test of steering formula (mirrors VehiclePhysics)
function simulateSteer(handling, dt = 0.016, frames = 30) {
  let angle = 0;
  let speed = 100;
  const maxSpeed = 220;
  for (let i = 0; i < frames; i++) {
    const speedFactor = Math.max(0.35, Math.min(1, Math.abs(speed) / (maxSpeed * 0.6)));
    const turnDelta = 1 * handling * 98 * speedFactor * dt;
    const maxTurn = 95 * dt;
    angle += Math.max(-maxTurn, Math.min(maxTurn, turnDelta));
  }
  return angle;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vehicles = JSON.parse(readFileSync(join(root, 'src/data/vehicles.json'), 'utf8'));
const sedan = vehicles.find((v) => v.id === 'sedan');
const turn = simulateSteer(sedan.handling);

if (turn < 5) {
  throw new Error(`Steering too weak: only ${turn.toFixed(2)}° in 0.5s`);
}

console.log(`Vehicle steer test passed: sedan turned ${turn.toFixed(1)}° in 0.5s`);