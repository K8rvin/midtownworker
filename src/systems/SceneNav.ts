import type Phaser from 'phaser';
import { getAudio } from './AudioManager';

/** Scenes that must never remain under the main menu. */
const GAMEPLAY_SCENES = [
  'GameScene',
  'HomeScene',
  'PauseScene',
  'SettingsScene',
  'SaveSlotsScene',
  'GameOverScene',
  'VictoryScene',
  'LobbyScene',
] as const;

function forceStopScene(sm: Phaser.Scenes.ScenePlugin | Phaser.Scenes.SceneManager, key: string): void {
  try {
    // Phaser can leave a scene half-alive if stopped while paused
    const scene = sm.getScene?.(key) as Phaser.Scene | undefined;
    if (scene?.sys?.isPaused?.()) {
      sm.resume(key);
    }
  } catch {
    /* ignore */
  }
  try {
    sm.stop(key);
  } catch {
    /* ignore */
  }
}

/**
 * Hard reset to main menu. Uses the Game instance so cleanup still works
 * even if the calling scene (Pause) is shutting down mid-click.
 */
export function goToMainMenu(from: Phaser.Scene): void {
  const game = from.game;

  try {
    getAudio(from).stopEngine();
    getAudio(from).stopMusic();
  } catch {
    /* audio optional */
  }

  // Defer one tick so we finish the pointer handler cleanly
  const run = () => {
    const sm = game.scene;
    for (const key of GAMEPLAY_SCENES) {
      forceStopScene(sm, key);
    }

    // Fresh menu on top — restart even if MainMenu was somehow still around
    try {
      if (sm.isActive('MainMenuScene')) {
        sm.stop('MainMenuScene');
      }
    } catch {
      /* ignore */
    }
    try {
      sm.start('MainMenuScene');
    } catch (e) {
      console.error('goToMainMenu failed', e);
      try {
        sm.run('MainMenuScene');
      } catch {
        /* ignore */
      }
    }
  };

  // Prefer browser timer: scene.time dies if Pause is stopped same frame
  if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
    window.setTimeout(run, 0);
  } else {
    run();
  }
}

/** Stop lingering gameplay before starting a new run / menu actions. */
export function stopGameplayScenes(from: Phaser.Scene): void {
  const sm = from.game.scene;
  for (const key of ['GameScene', 'HomeScene', 'PauseScene', 'SaveSlotsScene', 'SettingsScene'] as const) {
    forceStopScene(sm, key);
  }
}
