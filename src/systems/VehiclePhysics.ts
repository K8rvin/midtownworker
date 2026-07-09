import Phaser from 'phaser';

export interface VehicleStats {
  maxSpeed: number;
  acceleration: number;
  handling: number;
  /** Coast deceleration factor (higher = stops sooner). */
  friction: number;
  /** How quickly velocity aligns to heading (higher = less drift). */
  grip: number;
  /** Braking strength when reverse input while moving forward. */
  brakePower: number;
}

export interface VehicleState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  vx: number;
  vy: number;
}

const REVERSE_ENTER_SPEED = 18;
const STEER_DEADZONE = 0.07;

export class VehiclePhysics {
  /** Обновляет скорость, угол и velocity с lateral grip. Позицию двигает Phaser Physics. */
  static update(
    state: VehicleState,
    stats: VehicleStats,
    throttle: number,
    steer: number,
    dt: number,
    steerSmoothed = steer
  ): VehicleState {
    const newState = { ...state };
    const friction = stats.friction > 0 ? stats.friction : 2.5;
    const grip = stats.grip > 0 ? stats.grip : 8;
    const brakePower = stats.brakePower > 0 ? stats.brakePower : stats.acceleration * 1.4;

    // Throttle: accelerate / brake / reverse
    if (throttle > 0.02) {
      newState.speed += throttle * stats.acceleration * dt;
    } else if (throttle < -0.02) {
      if (newState.speed > REVERSE_ENTER_SPEED) {
        // Brake while moving forward
        newState.speed += throttle * brakePower * dt;
        if (newState.speed < 0) newState.speed = 0;
      } else if (newState.speed > 0 && newState.speed <= REVERSE_ENTER_SPEED) {
        // Fade into reverse
        newState.speed += throttle * brakePower * dt;
      } else {
        // Reverse gear
        newState.speed += throttle * stats.acceleration * 0.75 * dt;
      }
    } else {
      // Coast
      const coast = 1 - friction * dt;
      newState.speed *= Math.max(0, coast);
      if (Math.abs(newState.speed) < 2) newState.speed = 0;
    }

    newState.speed = Phaser.Math.Clamp(
      newState.speed,
      -stats.maxSpeed * 0.45,
      stats.maxSpeed
    );

    // Turn rate: weak near stop, peak mid-speed, slightly reduced at top end
    if (Math.abs(steerSmoothed) > STEER_DEADZONE && Math.abs(newState.speed) > 4) {
      const t = Math.min(1, Math.abs(newState.speed) / stats.maxSpeed);
      // Hump curve: rises fast, softens past 0.65
      const lowBoost = Math.min(1, Math.abs(newState.speed) / (stats.maxSpeed * 0.35));
      const highCut = t > 0.7 ? 1 - (t - 0.7) * 0.55 : 1;
      const speedFactor = Math.max(0.18, lowBoost * highCut);
      const direction = newState.speed >= 0 ? 1 : -1;
      const turnDelta = steerSmoothed * stats.handling * 90 * speedFactor * dt * direction;
      const maxTurn = 100 * dt;
      newState.angle += Phaser.Math.Clamp(turnDelta, -maxTurn, maxTurn);
    }

    // Lateral grip: blend current velocity toward facing * speed
    const rad = Phaser.Math.DegToRad(newState.angle);
    const targetVx = Math.cos(rad) * newState.speed;
    const targetVy = Math.sin(rad) * newState.speed;
    const gripBlend = 1 - Math.exp(-grip * dt);
    newState.vx = Phaser.Math.Linear(state.vx, targetVx, gripBlend);
    newState.vy = Phaser.Math.Linear(state.vy, targetVy, gripBlend);

    // Keep scalar speed roughly in sync with velocity along facing (for HUD/engine)
    const along =
      newState.vx * Math.cos(rad) + newState.vy * Math.sin(rad);
    if (Math.abs(along) > 1) {
      // Soft pull speed toward projected velocity so wall slides feel consistent
      newState.speed = Phaser.Math.Linear(newState.speed, along, 0.35);
    }

    return newState;
  }
}
