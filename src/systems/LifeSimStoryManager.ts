import type { GameState } from '../config';
import storyData from '../data/life-sim-story.json';
import homesData from '../data/homes.json';
import type { LifeTaskManager } from './LifeTaskManager';

export interface StoryMarker {
  x: number;
  y: number;
  label: string;
}

export type BedSleepStep = 'buy' | 'place' | 'sleep';

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

  getBedSleepStep(): BedSleepStep | null {
    const task = this.lifeTasks.getActiveTask();
    if (task?.type !== 'bed_and_sleep') return null;
    if ((this.state.questProgress[task.id] ?? 0) >= 1) return 'sleep';
    if (this.state.homeFurniture.includes(task.furnitureId ?? 'bed_basic')) return 'place';
    return 'buy';
  }

  private getHomeDoorMarker(): StoryMarker | null {
    const homeId = this.state.housing.homeId;
    if (!homeId) return null;
    const home = (homesData as { id: string; doorX: number; doorY: number; name: string }[]).find(
      (h) => h.id === homeId
    );
    if (!home) return null;
    return { x: home.doorX, y: home.doorY, label: home.name };
  }

  getMarker(): StoryMarker | null {
    if (!this.isTutorialActive()) return null;
    const ch = this.getChapter();
    if (!ch) return null;

    const bedStep = this.getBedSleepStep();
    if (bedStep === 'buy') return ch.marker;

    const homeMarker = this.getHomeDoorMarker();
    if (!homeMarker) return ch.marker;

    if (bedStep === 'place') {
      return { ...homeMarker, label: 'Домой — поставьте кровать' };
    }
    if (bedStep === 'sleep') {
      return { ...homeMarker, label: 'Домой — поспите' };
    }

    return ch.marker;
  }

  getObjectiveText(): string {
    const ch = this.getChapter();
    if (!ch) return 'J — задания · P — смартфон';

    const marker = this.getMarker();
    // Compact: short location for zoomed camera HUD
    const loc = marker ? `▶ ${marker.label}` : '';

    const bedStep = this.getBedSleepStep();
    if (bedStep === 'buy') {
      return `${ch.title}: купить кровать\n${loc}`;
    }
    if (bedStep === 'place') {
      return `${ch.title}: домой — поставить кровать [E]\n${loc}`;
    }
    if (bedStep === 'sleep') {
      return `${ch.title}: домой — «Спать»\n${loc}`;
    }

    const task = this.lifeTasks.getActiveTask();
    if (task?.id === ch.taskId) {
      const desc =
        task.description.length > 52 ? `${task.description.slice(0, 50)}…` : task.description;
      return `${ch.title}: ${desc}\n${loc}`;
    }
    return `${ch.title}\n${loc}`;
  }

  /** Message after placing bed (step 1 of bed_and_sleep, task not yet complete). */
  getBedPlacedStepMessage(): string | null {
    const task = this.lifeTasks.getActiveTask();
    if (task?.type !== 'bed_and_sleep') return null;
    if ((this.state.questProgress[task.id] ?? 0) < 1) return null;
    return 'Кровать на месте! В меню дома нажмите «Спать», чтобы отдохнуть.';
  }

  /** Message after buying bed during tutorial chapter 2. */
  getBedPurchasedStepMessage(): string | null {
    if (this.getBedSleepStep() !== 'place') return null;
    return 'Кровать куплена! Идите к двери дома и поставьте её на слот кровати.';
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

  buildTutorialDialogLines(
    result: { task: import('./LifeTaskManager').LifeTaskConfig; story: { message: string; nextMessage: string | null } }
  ): string[] {
    const lines: string[] = [`✓ ${result.task.title} (+$${result.task.reward})`];
    for (const part of result.story.message.split('\n')) {
      if (part.trim()) lines.push(part.trim());
    }
    if (result.story.nextMessage) {
      for (const part of result.story.nextMessage.split('\n')) {
        if (part.trim()) lines.push(part.trim());
      }
    }
    return lines;
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