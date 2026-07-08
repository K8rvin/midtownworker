export type AssetMode = 'auto' | 'procedural' | 'png';

export interface AssetSettingsData {
  mode: AssetMode;
}

const SETTINGS_KEY = 'gta2_assets';

const DEFAULT: AssetSettingsData = { mode: 'auto' };

export class AssetSettings {
  static load(): AssetSettingsData {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT };
    try {
      const parsed = JSON.parse(raw) as Partial<AssetSettingsData>;
      if (parsed.mode === 'auto' || parsed.mode === 'procedural' || parsed.mode === 'png') {
        return { mode: parsed.mode };
      }
      return { ...DEFAULT };
    } catch {
      return { ...DEFAULT };
    }
  }

  static save(data: AssetSettingsData): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  }

  static cycleMode(current: AssetMode): AssetMode {
    const order: AssetMode[] = ['auto', 'png', 'procedural'];
    return order[(order.indexOf(current) + 1) % order.length];
  }

  static modeLabel(mode: AssetMode): string {
    if (mode === 'auto') return 'АВТО';
    if (mode === 'png') return 'PNG';
    return 'ПРОЦЕДУР';
  }
}