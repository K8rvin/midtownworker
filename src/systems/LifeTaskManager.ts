import type { GameState } from '../config';
import lifeTasksData from '../data/life-tasks.json';

export interface LifeTaskConfig {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: string;
  count?: number;
  furnitureId?: string;
}

export class LifeTaskManager {
  public tasks: LifeTaskConfig[] = lifeTasksData as LifeTaskConfig[];

  constructor(private state: GameState) {}

  getAvailableTasks(): LifeTaskConfig[] {
    return this.tasks.filter((t) => !this.state.completedLifeTasks.includes(t.id));
  }

  getActiveTask(): LifeTaskConfig | null {
    if (!this.state.activeLifeTaskId) return null;
    return this.tasks.find((t) => t.id === this.state.activeLifeTaskId) ?? null;
  }

  startTask(taskId: string): LifeTaskConfig | null {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || this.state.completedLifeTasks.includes(taskId)) return null;
    if (this.state.activeLifeTaskId) return null;
    this.state.activeLifeTaskId = taskId;
    this.state.questProgress[taskId] = 0;
    return task;
  }

  completeTask(): LifeTaskConfig | null {
    const id = this.state.activeLifeTaskId;
    if (!id) return null;
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    this.state.completedLifeTasks.push(id);
    this.state.activeLifeTaskId = null;
    this.state.money += task.reward;
    this.state.lifeStats.tasksCompleted += 1;
    delete this.state.questProgress[id];
    return task;
  }

  checkProgress(event: string, payload?: Record<string, unknown>): boolean {
    const task = this.getActiveTask();
    if (!task || task.type !== event) return false;

    switch (event) {
      case 'get_job':
      case 'rent_home':
      case 'own_home':
      case 'pay_rent':
        return true;
      case 'buy_food':
      case 'remote_shifts':
      case 'courier_delivery':
      case 'contract_kill': {
        const need = task.count ?? 1;
        const cur = (this.state.questProgress[task.id] ?? 0) + 1;
        this.state.questProgress[task.id] = cur;
        return cur >= need;
      }
      case 'place_furniture':
        return payload?.furnitureId === task.furnitureId;
      default:
        return false;
    }
  }

  onLifeEvent(event: string, payload?: Record<string, unknown>): LifeTaskConfig | null {
    if (!this.state.activeLifeTaskId) return null;
    if (this.checkProgress(event, payload)) return this.completeTask();
    return null;
  }

  forceStartTask(taskId: string): LifeTaskConfig | null {
    if (this.state.activeLifeTaskId) return this.getActiveTask();
    return this.startTask(taskId);
  }
}