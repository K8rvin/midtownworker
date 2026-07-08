import { TILE_SIZE, type GameState } from '../config';

/** Dire starting situation for a new life-sim run. */
export function applyLifeSimNewGameStart(state: GameState): void {
  state.money = 85;
  state.hunger = 28;
  state.sleep = 35;
  state.drunkLevel = 0;
  state.health = 68;
  state.day = 1;
  state.hour = 20;
  state.housing = { type: 'none', homeId: null, rentDueDay: 0, lastRentPaidDay: 0 };
  state.job = null;
  state.homeFurniture = [];
  state.furniturePlaced = {};
  state.inventory = { food: {} };
  state.activeLifeTaskId = null;
  state.completedLifeTasks = [];
  state.storyChapter = 0;
  state.courierDelivery = null;
  state.currentMapId = 'city';
  state.playerX = 80 * TILE_SIZE + TILE_SIZE / 2;
  state.playerY = 82 * TILE_SIZE + TILE_SIZE / 2;
  state.onRoof = false;
  state.lives = 3;
}