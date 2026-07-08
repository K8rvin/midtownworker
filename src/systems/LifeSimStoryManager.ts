import type { GameState } from '../config';
import storyData from '../data/life-sim-story.json';
import type { LifeTaskManager } from './LifeTaskManager';

export interface StoryMarker {
  x: number;
  y: number;
  label: string;
}

interface StoryChapter {
  id: number;
  title: string;
  taskId: string;
  marker: StoryMarker;
  onStart: string;
  onComplete: string;
}

const chapters = (storyData as { chapters: StoryChapter[]; tutorialCompleteChapter: number }).chapters;
const tutorialCompleteChapter = (storyData as { tutorialCompleteChapter: number }).tutorialCompleteChapter;

export class LifeSimStoryManager {
  constructor(
    private state: GameState,
    private lifeTasks: LifeTaskManager
  ) {}

  isTutorialActive(): boolean {
    return this.state.storyChapter > 0 && this.state.storyChapter <= tutorialCompleteChapter;
  }

  getChapter(): StoryChapter | null {
    return chapters.find((c) => c.id === this.state.storyChapter) ?? null;
  }

  getMarker(): StoryMarker | null {
    if (!this.isTutorialActive()) return null;
    return this.getChapter()?.marker ?? null;
  }

  getObjectiveText(): string {
    const ch = this.getChapter();
    if (!ch) return 'J — доска заданий · свободная игра';
    const loc = `▶ ${ch.marker.label} (${ch.marker.x}, ${ch.marker.y})`;
    const task = this.lifeTasks.getActiveTask();
    if (task?.id === ch.taskId) return `${ch.title}: ${task.description}\n${loc}`;
    return `${ch.title}\n${loc}`;
  }

  /** Called after intro overlay — chapter 1, first task. */
  beginAfterIntro(): string {
    return this.startChapter(1) ?? '';
  }

  startChapter(chapterId: number): string | null {
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch) return null;
    this.state.storyChapter = chapterId;
    if (!this.state.completedLifeTasks.includes(ch.taskId)) {
      this.lifeTasks.forceStartTask(ch.taskId);
    }
    return ch.onStart;
  }

  handleLifeEvent(
    event: string,
    payload?: Record<string, unknown>
  ): { task: import('./LifeTaskManager').LifeTaskConfig; story: { message: string; nextMessage: string | null } } | null {
    const completed = this.lifeTasks.onLifeEvent(event, payload);
    if (!completed) return null;
    const story = this.onTaskCompleted(completed.id);
    if (!story) return { task: completed, story: { message: `Готово: ${completed.title}`, nextMessage: null } };
    return { task: completed, story };
  }

  /** After a life task completes — advance tutorial if it matches current chapter. */
  onTaskCompleted(taskId: string): { message: string; nextMessage: string | null } | null {
    const ch = this.getChapter();
    if (!ch || ch.taskId !== taskId) return null;

    let completeMsg = ch.onComplete;

    if (taskId === 'task_rent_home') {
      this.state.money += 115;
      completeMsg = `${ch.onComplete}\n(+ $115 — часть залога вернули на обстановку)`;
    }

    const nextId = ch.id + 1;
    const next = chapters.find((c) => c.id === nextId);
    let nextMessage: string | null = null;

    if (next && nextId <= tutorialCompleteChapter) {
      nextMessage = this.startChapter(nextId);
    } else {
      this.state.storyChapter = tutorialCompleteChapter + 1;
    }

    return { message: completeMsg, nextMessage };
  }

  /** Restore tutorial task if save has chapter but no active task. */
  syncTutorialTask(): string | null {
    if (!this.isTutorialActive()) return null;
    if (this.state.activeLifeTaskId) return null;
    const ch = this.getChapter();
    if (!ch || this.state.completedLifeTasks.includes(ch.taskId)) return null;
    const started = this.lifeTasks.startTask(ch.taskId);
    return started ? ch.onStart : null;
  }
}