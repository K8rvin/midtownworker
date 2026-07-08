export interface AudioSettingsData {
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

const SETTINGS_KEY = 'gta2_settings';

export const DEFAULT_AUDIO_SETTINGS: AudioSettingsData = {
  sfxVolume: 0.8,
  musicVolume: 0.5,
  muted: false,
};

export class AudioSettings {
  static load(): AudioSettingsData {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    try {
      return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
  }

  static save(settings: AudioSettingsData): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}