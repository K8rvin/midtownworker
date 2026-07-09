import type Phaser from 'phaser';
import { getAudio } from './AudioManager';

const GAMEPLAY_SCENES = [
  'GameScene',
  'HomeScene',
  'PauseScene',
  'SettingsScene',
  'GameOverScene',
  'VictoryScene',
  'SaveSlotsScene',
] as const;

/**
 * Hard reset to main menu — stops paused/active gameplay scenes so
 * a leftover paused GameScene cannot block or corrupt the menu.
 */
export function goToMainMenu(from: Phaser.Scene): void {
  try {
    getAudio(from).stopEngine();
    getAudio(from).stopMusic();
  } catch {
    /* audio optional during teardown */
  }

  for (const key of GAMEPLAY_SCENES) {
    if (key === from.scene.key) continue;
    try {
      if (from.scene.isActive(key) || from.scene.isPaused(key) || from.scene.isSleeping(key)) {
        from.scene.stop(key);
      }
    } catch {
      /* ignore */
    }
  }

  // Start menu last; also stops the calling scene (Pause / GameOver / etc.)
  from.scene.start('MainMenuScene');
}

/** Stop any lingering GameScene/Home before starting a fresh run. */
export function stopGameplayScenes(from: Phaser.Scene): void {
  for (const key of ['GameScene', 'HomeScene', 'PauseScene', 'SaveSlotsScene'] as const) {
    try {
      if (from.scene.isActive(key) || from.scene.isPaused(key) || from.scene.isSleeping(key)) {
        from.scene.stop(key);
      }
    } catch {
      /* ignore */
    }
  }
}
