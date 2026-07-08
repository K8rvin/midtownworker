const SETTINGS_KEY = 'gta2_network';

export interface NetworkSettingsData {
  serverUrl: string;
  lastRoom: string;
}

const DEFAULT: NetworkSettingsData = {
  serverUrl: 'ws://localhost:8787',
  lastRoom: '',
};

export class NetworkSettings {
  static load(): NetworkSettingsData {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT };
    try {
      return { ...DEFAULT, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT };
    }
  }

  static save(data: NetworkSettingsData): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  }
}