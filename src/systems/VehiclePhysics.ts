import Phaser from 'phaser';

export interface VehicleStats {
  maxSpeed: number;
  acceleration: number;
  handling: number;
  friction: number;
}

export interface VehicleState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  vx: number;
  vy: number;
}

export class VehiclePhysics {
  /** Обновляет скорость и направление. Позицию двигает Phaser Physics. */
  static update(
    state: VehicleState,
    stats: VehicleStats,
    throttle: number,
    steer: number,
    dt: number,
    steerSmoothed = steer
  ): VehicleState {
    const newState = { ...state };

    if (throttle !== 0) {
      newState.speed += throttle * stats.acceleration * dt;
    } else {
      newState.speed *= 1 - stats.friction * dt;
    }

    newState.speed = Phaser.Math.Clamp(newState.speed, -stats.maxSpeed * 0.4, stats.maxSpeed);

    const steerDeadzone = 0.07;
    if (Math.abs(steerSmoothed) > steerDeadzone) {
      const speedFactor = Math.max(0.35, Math.min(1, Math.abs(newState.speed) / (stats.maxSpeed * 0.65)));
      const direction = newState.speed >= 0 ? 1 : -1;
      const turnDelta = steerSmoothed * stats.handling * 88 * speedFactor * dt * direction;
      const maxTurn = 95 * dt;
      newState.angle += Phaser.Math.Clamp(turnDelta, -maxTurn, maxTurn);
    }

    const rad = Phaser.Math.DegToRad(newState.angle);
    newState.vx = Math.cos(rad) * newState.speed;
    newState.vy = Math.sin(rad) * newState.speed;

    return newState;
  }
}